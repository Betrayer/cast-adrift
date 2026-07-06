import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { STARTER_DECK } from "../src/data/decks";
import { DIE_BY_ID } from "../src/data/dice";
import {
  ENEMY_BY_ID,
  expandEncounterIds,
  isEncounterGroup,
} from "../src/data/enemies/sector1";
import {
  DECK_CAP,
  mkUpgradeCost,
  ptsForDie,
  sellValue,
} from "../src/game/economy/prices";
import { computeNodeReward, isDraftNode } from "../src/game/economy/rewards";
import { generateShopStock } from "../src/game/economy/shop";
import {
  BOSS_NODE_ID,
  generateSectorMap,
  START_NODE_ID,
} from "../src/game/map/generator";
import {
  nodeById,
  outgoingEdges,
  type MapGraph,
  type MapNode,
  type NodeType,
} from "../src/game/map/types";
import {
  decidePlacements,
  decideReroll,
} from "../src/game/battle/policy";
import {
  advanceTurn,
  resolveEnemyPhase,
  resolvePlayerPhase,
} from "../src/game/battle/resolver";
import {
  buildBattleSnapshot,
  canPlaceDie,
  createEnemyStream,
  MAX_ENEMIES,
} from "../src/game/battle/setup";
import { buildEncounterIds } from "../src/game/run/encounter";
import { rollPerkChoices } from "../src/game/run/perkDraft";
import { computePerkMods, perkChargeCap } from "../src/game/run/perkMods";
import type { MkLevels } from "../src/stores/runStore";
import {
  createStream,
  createStreams,
  deriveSeed,
} from "../src/services/rng";
import type { BattleSnapshot, SlotId } from "../src/types/battle";

const TURN_CAP = 30;

interface BattleInit {
  hull?: number;
  hullMax?: number;
  tide?: number;
  mkLevels?: MkLevels;
  perks?: readonly string[];
}

interface BattleResult {
  win: boolean;
  timeout: boolean;
  turns: number;
  hullLeft: number;
  kills: number;
  dealt: number;
  taken: number;
}

const getArg = (name: string, fallback: string): string => {
  const index = process.argv.indexOf(`--${name}`);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  return value ?? fallback;
};

const applyPlacement = (
  snapshot: BattleSnapshot,
  uid: string,
  slotId: SlotId,
): void => {
  const die = snapshot.dice.find((d) => d.uid === uid);
  const slot = snapshot.slots[slotId];
  if (die === undefined || slot === undefined) return;
  die.state = "placed";
  die.slot = slotId;
  slot.dieUid = uid;
};

const simulateBattle = (
  enemyIds: readonly string[],
  deck: readonly string[],
  rootSeed: number,
  init: BattleInit = {},
): BattleResult => {
  const streams = createStreams(rootSeed);
  const enemyStream = createEnemyStream(streams);
  let snapshot = buildBattleSnapshot(
    "wanderer",
    deck,
    enemyIds,
    streams,
    enemyStream,
    init.mkLevels ?? {},
    {
      tide: init.tide,
      perks: init.perks,
      hull: init.hull,
      hullMax: init.hullMax,
      chargeCap: perkChargeCap(init.perks ?? []),
    },
  );
  let dealt = 0;
  let taken = 0;

  for (let round = 0; round < TURN_CAP; round += 1) {
    const rerollUids = decideReroll(snapshot);
    if (rerollUids.length > 0) {
      snapshot.dice = snapshot.dice.map((d) =>
        rerollUids.includes(d.uid) && d.state === "tray"
          ? { ...d, value: streams.dice.int(1, d.tier) }
          : d,
      );
    }
    const decision = decidePlacements(snapshot);
    if (decision.targetId !== null) snapshot.targetId = decision.targetId;
    for (const placement of decision.placements) {
      if (canPlaceDie(snapshot, placement.uid, placement.slot)) {
        applyPlacement(snapshot, placement.uid, placement.slot);
      }
    }
    if (decision.reserveUid !== undefined) {
      const die = snapshot.dice.find((d) => d.uid === decision.reserveUid);
      if (die?.state === "tray") die.state = "reserved";
    }

    const player = resolvePlayerPhase(snapshot);
    dealt += player.beats
      .filter((b) => b.kind === "damage")
      .reduce((sum, b) => sum + b.amount, 0);
    snapshot = player.next;
    if (snapshot.outcome !== undefined) break;

    const enemy = resolveEnemyPhase(snapshot, enemyStream);
    taken += enemy.beats.reduce(
      (sum, b) => sum + b.hullDamage + b.shieldDamage,
      0,
    );
    snapshot = enemy.next;
    if (snapshot.outcome !== undefined) break;

    snapshot = advanceTurn(snapshot, streams);
  }

  const timeout = snapshot.outcome === undefined;
  return {
    win: snapshot.outcome === "victory",
    timeout,
    turns: Math.min(snapshot.turn, TURN_CAP),
    hullLeft: snapshot.hull,
    kills: snapshot.enemies.filter((e) => e.hp <= 0).length,
    dealt,
    taken,
  };
};

