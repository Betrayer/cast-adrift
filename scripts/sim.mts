import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { STARTER_DECK } from "../src/data/decks";
import { DIE_BY_ID } from "../src/data/dice";
import {
  ALL_ENEMIES,
  ENEMY_BY_ID,
  expandEncounterIds,
  isEncounterGroup,
} from "../src/data/enemies";
import {
  DECK_CAP,
  mkUpgradeCost,
  ptsForDie,
  sellValue,
} from "../src/game/economy/prices";
import { computeNodeReward, isDraftNode } from "../src/game/economy/rewards";
import { generateShopStock } from "../src/game/economy/shop";
import { SECTORS, sectorDef } from "../src/data/sectors";
import {
  bossNodeIdFor,
  generateSectorMap,
  START_NODE_ID,
} from "../src/game/map/generator";
import {
  edgeMarkFor,
  nodeById,
  outgoingEdges,
  type MapGraph,
  type MapNode,
  type NodeType,
} from "../src/game/map/types";
import {
  depthFor,
  DRIFT_LOOP_HP_PCT,
  DRIFT_TIDE_CAP,
  SCORE_PER_DEPTH,
  SCORE_PER_KILL,
  sectorDepth,
} from "../src/game/run/modes";
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
import {
  buildEncounterIds,
  sectorHpPct,
} from "../src/game/run/encounter";
import {
  rollPerkChoices,
  type DraftContext,
} from "../src/game/run/perkDraft";
import { computePerkMods } from "../src/game/run/perkMods";
import { computeRunMods, runChargeCap } from "../src/game/run/runMods";
import { ascensionMods } from "../src/data/ascension";
import { moduleSlots } from "../src/data/modules";
import { ALL_PERKS, PERK_BY_ID } from "../src/data/perks";
import { rollModule } from "../src/game/economy/rewards";
import { generateShopModules } from "../src/game/economy/shop";
import { shipHullMax } from "../src/game/battle/setup";
import type { MkLevels } from "../src/stores/runStore";
import {
  createStream,
  createStreams,
  deriveSeed,
} from "../src/services/rng";
import type { BattleSnapshot, SlotId } from "../src/types/battle";
import type { EventDef, EventEffect, EventOption } from "../src/types/events";
import { ALL_EVENTS } from "../src/data/events";
import { pickEvent, type EventContext } from "../src/game/events/engine";
import {
  driftAllowed,
  sectorDriftDelta,
  DRIFT_RUN_CAP,
} from "../src/game/run/axis";

const TURN_CAP = 30;

interface BattleInit {
  hull?: number;
  hullMax?: number;
  runScrap?: number;
  tide?: number;
  mkLevels?: MkLevels;
  perks?: readonly string[];
  modules?: readonly string[];
  sectorHpPct?: number;
  enemyHpBonusPct?: number;
  eliteShield?: number;
  ascension?: number;
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

const NUDGE = 3;
const SURGE = 10;

const overflows = (snapshot: BattleSnapshot, uid: string): boolean => {
  const die = snapshot.dice.find((d) => d.uid === uid);
  if (die === undefined) return false;
  const mult = die.school === "black" || die.school === "prismatic" ? 1.5 : 1;
  return snapshot.charge + Math.floor(die.value * mult) > snapshot.chargeCap;
};

// Charge is a resource the greedy bot used to ignore entirely, which made every
// reactor-leaning build unmeasurable. A competent player spends it: surge when
// the bank is full, otherwise nudge the placed weapon dice up.
const spendCharge = (snapshot: BattleSnapshot, init: BattleInit): void => {
  const cost = Math.max(
    1,
    NUDGE + computeRunMods(init.perks ?? [], [], init.modules ?? []).nudgeCostDelta,
  );
  if (snapshot.charge >= SURGE && snapshot.nextRollBonus === 0) {
    snapshot.charge -= SURGE;
    snapshot.nextRollBonus = 1;
  }
  const placed = snapshot.dice.filter(
    (d) => d.state === "placed" && d.slot !== undefined,
  );
  const weapons = placed.filter(
    (d) => d.slot === "weaponA" || d.slot === "weaponB" || d.slot === "spinal",
  );
  const targets = weapons.length > 0 ? weapons : placed;
  let guard = 0;
  while (snapshot.charge >= cost && targets.length > 0 && guard < 12) {
    const die = targets.reduce((best, d) => (d.value > best.value ? d : best));
    if (die.value >= die.tier) break;
    die.value += 1;
    snapshot.charge -= cost;
    guard += 1;
  }
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
      modules: init.modules,
      hull: init.hull,
      hullMax: init.hullMax,
      runScrap: init.runScrap,
      chargeCap: runChargeCap(init.perks ?? [], [], init.modules ?? []),
      sectorHpPct: init.sectorHpPct,
      enemyHpBonusPct: init.enemyHpBonusPct,
      eliteShield: init.eliteShield,
      ascension: init.ascension,
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
      // Bot fidelity for «Кассир» (R6): the store bills every confirmed reroll,
      // so the sim has to bill it too or the elite reads as free.
      for (const live of snapshot.enemies) {
        if (live.hp <= 0) continue;
        if (ENEMY_BY_ID.get(live.defId)?.feedsOnReroll !== true) continue;
        live.statuses = { ...live.statuses, charge: 1 };
      }
    }
    const decision = decidePlacements(snapshot);
    if (decision.targetId !== null) snapshot.targetId = decision.targetId;
    for (const placement of decision.placements) {
      // A competent player does not pour a die into a reactor that is about to
      // overflow: the −2 hull is strictly worse than burning the die.
      if (placement.slot === "reactor" && overflows(snapshot, placement.uid)) {
        continue;
      }
      if (canPlaceDie(snapshot, placement.uid, placement.slot)) {
        applyPlacement(snapshot, placement.uid, placement.slot);
      }
    }
    if (decision.reserveUid !== undefined) {
      const die = snapshot.dice.find((d) => d.uid === decision.reserveUid);
      if (die?.state === "tray") die.state = "reserved";
    }
    spendCharge(snapshot, init);

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
  modules: string[];
  tide: number;
  jumpsSinceTide: number;
  kills: number;
  nodes: number;
  pockets: number;
  draftsSinceRare: number;
}

const simDraftContext = (
  state: RunState,
  sector: number,
): DraftContext => ({
  owned: state.perks,
  banished: [],
  sector,
  deckDefIds: state.deck,
  modules: state.modules,
  shipId: "wanderer",
  draftsSinceRare: state.draftsSinceRare,
});