const decile = (sorted: readonly number[], q: number): number => {
  if (sorted.length === 0) return 0;
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(q * sorted.length) - 1),
  );
  return sorted[index] ?? 0;
};

const DECILES = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];

// ── Run mode ────────────────────────────────────────────────────────────────

const PATH_PRIORITY: readonly NodeType[] = [
  "shipyard",
  "shop",
  "event",
  "anomaly",
  "beacon",
  "battle",
  "elite",
  "miniboss",
  "boss",
  "start",
];

const priorityOf = (type: NodeType): number => {
  const index = PATH_PRIORITY.indexOf(type);
  return index < 0 ? PATH_PRIORITY.length : index;
};

interface RunState {
  hull: number;
  hullMax: number;
  scrap: number;
  scrapEarned: number;
  scrapSpent: number;
  deck: string[];
  mkLevels: MkLevels;
  perks: string[];
  tide: number;
  jumpsSinceTide: number;
  kills: number;
  nodes: number;
}

const spend = (state: RunState, cost: number): boolean => {
  if (cost < 0 || state.scrap < cost) return false;
  state.scrap -= cost;
  state.scrapSpent += cost;
  return true;
};

const gain = (state: RunState, amount: number): void => {
  if (amount <= 0) return;
  state.scrap += amount;
  state.scrapEarned += amount;
};

const REAL_SCHOOLS = [
  "red",
  "blue",
  "green",
  "yellow",
  "black",
  "grey",
] as const;

// Resonance-aware target school, anchored to the starter deck's dominant real school
// (2×red → the red set) and self-reinforcing as the bot buys into it.
const deckTargetSchool = (deck: readonly string[]): string => {
  const census = new Map<string, number>();
  let prismatic = 0;
  for (const defId of deck) {
    const school = DIE_BY_ID.get(defId)?.school;
    if (school === undefined) continue;
    if (school === "prismatic") prismatic += 1;
    else census.set(school, (census.get(school) ?? 0) + 1);
  }
  let best = "red";
  let bestN = -1;
  for (const s of REAL_SCHOOLS) {
    const n = (census.get(s) ?? 0) + (s === best ? prismatic : 0);
    if (n > bestN) {
      best = s;
      bestN = n;
    }
  }
  return best;
};

const greedyShop = (state: RunState, seed: number, node: MapNode): void => {
  const discount = computePerkMods(state.perks).shopDiscountPct;
  const items = generateShopStock(seed, node.id, 0, discount);
  const target = deckTargetSchool(state.deck);
  const rank = (defId: string): number => {
    const school = DIE_BY_ID.get(defId)?.school;
    if (school === target || school === "prismatic") return 0;
    if (school === "red" || school === "blue") return 1;
    return 2;
  };
  const sorted = [...items].sort((a, b) => {
    const r = rank(a.defId) - rank(b.defId);
    return r !== 0 ? r : ptsForDie(b.defId) - ptsForDie(a.defId);
  });
  for (const item of sorted) {
    if (state.deck.length >= DECK_CAP) break;
    if (state.scrap >= item.price && spend(state, item.price)) {
      state.deck.push(item.defId);
    }
  }
};