const noteSimDraft = (state: RunState, choices: readonly string[]): void => {
  if (choices.length === 0) return;
  state.draftsSinceRare = choices.some(
    (id) => PERK_BY_ID.get(id)?.rarity === "rare",
  )
    ? 0
    : state.draftsSinceRare + 1;
};

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
  const discount = computeRunMods(state.perks, [], state.modules).shopDiscountPct;
  // The bot buys any module it can afford while the bay has room: modules are a
  // strict upgrade at these prices, so a greedy rule is the honest baseline.
  for (const item of generateShopModules(seed, node.id, 0, discount)) {
    if (state.modules.length >= moduleSlots(0)) break;
    if (state.scrap >= item.price && spend(state, item.price)) {
      state.modules.push(item.moduleId);
    }
  }
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

// Detours are worth their raised risk only with hull to spare, and a marked
// mine edge is worth half a node of priority to walk around.
const POCKET_HULL_PCT = 60;
const MINE_PENALTY = 0.5;
const CURSED_PENALTY = 0.75;
const BLESSED_BONUS = 0.25;

const pocketPayoff = (
  map: MapGraph,
  byId: ReadonlyMap<string, MapNode>,
  node: MapNode,
): NodeType => {
  const rewardId = outgoingEdges(map, node.id)[0];
  const reward = rewardId === undefined ? undefined : byId.get(rewardId);
  return reward?.type ?? node.type;
};

const stepCost = (
  map: MapGraph,
  byId: ReadonlyMap<string, MapNode>,
  from: string,
  node: MapNode,
): number => {
  const base =
    node.pocket === true
      ? priorityOf(pocketPayoff(map, byId, node))
      : priorityOf(node.type);
  const blessing =
    node.blessing === "cursed"
      ? CURSED_PENALTY
      : node.blessing === "blessed"
        ? -BLESSED_BONUS
        : 0;
  return (
    base +
    blessing +
    (edgeMarkFor(map, from, node.id) === "mine" ? MINE_PENALTY : 0)
  );
};

const greedyNext = (
  map: MapGraph,
  byId: ReadonlyMap<string, MapNode>,
  position: string,
  posRow: number,
  hullPct = 100,
): MapNode | undefined =>
  outgoingEdges(map, position)
    .map((id) => byId.get(id))
    .filter((n): n is MapNode => n !== undefined && n.row > posRow)
    .filter((n) => n.pocket !== true || hullPct >= POCKET_HULL_PCT)
    .sort(
      (a, b) =>
        stepCost(map, byId, position, a) - stepCost(map, byId, position, b),
    )[0];

const motifsOf = (sector: number) => sectorDef(sector).shape.motifs;

const applyEffectsToState = (
  state: RunState,
  effects: readonly EventEffect[],
  tideCap: number,
): void => {
  for (const effect of effects) {
    if (effect.k === "scrap") gain(state, effect.n);
    else if (effect.k === "hull") {
      state.hull = Math.max(1, Math.min(state.hullMax, state.hull + effect.n));
    } else if (effect.k === "tide") {
      state.tide = Math.max(0, Math.min(tideCap, state.tide + effect.n));
    }
  }
};

const applyNodeMotifsSim = (
  state: RunState,
  sector: number,
  node: MapNode,
  tideCap: number,
): void => {
  for (const motif of motifsOf(sector)) {
    if (motif.m === "cache" && node.cache === true) {
      applyEffectsToState(state, motif.gain, tideCap);
    }
    if (motif.m === "procession" && node.blessing !== undefined) {
      applyEffectsToState(
        state,
        node.blessing === "blessed" ? motif.blessed : motif.cursed,
        tideCap,
      );
    }
  }
};

const applyEdgeMotifsSim = (
  state: RunState,
  sector: number,
  map: MapGraph,
  from: string,
  to: string,
  tideCap: number,
): void => {
  if (edgeMarkFor(map, from, to) !== "mine") return;
  for (const motif of motifsOf(sector)) {
    if (motif.m === "mineEdges") applyEffectsToState(state, motif.toll, tideCap);
  }
};

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
  pockets: number;
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
  const bossId = bossNodeIdFor(1);
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
    modules: [],
    tide: 0,
    jumpsSinceTide: 0,
    kills: 0,
    nodes: 0,
    pockets: 0,
    draftsSinceRare: 0,
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
    pockets: state.pockets,
  });

  while (position !== bossId) {
    const hullPct = (state.hull / Math.max(1, state.hullMax)) * 100;
    const next = greedyNext(map, byId, position, posRow, hullPct);
    if (next === undefined) break;

    applyEdgeMotifsSim(state, 1, map, position, next.id, 3);
    position = next.id;
    posRow = next.row;
    if (next.pocket === true) state.pockets += 1;
    applyNodeMotifsSim(state, 1, next, 3);
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
      const enemyIds = buildEncounterIds(type, encStream, { seed });
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
          sectorHpPct: sectorHpPct({ sector: 1, pocket: next.pocket === true }),
        },
      );
      state.hull = res.hullLeft;
      state.kills += res.kills;
      if (!res.win) {
        return finish(false, next.row);
      }
      state.nodes += 1;
      const loot = createStream(deriveSeed(seed, `loot:${next.id}`));
      const reward = computeNodeReward(type, loot, 0, next.pocket === true);
      const mods = computeRunMods(state.perks, [], state.modules);
      gain(state, Math.round(reward.scrap * (1 + mods.scrapMultPct / 100)));
      state.hull = Math.min(state.hullMax, state.hull + mods.battleEndHeal);
      if (reward.dieDrop !== null) {
        if (state.deck.length < DECK_CAP) state.deck.push(reward.dieDrop);
        else gain(state, sellValue(ptsForDie(reward.dieDrop)));
      }
      if (isDraftNode(type)) {
        const choices = rollPerkChoices(loot, simDraftContext(state, 1));
        noteSimDraft(state, choices);
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

  return finish(position === bossId, -1);
};

// ── Drift mode ────────────────────────────────────────────────────────────────

interface DriftResult {
  depth: number;
  sectors: number;
  kills: number;
  scrapEarned: number;
  score: number;
  deathSector: number;
}