const UPGRADE_SLOTS: readonly SlotId[] = [
  "weaponA",
  "weaponB",
  "shields",
  "reactor",
];

const repairToFull = (state: RunState): void => {
  const missing = state.hullMax - state.hull;
  const repairable = Math.min(missing, Math.floor(state.scrap / 2));
  if (repairable > 0 && spend(state, repairable * 2)) {
    state.hull = Math.min(state.hullMax, state.hull + repairable);
  }
};

const buyUpgrades = (state: RunState): void => {
  for (const slotId of UPGRADE_SLOTS) {
    let mk = state.mkLevels[slotId] ?? 1;
    while (mk < 3) {
      const target = (mk + 1) as 2 | 3;
      const cost = mkUpgradeCost(target);
      if (state.scrap < cost || !spend(state, cost)) break;
      mk = target;
      state.mkLevels = { ...state.mkLevels, [slotId]: mk };
    }
  }
};

// Hull-aware: if the forecast damage to the next rest exceeds ~60% of current hull,
// repair before sinking surplus into Mk (weapons first); otherwise front-load damage.
const greedyShipyard = (state: RunState, repairFirst: boolean): void => {
  if (repairFirst) {
    repairToFull(state);
    buyUpgrades(state);
  } else {
    buyUpgrades(state);
    repairToFull(state);
  }
  repairToFull(state);
};

const FIGHT_TYPES: ReadonlySet<NodeType> = new Set([
  "battle",
  "elite",
  "miniboss",
  "boss",
]);
const EXPECTED_DMG_PER_FIGHT = 7;

const greedyNext = (
  map: MapGraph,
  byId: ReadonlyMap<string, MapNode>,
  position: string,
  posRow: number,
): MapNode | undefined =>
  outgoingEdges(map, position)
    .map((id) => byId.get(id))
    .filter((n): n is MapNode => n !== undefined && n.row > posRow)
    .sort((a, b) => priorityOf(a.type) - priorityOf(b.type))[0];

// Forecast the number of fights on the greedy path from here to the next shipyard/boss.
const fightsUntilRest = (
  map: MapGraph,
  byId: ReadonlyMap<string, MapNode>,
  position: string,
  posRow: number,
): number => {
  let cur = position;
  let row = posRow;
  let fights = 0;
  for (let guard = 0; guard < 40; guard += 1) {
    const next = greedyNext(map, byId, cur, row);
    if (next === undefined || next.type === "shipyard") break;
    if (FIGHT_TYPES.has(next.type)) fights += 1;
    if (next.type === "boss") break;
    cur = next.id;
    row = next.row;
  }
  return fights;
};

interface SectorResult {
  win: boolean;
  deathRow: number;
  nodes: number;
  kills: number;
  scrapEarned: number;
  scrapSpent: number;
  scrapUnspent: number;
  hullMin: number;
  hullMedian: number;
  resonanceSet: boolean;
  mkReached: number;
}

const median = (values: readonly number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
    : (sorted[mid] ?? 0);
};

const maxRealSchoolCount = (deck: readonly string[]): number => {
  const census = new Map<string, number>();
  let prismatic = 0;
  for (const defId of deck) {
    const school = DIE_BY_ID.get(defId)?.school;
    if (school === undefined) continue;
    if (school === "prismatic") prismatic += 1;
    else census.set(school, (census.get(school) ?? 0) + 1);
  }
  let best = 0;
  for (const s of REAL_SCHOOLS) best = Math.max(best, census.get(s) ?? 0);
  return best + prismatic;
};

const maxMk = (mkLevels: MkLevels): number =>
  Math.max(1, ...Object.values(mkLevels).map((mk) => mk ?? 1));

const runSector = (seed: number): SectorResult => {
  const streams = createStreams(seed);
  const map: MapGraph = generateSectorMap(streams.map, 1);
  const byId = nodeById(map);
  const state: RunState = {
    hull: 30,
    hullMax: 30,
    scrap: 0,
    scrapEarned: 0,
    scrapSpent: 0,
    deck: [...STARTER_DECK],
    mkLevels: {},
    perks: [],
    tide: 0,
    jumpsSinceTide: 0,
    kills: 0,
    nodes: 0,
  };

  let position = START_NODE_ID;
  let posRow = 0;
  const hullEntering: number[] = [];

  const finish = (win: boolean, deathRow: number): SectorResult => ({
    win,
    deathRow,
    nodes: state.nodes,
    kills: state.kills,
    scrapEarned: state.scrapEarned,
    scrapSpent: state.scrapSpent,
    scrapUnspent: state.scrap,
    hullMin: hullEntering.length > 0 ? Math.min(...hullEntering) : state.hull,
    hullMedian: median(hullEntering.length > 0 ? hullEntering : [state.hull]),
    resonanceSet: maxRealSchoolCount(state.deck) >= 4,
    mkReached: maxMk(state.mkLevels),
  });

  while (position !== BOSS_NODE_ID) {
    const next = greedyNext(map, byId, position, posRow);
    if (next === undefined) break;

    position = next.id;
    posRow = next.row;
    state.jumpsSinceTide += 1;
    if (state.jumpsSinceTide >= 4) {
      state.tide = Math.min(3, state.tide + 1);
      state.jumpsSinceTide = 0;
    }

    const type = next.type;
    if (
      type === "battle" ||
      type === "elite" ||
      type === "miniboss" ||
      type === "boss"
    ) {
      hullEntering.push(state.hull);
      const encStream = createStream(deriveSeed(seed, `enc:${next.id}`));
      const enemyIds = buildEncounterIds(type, encStream);
      const res = simulateBattle(
        enemyIds,
        state.deck,
        deriveSeed(seed, `node:${next.id}`),
        {
          hull: state.hull,
          hullMax: state.hullMax,
          tide: state.tide,
          mkLevels: state.mkLevels,
          perks: state.perks,
        },
      );
      state.hull = res.hullLeft;
      state.kills += res.kills;
      if (!res.win) {
        return finish(false, next.row);
      }
      state.nodes += 1;
      const loot = createStream(deriveSeed(seed, `loot:${next.id}`));
      const reward = computeNodeReward(type, loot);
      const mods = computePerkMods(state.perks);
      gain(state, Math.round(reward.scrap * (1 + mods.scrapMultPct / 100)));
      state.hull = Math.min(state.hullMax, state.hull + mods.battleEndHeal);
      if (reward.dieDrop !== null) {
        if (state.deck.length < DECK_CAP) state.deck.push(reward.dieDrop);
        else gain(state, sellValue(ptsForDie(reward.dieDrop)));
      }
      if (isDraftNode(type)) {
        const choices = rollPerkChoices(loot, state.perks);
        const pick = choices[0];
        if (pick !== undefined) {
          state.perks.push(pick);
          const picked = computePerkMods([pick]);
          if (picked.hullMaxDelta > 0) {
            state.hullMax += picked.hullMaxDelta;
            state.hull = Math.min(state.hullMax, state.hull + picked.hullMaxDelta);
          }
        }
      }
      if (type === "boss") {
        return finish(true, -1);
      }
    } else if (type === "shop") {
      greedyShop(state, seed, next);
      state.nodes += 1;
    } else if (type === "shipyard") {
      const forecast =
        fightsUntilRest(map, byId, next.id, next.row) * EXPECTED_DMG_PER_FIGHT;
      greedyShipyard(state, forecast > state.hull * 0.6);
      state.nodes += 1;
    } else {
      state.nodes += 1;
    }
  }

  return finish(position === BOSS_NODE_ID, -1);
};