const driftSector = (
  state: RunState,
  seed: number,
  sectorIndex: number,
): { cleared: boolean; rows: number } => {
  const streams = createStreams(deriveSeed(seed, `map:${String(sectorIndex)}`));
  const sector = Math.min(SECTORS.length, sectorIndex);
  const map: MapGraph = generateSectorMap(streams.map, sector, {
    bossAsGate: true,
  });
  const byId = nodeById(map);
  const loopHpPct = DRIFT_LOOP_HP_PCT * Math.max(0, sectorIndex - SECTORS.length);

  let position = START_NODE_ID;
  let posRow = 0;

  for (let guard = 0; guard < 64; guard += 1) {
    const hullPct = (state.hull / Math.max(1, state.hullMax)) * 100;
    const next = greedyNext(map, byId, position, posRow, hullPct);
    if (next === undefined) return { cleared: false, rows: posRow };
    applyEdgeMotifsSim(state, sector, map, position, next.id, DRIFT_TIDE_CAP);
    position = next.id;
    posRow = next.row;
    if (next.pocket === true) state.pockets += 1;
    applyNodeMotifsSim(state, sector, next, DRIFT_TIDE_CAP);
    state.jumpsSinceTide += 1;
    if (state.jumpsSinceTide >= 4) {
      state.tide = Math.min(DRIFT_TIDE_CAP, state.tide + 1);
      state.jumpsSinceTide = 0;
    }

    const type = next.type;
    if (FIGHT_TYPES.has(type)) {
      const encStream = createStream(
        deriveSeed(seed, `enc:${String(sectorIndex)}:${next.id}`),
      );
      const enemyIds = buildEncounterIds(type, encStream, { sector, seed });
      const res = simulateBattle(
        enemyIds,
        state.deck,
        deriveSeed(seed, `node:${String(sectorIndex)}:${next.id}`),
        {
          hull: state.hull,
          hullMax: state.hullMax,
          tide: state.tide,
          mkLevels: state.mkLevels,
          perks: state.perks,
          sectorHpPct: sectorHpPct({ sector, pocket: next.pocket === true }),
          enemyHpBonusPct: loopHpPct,
        },
      );
      state.hull = res.hullLeft;
      state.kills += res.kills;
      if (!res.win) return { cleared: false, rows: posRow };
      state.nodes += 1;
      const loot = createStream(
        deriveSeed(seed, `loot:${String(sectorIndex)}:${next.id}`),
      );
      const reward = computeNodeReward(type, loot, 0, next.pocket === true);
      const mods = computePerkMods(state.perks);
      gain(
        state,
        Math.round(
          reward.scrap *
            (SECTORS.find((s) => s.id === sector)?.scrapMult ?? 1) *
            (1 + mods.scrapMultPct / 100),
        ),
      );
      state.hull = Math.min(state.hullMax, state.hull + mods.battleEndHeal);
      if (reward.dieDrop !== null) {
        if (state.deck.length < DECK_CAP) state.deck.push(reward.dieDrop);
        else gain(state, sellValue(ptsForDie(reward.dieDrop)));
      }
      if (isDraftNode(type)) {
        const choices = rollPerkChoices(loot, simDraftContext(state, sector));
        noteSimDraft(state, choices);
        const pick = choices[0];
        if (pick !== undefined) {
          state.perks.push(pick);
          const picked = computePerkMods([pick]);
          if (picked.hullMaxDelta > 0) {
            state.hullMax += picked.hullMaxDelta;
            state.hull = Math.min(
              state.hullMax,
              state.hull + picked.hullMaxDelta,
            );
          }
        }
      }
      if (posRow >= sectorDepth(sectorIndex)) return { cleared: true, rows: posRow };
    } else if (type === "shop") {
      greedyShop(state, deriveSeed(seed, `shop:${String(sectorIndex)}`), next);
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
  return { cleared: false, rows: posRow };
};

// The starter deck dies in sector 1 (same as `--mode run`), so the loop scaling is
// never reached. `--deck mid` enters drift with what a mid-collection profile
// actually brings, which is the only way to measure the +8%/loop ramp.
const DRIFT_MID_DECK: readonly string[] = [
  "red-d6",
  "red-d6",
  "ember",
  "slug",
  "cinder",
  "fused-emberforge",
  "blue-d6",
  "bulwark",
  "black-d6",
];

const DRIFT_MID_MK: MkLevels = {
  weaponA: 3,
  weaponB: 2,
  shields: 3,
  reactor: 2,
};

const runDrift = (seed: number, mid: boolean): DriftResult => {
  const state: RunState = {
    hull: 30,
    hullMax: 30,
    scrap: 0,
    scrapEarned: 0,
    scrapSpent: 0,
    deck: mid ? [...DRIFT_MID_DECK] : [...STARTER_DECK],
    mkLevels: mid ? { ...DRIFT_MID_MK } : {},
    perks: [],
    modules: [],
    tide: 0,
    jumpsSinceTide: 0,
    kills: 0,
    nodes: 0,
    pockets: 0,
    draftsSinceRare: 0,
  };

  let sectorIndex = 1;
  let depth = 0;
  for (; sectorIndex <= 40; sectorIndex += 1) {
    const { cleared, rows } = driftSector(state, seed, sectorIndex);
    depth = depthFor(sectorIndex, rows);
    if (!cleared) break;
    // Drift keeps the tide between sectors only through its cap; the map resets.
    state.tide = Math.max(0, state.tide - 1);
    state.jumpsSinceTide = 0;
  }

  return {
    depth,
    sectors: Math.max(1, Math.min(sectorIndex, 40)),
    kills: state.kills,
    scrapEarned: state.scrapEarned,
    score: depth * SCORE_PER_DEPTH + state.kills * SCORE_PER_KILL + state.scrapEarned,
    deathSector: Math.min(sectorIndex, 40),
  };
};

const driftModeMain = (runs: number, seed: number, startedAt: number): void => {
  const deckName = getArg("deck", "starter");
  if (deckName !== "starter" && deckName !== "mid") {
    console.error(`sim: drift --deck must be "starter" or "mid"`);
    process.exit(1);
  }
  const mid = deckName === "mid";
  const results: DriftResult[] = [];
  for (let i = 0; i < runs; i += 1) {
    results.push(runDrift(deriveSeed(seed, `drift-${String(i)}`), mid));
  }
  const scores = results.map((r) => r.score).sort((a, b) => a - b);
  const depths = results.map((r) => r.depth).sort((a, b) => a - b);
  const avg = (f: (r: DriftResult) => number): number =>
    results.reduce((s, r) => s + f(r), 0) / Math.max(1, results.length);

  console.log(
    `sim drift (${deckName}): avgDepth ${avg((r) => r.depth).toFixed(1)} · avgScore ${avg((r) => r.score).toFixed(0)} · avgKills ${avg((r) => r.kills).toFixed(1)} · avgScrap ${avg((r) => r.scrapEarned).toFixed(0)} · avgSectors ${avg((r) => r.sectors).toFixed(2)}`,
  );
  console.log(
    `  score deciles: ${DECILES.map((q) => `P${String(Math.round(q * 100))}=${String(decile(scores, q))}`).join(" ")}`,
  );
  console.log(
    `  depth deciles: ${DECILES.map((q) => `P${String(Math.round(q * 100))}=${String(decile(depths, q))}`).join(" ")}`,
  );

  const sectorHist = new Map<number, number>();
  for (const r of results) {
    sectorHist.set(r.deathSector, (sectorHist.get(r.deathSector) ?? 0) + 1);
  }
  console.log(
    `  death sector histogram: ${[...sectorHist.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([s, n]) => `s${String(s)}:${String(n)}`)
      .join(" ")}`,
  );

  const rows = [
    "runs,seed,deck,avgDepth,avgScore,avgKills,avgScrapEarned,avgSectors," +
      DECILES.map((q) => `scoreP${String(Math.round(q * 100))}`).join(",") +
      "," +
      DECILES.map((q) => `depthP${String(Math.round(q * 100))}`).join(","),
    [
      String(results.length),
      String(seed),
      deckName,
      avg((r) => r.depth).toFixed(2),
      avg((r) => r.score).toFixed(1),
      avg((r) => r.kills).toFixed(2),
      avg((r) => r.scrapEarned).toFixed(1),
      avg((r) => r.sectors).toFixed(2),
      ...DECILES.map((q) => String(decile(scores, q))),
      ...DECILES.map((q) => String(decile(depths, q))),
    ].join(","),
    "",
    "death_sector,count",
    ...[...sectorHist.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([s, n]) => `${String(s)},${String(n)}`),
  ];

  const outDir = join(process.cwd(), "sim-out");
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date(startedAt).toISOString().replace(/[:.]/g, "-");
  const outPath = join(outDir, `drift-${deckName}-${stamp}.csv`);
  writeFileSync(outPath, `${rows.join("\n")}\n`, "utf8");
  console.log(
    `sim: wrote ${outPath} in ${String(Date.now() - startedAt)} ms (${String(runs)} drift runs, seed ${String(seed)})`,
  );
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

// ── Boss / gate mode ─────────────────────────────────────────────────────────

interface GateProfile {
  sector: number;
  deck: readonly string[];
  mkLevels: MkLevels;
  hull: number;
  tide: number;
  // What the same player is carrying when they arrive. R6 made this matter: a
  // `bargain` bills the run purse, so a harness with no purse measures the
  // broke-player worst case rather than the ordinary arrival.
  scrap: number;
}

// A "mid deck" for each act: what a player who bought sensibly and upgraded on
// cadence actually brings to the gate. Used only for balance measurement.
const GATE_PROFILES: readonly GateProfile[] = [
  {
    sector: 1,
    deck: ["red-d6", "red-d6", "ember", "blue-d6", "grey-d4", "green-d4"],
    mkLevels: {},
    hull: 26,
    tide: 2,
    scrap: 45,
  },
  {
    sector: 2,
    deck: ["red-d6", "red-d6", "ember", "slug", "blue-d6", "bulwark", "grey-d4"],
    mkLevels: { weaponA: 2 },
    hull: 27,
    tide: 2,
    scrap: 45,
  },
  {
    sector: 3,
    deck: [
      "red-d6", "red-d6", "ember", "slug", "cinder",
      "blue-d6", "bulwark", "grey-d4",
    ],
    mkLevels: { weaponA: 2, shields: 2 },
    hull: 28,
    tide: 3,
    scrap: 45,
  },
  {
    sector: 4,
    deck: [
      "red-d6", "red-d6", "ember", "slug", "cinder", "fused-emberforge",
      "blue-d6", "bulwark", "black-d6",
    ],
    mkLevels: { weaponA: 3, shields: 2, reactor: 2 },
    hull: 29,
    tide: 3,
    scrap: 45,
  },
  {
    sector: 5,
    deck: [
      "red-d6", "red-d6", "ember", "slug", "cinder", "fused-emberforge",
      "blue-d6", "bulwark", "black-d6",
    ],
    mkLevels: { weaponA: 3, weaponB: 2, shields: 3, reactor: 2 },
    hull: 30,
    tide: 3,
    scrap: 45,
  },
];

const gateModeMain = (runs: number, seed: number, startedAt: number): void => {
  const kind = getArg("gate", "boss");
  const rows: string[] = [
    "sector,target,runs,seed,winrate,timeouts,avgTurns,avgHullLeftWins",
  ];
  for (const profile of GATE_PROFILES) {
    const def = SECTORS.find((s) => s.id === profile.sector);
    if (def === undefined) continue;
    const targets =
      kind === "miniboss" ? [...def.minibossPool] : [...def.bossPool];
    for (const target of targets) {
      const results: BattleResult[] = [];
      for (let i = 0; i < runs; i += 1) {
        results.push(
          simulateBattle(
            [target],
            profile.deck,
            deriveSeed(seed, `${target}:run-${String(i)}`),
            {
              hull: profile.hull,
              hullMax: profile.hull,
              runScrap: profile.scrap,
              tide: profile.tide,
              mkLevels: profile.mkLevels,
              sectorHpPct: sectorHpPct({ sector: profile.sector }),
            },
          ),
        );
      }
      const wins = results.filter((r) => r.win);
      const winrate = wins.length / results.length;
      const timeouts = results.filter((r) => r.timeout).length;
      const avgTurns =
        results.reduce((sum, r) => sum + r.turns, 0) / results.length;
      const avgHull =
        wins.length > 0
          ? wins.reduce((sum, r) => sum + r.hullLeft, 0) / wins.length
          : 0;
      rows.push(
        [
          String(profile.sector),
          target,
          String(results.length),
          String(seed),
          winrate.toFixed(3),
          String(timeouts),
          avgTurns.toFixed(2),
          avgHull.toFixed(2),
        ].join(","),
      );
      console.log(
        `sim gate: S${String(profile.sector)} ${target} — winrate ${(winrate * 100).toFixed(1)}% · avgTurns ${avgTurns.toFixed(1)} · avgHullLeft(wins) ${avgHull.toFixed(1)} · timeouts ${String(timeouts)}`,
      );
    }
  }
  const outDir = join(process.cwd(), "sim-out");
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date(startedAt).toISOString().replace(/[:.]/g, "-");
  const outPath = join(outDir, `gate-${kind}-${stamp}.csv`);
  writeFileSync(outPath, `${rows.join("\n")}\n`, "utf8");
  console.log(`sim: wrote ${outPath} in ${String(Date.now() - startedAt)} ms`);
};

// ── Sweep mode (Phase-10 Task 10) ────────────────────────────────────────────

interface Archetype {
  name: string;
  deck: readonly string[];
  mkLevels: MkLevels;
  // The two modules a player running this build buys first. A mid-collection
  // profile always reaches a shop before the gate, so starting empty would
  // measure a ship nobody actually flies.
  modules: readonly string[];
}

// Three mid-collection builds a real profile can actually assemble, one per
// axis the balance bands care about: burst, sustain, and risk.
const ARCHETYPES: readonly Archetype[] = [
  {
    name: "red-burn",
    deck: [
      "red-d6", "red-d6", "ember", "cinder", "slug",
      "fused-emberforge", "magma", "flare", "blue-d6",
    ],
    mkLevels: { weaponA: 3, weaponB: 2, shields: 2, reactor: 2 },
    modules: ["siegeMount", "emberInjector"],
  },
  {
    // A four-set is the build; the rest is the weapons core every deck needs.
    name: "blue-wall",
    deck: [
      "blue-d6", "frostplate", "bulwark", "aegis",
      "red-d6", "red-d6", "ember", "slug", "fused-emberforge",
    ],
    mkLevels: { weaponA: 3, shields: 3, engines: 2, reactor: 2 },
    modules: ["ablativeWeave", "dampingCoil"],
  },
  {
    // Black's measurable identity is the exceed-cap gamble (DESIGN §7), not the
    // reactor: the bot converts charge at 3:1, so reactor value under-reads.
    name: "black-edge",
    deck: [
      "black-d6", "ashen", "pitch", "eclipse", "voidmaw",
      "red-d6", "ember", "slug", "fused-emberforge",
    ],
    mkLevels: { weaponA: 3, weaponB: 2, shields: 2, reactor: 3 },
    modules: ["blackLedger", "heatsink"],
  },
];

interface SweepOptions {
  sector: number;
  ascension: number;
  archetype: Archetype;
  forcedPerk?: string;
}

const runSweepSector = (seed: number, opts: SweepOptions): SectorResult => {
  const streams = createStreams(seed);
  const map: MapGraph = generateSectorMap(streams.map, opts.sector);
  const bossId = bossNodeIdFor(opts.sector);
  const byId = nodeById(map);
  const aMods = ascensionMods(opts.ascension);
  const hullMax = Math.max(
    1,
    Math.round(shipHullMax("wanderer") * (1 + aMods.hullPct / 100)),
  );
  const state: RunState = {
    hull: hullMax,
    hullMax,
    scrap: 0,
    scrapEarned: 0,
    scrapSpent: 0,
    deck: [...opts.archetype.deck],
    mkLevels: { ...opts.archetype.mkLevels },
    perks: opts.forcedPerk !== undefined ? [opts.forcedPerk] : [],
    modules: [...opts.archetype.modules],
    tide: 0,
    jumpsSinceTide: 0,
    kills: 0,
    nodes: 0,
    pockets: 0,
    draftsSinceRare: 0,
  };

  let position = START_NODE_ID;
  let posRow = 0;
  const hullEntering: number[] = [];
  const tideCap = 3 + aMods.tideCapDelta;

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
    pockets: state.pockets,
  });

  while (position !== bossId) {
    const hullPct = (state.hull / Math.max(1, state.hullMax)) * 100;
    const next = greedyNext(map, byId, position, posRow, hullPct);
    if (next === undefined) break;
    applyEdgeMotifsSim(state, opts.sector, map, position, next.id, tideCap);
    position = next.id;
    posRow = next.row;
    if (next.pocket === true) state.pockets += 1;
    applyNodeMotifsSim(state, opts.sector, next, tideCap);
    state.jumpsSinceTide += 1;
    if (state.jumpsSinceTide >= 4) {
      state.tide = Math.min(tideCap, state.tide + 1);
      state.jumpsSinceTide = 0;
    }

    const type = next.type;
    if (FIGHT_TYPES.has(type)) {
      hullEntering.push(state.hull);
      const encStream = createStream(deriveSeed(seed, `enc:${next.id}`));
      const enemyIds = buildEncounterIds(type, encStream, {
        sector: opts.sector,
        seed,
      });
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
          modules: state.modules,
          sectorHpPct: sectorHpPct({
            sector: opts.sector,
            pocket: next.pocket === true,
          }),
          enemyHpBonusPct: aMods.enemyHpPct,
          eliteShield: aMods.eliteShield,
          ascension: opts.ascension,
        },
      );
      state.hull = res.hullLeft;
      state.kills += res.kills;
      if (!res.win) return finish(false, next.row);
      state.nodes += 1;
      const loot = createStream(deriveSeed(seed, `loot:${next.id}`));
      const reward = computeNodeReward(type, loot, 0, next.pocket === true);
      const mods = computeRunMods(state.perks, [], state.modules);
      const sectorMult =
        SECTORS.find((sd) => sd.id === opts.sector)?.scrapMult ?? 1;
      gain(
        state,
        Math.round(reward.scrap * sectorMult * (1 + mods.scrapMultPct / 100)),
      );
      state.hull = Math.min(state.hullMax, state.hull + mods.battleEndHeal);
      if (reward.dieDrop !== null && state.deck.length < DECK_CAP) {
        state.deck.push(reward.dieDrop);
      }
      if (type === "elite" || type === "miniboss") {
        const moduleId = rollModule(loot, state.modules, "common");
        if (state.modules.length < moduleSlots(0)) state.modules.push(moduleId);
      }
      if (isDraftNode(type) && opts.forcedPerk === undefined) {
        const draftChoices = rollPerkChoices(
          loot,
          simDraftContext(state, opts.sector),
        );
        noteSimDraft(state, draftChoices);
        const pick = draftChoices[0];
        if (pick !== undefined) {
          state.perks.push(pick);
          const picked = computePerkMods([pick]);
          if (picked.hullMaxDelta > 0) {
            state.hullMax += picked.hullMaxDelta;
            state.hull = Math.min(state.hullMax, state.hull + picked.hullMaxDelta);
          }
        }
      }
      if (type === "boss") return finish(true, -1);
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
  return finish(position === bossId, -1);
};

const SWEEP_ASCENSIONS: readonly number[] = [0, 3, 6];

const sweepModeMain = (runs: number, seed: number, startedAt: number): void => {
  const rows: string[] = [
    "sector,ascension,deck,runs,winrate,avgNodes,avgKills,avgScrapEarned,avgScrapSpent,avgHullMedian,avgMk,avgPockets",
  ];
  console.log(
    `sim sweep: 5 sectors x ${String(SWEEP_ASCENSIONS.length)} ascensions x ${String(ARCHETYPES.length)} decks x ${String(runs)} runs`,
  );
  for (const sector of [1, 2, 3, 4, 5]) {
    for (const ascension of SWEEP_ASCENSIONS) {
      for (const archetype of ARCHETYPES) {
        const results: SectorResult[] = [];
        for (let i = 0; i < runs; i += 1) {
          results.push(
            runSweepSector(
              deriveSeed(
                seed,
                `sweep:${String(sector)}:${String(ascension)}:${archetype.name}:${String(i)}`,
              ),
              { sector, ascension, archetype },
            ),
          );
        }
        const n = Math.max(1, results.length);
        const avg = (f: (r: SectorResult) => number): number =>
          results.reduce((sum, r) => sum + f(r), 0) / n;
        const winrate = results.filter((r) => r.win).length / n;
        rows.push(
          [
            String(sector),
            `A${String(ascension)}`,
            archetype.name,
            String(results.length),
            winrate.toFixed(3),
            avg((r) => r.nodes).toFixed(2),
            avg((r) => r.kills).toFixed(2),
            avg((r) => r.scrapEarned).toFixed(1),
            avg((r) => r.scrapSpent).toFixed(1),
            avg((r) => r.hullMedian).toFixed(1),
            avg((r) => r.mkReached).toFixed(2),
            avg((r) => r.pockets).toFixed(2),
          ].join(","),
        );
        console.log(
          `  S${String(sector)} A${String(ascension)} ${archetype.name.padEnd(10)} winrate ${(winrate * 100).toFixed(1)}% · scrap +${avg((r) => r.scrapEarned).toFixed(0)}/-${avg((r) => r.scrapSpent).toFixed(0)} · hull ${avg((r) => r.hullMedian).toFixed(1)} · pockets ${avg((r) => r.pockets).toFixed(2)}`,
        );
      }
    }
  }
  const outDir = join(process.cwd(), "sim-out");
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date(startedAt).toISOString().replace(/[:.]/g, "-");
  const outPath = join(outDir, `sweep-${stamp}.csv`);
  writeFileSync(outPath, `${rows.join("\n")}\n`, "utf8");
  console.log(`sim: wrote ${outPath} in ${String(Date.now() - startedAt)} ms`);
};

// Dead-perk report: every perk is force-picked for a fixed run budget and its
// winrate compared with the no-perk baseline on the same seeds.
const perkModeMain = (runs: number, seed: number, startedAt: number): void => {
  const archetype = ARCHETYPES[0];
  if (archetype === undefined) return;
  const sector = Number(getArg("sector", "2"));
  const baseline = (forcedPerk?: string): number => {
    let wins = 0;
    for (let i = 0; i < runs; i += 1) {
      const res = runSweepSector(
        deriveSeed(seed, `perk:${String(sector)}:${String(i)}`),
        { sector, ascension: 0, archetype, forcedPerk },
      );
      if (res.win) wins += 1;
    }
    return wins / Math.max(1, runs);
  };

  const base = baseline();
  const rows: string[] = ["perk,pool,rarity,winrate,baseline,delta_pct"];
  const deltas: { id: string; delta: number }[] = [];
  for (const perk of ALL_PERKS) {
    const wr = baseline(perk.id);
    const delta = (wr - base) * 100;
    deltas.push({ id: perk.id, delta });
    rows.push(
      [
        perk.id,
        perk.pool,
        perk.rarity,
        wr.toFixed(3),
        base.toFixed(3),
        delta.toFixed(1),
      ].join(","),
    );
  }
  deltas.sort((a, b) => a.delta - b.delta);
  const dead = deltas.filter((d) => d.delta < -3);
  console.log(
    `sim perks: baseline ${(base * 100).toFixed(1)}% over ${String(runs)} runs on S${String(sector)}`,
  );
  console.log(
    `  worst five: ${deltas.slice(0, 5).map((d) => `${d.id} ${d.delta.toFixed(1)}%`).join(" · ")}`,
  );
  console.log(
    `  best five: ${deltas.slice(-5).reverse().map((d) => `${d.id} +${d.delta.toFixed(1)}%`).join(" · ")}`,
  );
  console.log(
    dead.length === 0
      ? "  no perk below the -3% dead-weight line"
      : `  BELOW -3%: ${dead.map((d) => `${d.id} ${d.delta.toFixed(1)}%`).join(" · ")}`,
  );
  const outDir = join(process.cwd(), "sim-out");
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date(startedAt).toISOString().replace(/[:.]/g, "-");
  const outPath = join(outDir, `perks-${stamp}.csv`);
  writeFileSync(outPath, `${rows.join("\n")}\n`, "utf8");
  console.log(`sim: wrote ${outPath} in ${String(Date.now() - startedAt)} ms`);
};

// Economy pass (Phase-10 Task 10). DESIGN §9.3 prices every node type; the
// assertion here is the derived one: scrap earned per cleared node must sit
// inside the battle-floor..elite-ceiling band once the sector multiplier is
// applied, and a healthy run must convert a real share of it into upgrades.
const ECONOMY_PER_NODE_MIN = 12;
const ECONOMY_PER_NODE_MAX = 60;
// A sector must fund at least one Mk3 (130) and never so much that prices stop
// mattering — six Mk3s is the ceiling the §9.3 spend list implies.
const ECONOMY_SECTOR_MIN = 130;
const ECONOMY_SECTOR_MAX = 130 * 6;

const economyModeMain = (runs: number, seed: number, startedAt: number): void => {
  const rows: string[] = [
    "sector,deck,runs,medianEarnedPerNode,medianEarned,medianSpent,spendShare,verdict",
  ];
  let failures = 0;
  for (const sector of [1, 3, 5]) {
    const mult = SECTORS.find((sd) => sd.id === sector)?.scrapMult ?? 1;
    for (const archetype of ARCHETYPES) {
      const perNode: number[] = [];
      const earned: number[] = [];
      const spent: number[] = [];
      for (let i = 0; i < runs; i += 1) {
        const r = runSweepSector(
          deriveSeed(seed, `eco:${String(sector)}:${archetype.name}:${String(i)}`),
          { sector, ascension: 0, archetype },
        );
        earned.push(r.scrapEarned);
        spent.push(r.scrapSpent);
        if (r.nodes > 0) perNode.push(r.scrapEarned / r.nodes);
      }
      const mEarnedPerNode = median(perNode);
      const mEarned = median(earned);
      const mSpent = median(spent);
      const share = mEarned > 0 ? mSpent / mEarned : 0;
      const lo = ECONOMY_PER_NODE_MIN * mult;
      const hi = ECONOMY_PER_NODE_MAX * mult;
      const ok =
        mEarnedPerNode >= lo &&
        mEarnedPerNode <= hi &&
        mEarned >= ECONOMY_SECTOR_MIN &&
        mEarned <= ECONOMY_SECTOR_MAX;
      if (!ok) failures += 1;
      rows.push(
        [
          String(sector),
          archetype.name,
          String(runs),
          mEarnedPerNode.toFixed(2),
          mEarned.toFixed(1),
          mSpent.toFixed(1),
          share.toFixed(3),
          ok ? "ok" : "OUT_OF_BAND",
        ].join(","),
      );
      console.log(
        `sim economy: S${String(sector)} ${archetype.name.padEnd(10)} ${mEarnedPerNode.toFixed(1)}/node (band ${lo.toFixed(0)}-${hi.toFixed(0)}) · earned ${mEarned.toFixed(0)} · spent ${mSpent.toFixed(0)} (${(share * 100).toFixed(0)}%) — ${ok ? "ok" : "OUT OF BAND"}`,
      );
    }
  }
  const outDir = join(process.cwd(), "sim-out");
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date(startedAt).toISOString().replace(/[:.]/g, "-");
  const outPath = join(outDir, `economy-${stamp}.csv`);
  writeFileSync(outPath, `${rows.join("\n")}\n`, "utf8");
  console.log(`sim: wrote ${outPath} in ${String(Date.now() - startedAt)} ms`);
  if (failures > 0) {
    console.error(`sim economy: ${String(failures)} row(s) outside the §9.3 envelope`);
    process.exit(1);
  }
};

// ── Roster mode (R6 Task 5) ─────────────────────────────────────────────────

// The home sector a def is actually met in, so the 1v1 harness measures it
// against the deck and the HP curve it is designed against rather than against
// sector 1 for everybody.
const homeSectorOf = (id: string): number => {
  for (const def of SECTORS) {
    const pooled =
      def.enemyPool.some(([enemyId]) => enemyId === id) ||
      def.elitePool.includes(id) ||
      def.minibossPool.includes(id) ||
      def.bossPool.includes(id) ||
      def.pairPool.some((pair) => pair.includes(id));
    if (pooled) return def.id;
  }
  return 1;
};

interface RosterRow {
  id: string;
  tier: string;
  sector: number;
  archetype: string;
  wins: number;
  runs: number;
  turns: number;
  hullLeft: number;
}

const rosterTierOf = (id: string): string => {
  const def = ENEMY_BY_ID.get(id);
  if (def?.boss === true) return "boss";
  if (def?.miniboss === true) return "miniboss";
  if (def?.elite === true) return "elite";
  return "base";
};

// A 1v1 at full hull with a tuned deck is not the fight the player has. Each
// tier is measured at the state it is actually met in: an ordinary battle early
// in a sector, an elite after two, a gate fight at the row it gates, a boss at
// the end of the sector with the tide up.
interface RosterEntry {
  hullPct: number;
  tide: number;
  scrap: number;
}

const ROSTER_ENTRY: Readonly<Record<string, RosterEntry>> = {
  base: { hullPct: 100, tide: 0, scrap: 20 },
  elite: { hullPct: 75, tide: 1, scrap: 30 },
  miniboss: { hullPct: 65, tide: 2, scrap: 45 },
  boss: { hullPct: 55, tide: 3, scrap: 60 },
};

// Solvability bands. The floor is the real gate the plan asks for — nothing may
// be unwinnable at an on-curve deck — and the ceiling catches a fight that has
// stopped being one.
const ROSTER_BANDS: Readonly<Record<string, readonly [number, number]>> = {
  base: [0.8, 1],
  elite: [0.55, 1],
  miniboss: [0.45, 0.99],
  boss: [0.3, 0.98],
};

const rosterModeMain = (runs: number, seed: number, startedAt: number): void => {
  const rows: string[] = [
    "id,tier,sector,archetype,runs,wins,winrate,avgTurns,avgHullLeft",
  ];
  const results: RosterRow[] = [];
  let failures = 0;

  for (const def of ALL_ENEMIES) {
    if (def.env === true) continue;
    const sector = homeSectorOf(def.id);
    const tier = rosterTierOf(def.id);
    const entry = ROSTER_ENTRY[tier] ?? { hullPct: 100, tide: 0, scrap: 20 };
    const hullMax = shipHullMax("wanderer");
    const perTier: RosterRow[] = [];
    for (const archetype of ARCHETYPES) {
      let wins = 0;
      let turns = 0;
      let hullLeft = 0;
      for (let i = 0; i < runs; i += 1) {
        const result = simulateBattle(
          [def.id],
          archetype.deck,
          deriveSeed(seed, `roster:${def.id}:${archetype.name}:${String(i)}`),
          {
            mkLevels: archetype.mkLevels,
            modules: [...archetype.modules],
            sectorHpPct: sectorHpPct({ sector }),
            hull: Math.round((hullMax * entry.hullPct) / 100),
            hullMax,
            runScrap: entry.scrap,
            tide: entry.tide,
          },
        );
        if (result.win) wins += 1;
        turns += result.turns;
        hullLeft += result.hullLeft;
      }
      const row: RosterRow = {
        id: def.id,
        tier,
        sector,
        archetype: archetype.name,
        wins,
        runs,
        turns: turns / runs,
        hullLeft: hullLeft / runs,
      };
      perTier.push(row);
      results.push(row);
      rows.push(
        [
          def.id,
          tier,
          String(sector),
          archetype.name,
          String(runs),
          String(wins),
          (wins / runs).toFixed(3),
          (turns / runs).toFixed(2),
          (hullLeft / runs).toFixed(1),
        ].join(","),
      );
    }
    const total = perTier.reduce((sum, r) => sum + r.wins, 0);
    const totalRuns = perTier.reduce((sum, r) => sum + r.runs, 0);
    const rate = total / Math.max(1, totalRuns);
    const band = ROSTER_BANDS[tier] ?? [0, 1];
    // The harness flies one mid-collection deck at every sector, so sector-1
    // content reads at the ceiling by construction. The floor still applies.
    const ceiling = sector === 1 ? 1 : band[1];
    const ok = rate >= band[0] && rate <= ceiling;
    if (!ok) failures += 1;
    console.log(
      `sim roster: ${def.id.padEnd(18)} ${tier.padEnd(8)} S${String(sector)} ${(rate * 100).toFixed(1)}% (band ${(band[0] * 100).toFixed(0)}-${(band[1] * 100).toFixed(0)}) — ${ok ? "ok" : "OUT OF BAND"}`,
    );
  }

  console.log("\nsim roster: boss-pair fairness (±5pp inside a sector)");
  let unfair = 0;
  for (const def of SECTORS) {
    const rates = def.bossPool.map((id) => {
      const rowsFor = results.filter((r) => r.id === id);
      const wins = rowsFor.reduce((sum, r) => sum + r.wins, 0);
      const total = rowsFor.reduce((sum, r) => sum + r.runs, 0);
      return { id, rate: total === 0 ? 0 : wins / total };
    });
    const spread =
      Math.max(...rates.map((r) => r.rate)) - Math.min(...rates.map((r) => r.rate));
    const ok = spread <= 0.05;
    if (!ok) unfair += 1;
    console.log(
      `  S${String(def.id)} ${rates.map((r) => `${r.id} ${(r.rate * 100).toFixed(1)}%`).join(" vs ")} — spread ${(spread * 100).toFixed(1)}pp ${ok ? "ok" : "UNFAIR"}`,
    );
  }

  const outDir = join(process.cwd(), "sim-out");
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date(startedAt).toISOString().replace(/[:.]/g, "-");
  const outPath = join(outDir, `roster-${stamp}.csv`);
  writeFileSync(outPath, `${rows.join("\n")}\n`, "utf8");
  console.log(
    `sim: wrote ${outPath} in ${String(Date.now() - startedAt)} ms — ${String(failures)} out of band, ${String(unfair)} unfair pair(s)`,
  );
};

// ── Axis mode (R7 Task 1) ────────────────────────────────────────────────────
//
// The question the table answers: after the R7 rebalance, can deck colour still
// out-vote the player's choices? Three policies walk the real event pool through
// the real map generator; drift is settled once per sector and capped for the
// run, exactly as `settleSectorDrift` does at runtime.

type AxisPolicy = "stability" | "resonance" | "greedy";

const optionAxisSum = (option: EventOption): number => {
  const lists = [
    ...(option.outcomes ?? []),
    ...(option.onPass ?? []),
    ...(option.onFail ?? []),
  ];
  if (lists.length === 0) return 0;
  const total = lists.reduce(
    (sum, outcome) =>
      sum +
      outcome.effects.reduce(
        (acc, effect) => (effect.k === "axis" ? acc + effect.n : acc),
        0,
      ),
    0,
  );
  return total / lists.length;
};

// «greedy» is the player who never reads the meter: it takes a uniformly random
// option and lets the axis land where it lands.
const pickByPolicy = (
  def: EventDef,
  policy: AxisPolicy,
  stream: ReturnType<typeof createStream>,
): number => {
  const deltas = def.options.map(optionAxisSum);
  if (policy === "greedy") return stream.pick(deltas);
  const best = policy === "stability" ? Math.max(...deltas) : Math.min(...deltas);
  return policy === "stability" ? Math.max(0, best) : Math.min(0, best);
};

interface AxisRow {
  policy: AxisPolicy;
  finals: number[];
  choiceTotal: number;
  driftTotal: number;
  events: number;
}

const eventNodesFor = (sector: number, seed: number): number => {
  const map = generateSectorMap(
    createStream(deriveSeed(seed, `map:${String(sector)}`)),
    sector,
    { bossAsGate: false, noShops: false },
  );
  return map.nodes.filter(
    (node) => node.type === "event" || node.type === "beacon",
  ).length;
};

const simulateAxisRun = (seed: number, policy: AxisPolicy, row: AxisRow): number => {
  let axis = 0;
  let driftSpent = 0;
  const seen: string[] = [];
  for (let sector = 1; sector <= SECTORS.length; sector += 1) {
    const nodes = eventNodesFor(sector, seed);
    row.events += nodes;
    for (let n = 0; n < nodes; n += 1) {
      const stream = createStream(deriveSeed(seed, `ev:${String(sector)}:${String(n)}`));
      const ctx: EventContext = { sector, axis, flags: {}, seenEvents: seen };
      const kind = n === 0 ? "beacon" : "event";
      const def =
        pickEvent(ALL_EVENTS, ctx, kind, stream) ??
        pickEvent(ALL_EVENTS, ctx, "event", stream);
      if (def === null) continue;
      seen.push(def.id);
      const delta = pickByPolicy(def, policy, stream);
      row.choiceTotal += delta;
      axis = Math.max(-10, Math.min(10, axis + delta));
    }
    // A mono-black deck: nine black dice placed, nothing blue.
    const drift = driftAllowed(sectorDriftDelta(9, 0, 9, 0), driftSpent);
    driftSpent += Math.abs(drift);
    row.driftTotal += drift;
    axis = Math.max(-10, Math.min(10, axis + drift));
  }
  return axis;
};

const axisModeMain = (runs: number, seed: number, startedAt: number): void => {
  const rows: AxisRow[] = (["stability", "resonance", "greedy"] as const).map(
    (policy) => ({ policy, finals: [], choiceTotal: 0, driftTotal: 0, events: 0 }),
  );
  for (const row of rows) {
    for (let i = 0; i < runs; i += 1) {
      row.finals.push(simulateAxisRun(seed + i, row.policy, row));
    }
  }
  console.log(
    `sim: axis — ${String(runs)} runs/policy · drift cap ${String(DRIFT_RUN_CAP)} · mono-black deck throughout`,
  );
  console.log(
    "  policy      mean   min   max   |axis|>=3   choice/run   drift/run",
  );
  const csv = [
    "policy,mean,min,max,reachPct,choicePerRun,driftPerRun",
  ];
  for (const row of rows) {
    const mean = row.finals.reduce((a, b) => a + b, 0) / row.finals.length;
    const min = Math.min(...row.finals);
    const max = Math.max(...row.finals);
    const reach =
      (row.finals.filter((v) => Math.abs(v) >= 3).length / row.finals.length) *
      100;
    const perRun = row.choiceTotal / runs;
    const driftPerRun = row.driftTotal / runs;
    console.log(
      `  ${row.policy.padEnd(11)} ${mean.toFixed(2).padStart(5)} ${String(min).padStart(5)} ${String(max).padStart(5)} ${`${reach.toFixed(0)}%`.padStart(10)} ${perRun.toFixed(2).padStart(12)} ${driftPerRun.toFixed(2).padStart(11)}`,
    );
    csv.push(
      `${row.policy},${mean.toFixed(2)},${String(min)},${String(max)},${reach.toFixed(0)},${perRun.toFixed(2)},${driftPerRun.toFixed(2)}`,
    );
  }
  const outDir = join(process.cwd(), "sim-out");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, `axis-${String(seed)}.csv`);
  writeFileSync(outPath, `${csv.join("\n")}\n`, "utf8");
  console.log(
    `sim: wrote ${outPath} in ${String(Date.now() - startedAt)} ms`,
  );
};