const runModeMain = (runs: number, seed: number, startedAt: number): void => {
  const results: SectorResult[] = [];
  for (let i = 0; i < runs; i += 1) {
    results.push(runSector(deriveSeed(seed, `run-${String(i)}`)));
  }
  const summarize = (rs: readonly SectorResult[]) => {
    const n = Math.max(1, rs.length);
    const wins = rs.filter((r) => r.win);
    const deaths = rs.filter((r) => !r.win);
    const avg = (f: (r: SectorResult) => number, set = rs): number =>
      set.length > 0 ? set.reduce((s, r) => s + f(r), 0) / set.length : 0;
    return {
      runs: rs.length,
      winrate: wins.length / n,
      avgDeathRow: avg((r) => r.deathRow, deaths),
      avgNodes: avg((r) => r.nodes),
      avgKills: avg((r) => r.kills),
      avgEarned: avg((r) => r.scrapEarned),
      avgSpent: avg((r) => r.scrapSpent),
      avgUnspentDeath: avg((r) => r.scrapUnspent, deaths),
      avgHullMin: avg((r) => r.hullMin),
      avgHullMedian: avg((r) => r.hullMedian),
      avgMk: avg((r) => r.mkReached),
    };
  };

  const all = summarize(results);
  const resTrue = results.filter((r) => r.resonanceSet);
  const resFalse = results.filter((r) => !r.resonanceSet);
  const sT = summarize(resTrue);
  const sF = summarize(resFalse);

  const deathHist = new Map<number, number>();
  for (const r of results) {
    if (!r.win) deathHist.set(r.deathRow, (deathHist.get(r.deathRow) ?? 0) + 1);
  }
  const histLine = Array.from({ length: 16 }, (_, row) => row)
    .filter((row) => (deathHist.get(row) ?? 0) > 0)
    .map((row) => `r${String(row)}:${String(deathHist.get(row) ?? 0)}`)
    .join(" ");

  console.log(
    `sim run: winrate ${(all.winrate * 100).toFixed(1)}% · avgDeathRow ${all.avgDeathRow.toFixed(1)} · avgNodes ${all.avgNodes.toFixed(1)} · hull(min/med) ${all.avgHullMin.toFixed(1)}/${all.avgHullMedian.toFixed(1)} · mk ${all.avgMk.toFixed(2)} · scrap +${all.avgEarned.toFixed(0)}/-${all.avgSpent.toFixed(0)} (unspent@death ${all.avgUnspentDeath.toFixed(0)})`,
  );
  console.log(
    `  resonanceSet=true: ${(sT.winrate * 100).toFixed(1)}% (${String(sT.runs)}) · false: ${(sF.winrate * 100).toFixed(1)}% (${String(sF.runs)})`,
  );
  console.log(`  death_row histogram: ${histLine}`);

  const header = [
    "bucket",
    "runs",
    "seed",
    "winrate",
    "avgDeathRow",
    "avgNodes",
    "avgKills",
    "avgScrapEarned",
    "avgScrapSpent",
    "avgScrapUnspentAtDeath",
    "avgHullMin",
    "avgHullMedian",
    "avgMkReached",
  ].join(",");
  const toRow = (bucket: string, s: ReturnType<typeof summarize>): string =>
    [
      bucket,
      String(s.runs),
      String(seed),
      s.winrate.toFixed(3),
      s.avgDeathRow.toFixed(2),
      s.avgNodes.toFixed(2),
      s.avgKills.toFixed(2),
      s.avgEarned.toFixed(1),
      s.avgSpent.toFixed(1),
      s.avgUnspentDeath.toFixed(1),
      s.avgHullMin.toFixed(1),
      s.avgHullMedian.toFixed(1),
      s.avgMk.toFixed(2),
    ].join(",");

  const histCsv = ["", "death_row,count"]
    .concat(
      Array.from({ length: 16 }, (_, row) => row)
        .filter((row) => (deathHist.get(row) ?? 0) > 0)
        .map((row) => `${String(row)},${String(deathHist.get(row) ?? 0)}`),
    )
    .join("\n");

  const csv = [
    header,
    toRow("all", all),
    toRow("resonance_true", sT),
    toRow("resonance_false", sF),
  ].join("\n");

  const outDir = join(process.cwd(), "sim-out");
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date(startedAt).toISOString().replace(/[:.]/g, "-");
  const outPath = join(outDir, `run-${stamp}.csv`);
  writeFileSync(outPath, `${csv}\n${histCsv}\n`, "utf8");
  console.log(
    `sim: wrote ${outPath} in ${String(Date.now() - startedAt)} ms (${String(runs)} sector runs, seed ${String(seed)})`,
  );
};

// ── Battle mode (default) ─────────────────────────────────────────────────────