const main = (): void => {
  const startedAt = Date.now();
  const mode = getArg("mode", "battle");
  const defaultRuns =
    mode === "run"
      ? "300"
      : mode === "sweep"
        ? "500"
        : mode === "perks"
          ? "60"
          : mode === "economy"
            ? "200"
            : mode === "roster"
              ? "40"
              : mode === "axis"
                ? "200"
                : "1000";
  const runs = Number(getArg("runs", defaultRuns));
  const seed = Number(getArg("seed", "7"));
  if (!Number.isFinite(runs) || runs <= 0) {
    console.error(`sim: invalid --runs "${getArg("runs", "1000")}"`);
    process.exit(1);
  }
  if (mode === "run") {
    runModeMain(runs, seed, startedAt);
    return;
  }
  if (mode === "drift") {
    driftModeMain(runs, seed, startedAt);
    return;
  }
  if (mode === "gate") {
    gateModeMain(runs, seed, startedAt);
    return;
  }
  if (mode === "sweep") {
    sweepModeMain(runs, seed, startedAt);
    return;
  }
  if (mode === "perks") {
    perkModeMain(runs, seed, startedAt);
    return;
  }
  if (mode === "economy") {
    economyModeMain(runs, seed, startedAt);
    return;
  }
  if (mode === "roster") {
    rosterModeMain(runs, seed, startedAt);
    return;
  }
  if (mode === "axis") {
    axisModeMain(runs, seed, startedAt);
    return;
  }
  battleModeMain(runs, seed, startedAt);
};

main();