const battleModeMain = (
  runs: number,
  seed: number,
  startedAt: number,
): void => {
  const enemyArg = getArg("enemy", "raider");
  const deckName = getArg("deck", "starter");
  if (deckName !== "starter") {
    console.error(`sim: unknown deck "${deckName}" (only "starter" exists)`);
    process.exit(1);
  }
  const deck = STARTER_DECK;
  void DIE_BY_ID;

  const encounters = enemyArg
    .split(";")
    .map((entry) => entry.split(",").map((id) => id.trim()).filter(Boolean))
    .filter((ids) => ids.length > 0);
  for (const ids of encounters) {
    for (const id of ids) {
      if (!ENEMY_BY_ID.has(id) && !isEncounterGroup(id)) {
        console.error(`sim: unknown enemy or group "${id}"`);
        process.exit(1);
      }
    }
    const expanded = expandEncounterIds(ids);
    if (expanded.length > MAX_ENEMIES) {
      console.warn(
        `sim: encounter "${ids.join(",")}" expands to ${String(expanded.length)} enemies; only the first ${String(MAX_ENEMIES)} fight (rest ignored)`,
      );
    }
  }

  const header = [
    "enemies",
    "runs",
    "seed",
    "deck",
    "winrate",
    "timeouts",
    "avgTurns",
    "avgHullLeftWins",
    ...DECILES.map((q) => `dealtP${String(Math.round(q * 100))}`),
    ...DECILES.map((q) => `takenP${String(Math.round(q * 100))}`),
  ].join(",");
  const rows: string[] = [header];

  for (const enemyIds of encounters) {
    const key = enemyIds.join("+");
    const results: BattleResult[] = [];
    for (let i = 0; i < runs; i += 1) {
      results.push(
        simulateBattle(
          enemyIds,
          deck,
          deriveSeed(seed, `${key}:run-${String(i)}`),
        ),
      );
    }
    const wins = results.filter((r) => r.win);
    const winrate = wins.length / results.length;
    const timeouts = results.filter((r) => r.timeout).length;
    const avgTurns =
      results.reduce((sum, r) => sum + r.turns, 0) / results.length;
    const avgHullLeftWins =
      wins.length > 0
        ? wins.reduce((sum, r) => sum + r.hullLeft, 0) / wins.length
        : 0;
    const dealtSorted = results.map((r) => r.dealt).sort((a, b) => a - b);
    const takenSorted = results.map((r) => r.taken).sort((a, b) => a - b);
    rows.push(
      [
        key,
        String(results.length),
        String(seed),
        deckName,
        winrate.toFixed(3),
        String(timeouts),
        avgTurns.toFixed(2),
        avgHullLeftWins.toFixed(2),
        ...DECILES.map((q) => String(decile(dealtSorted, q))),
        ...DECILES.map((q) => String(decile(takenSorted, q))),
      ].join(","),
    );
    console.log(
      `sim: ${key} — winrate ${(winrate * 100).toFixed(1)}% · avgTurns ${avgTurns.toFixed(1)} · avgHullLeft(wins) ${avgHullLeftWins.toFixed(1)} · timeouts ${String(timeouts)}`,
    );
  }

  const outDir = join(process.cwd(), "sim-out");
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date(startedAt).toISOString().replace(/[:.]/g, "-");
  const outPath = join(outDir, `${stamp}.csv`);
  writeFileSync(outPath, `${rows.join("\n")}\n`, "utf8");
  console.log(
    `sim: wrote ${outPath} in ${String(Date.now() - startedAt)} ms (${String(runs)} runs × ${String(encounters.length)} config(s), seed ${String(seed)})`,
  );
};

const main = (): void => {
  const startedAt = Date.now();
  const mode = getArg("mode", "battle");
  const runs = Number(getArg("runs", mode === "run" ? "300" : "1000"));
  const seed = Number(getArg("seed", "7"));
  if (!Number.isFinite(runs) || runs <= 0) {
    console.error(`sim: invalid --runs "${getArg("runs", "1000")}"`);
    process.exit(1);
  }
  if (mode === "run") {
    runModeMain(runs, seed, startedAt);
    return;
  }
  battleModeMain(runs, seed, startedAt);
};

main();
