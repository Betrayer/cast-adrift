import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { STARTER_DECK } from "../src/data/decks";
import { ALL_DICE } from "../src/data/dice";
import { PUZZLES, type PuzzleTier } from "../src/data/puzzles";
import { difficultyOf, TIER_BANDS } from "../src/game/puzzles/difficulty";
import { maxAttempts, TIER_STAKES } from "../src/game/puzzles/stakes";
import {
  buildChartPicks,
  MID_COLLECTION_LEVEL,
} from "./simPolicy/chart";
import {
  EXPECTED_DMG_PER_FIGHT,
  FIGHT_TYPES,
  fightsUntilRest,
  greedyNext,
  ridesWormhole,
  type RouteState,
} from "./simPolicy/map";
import { bypassTargetFor, rollThrow } from "../src/game/map/wormhole";
import { holeTollFor } from "../src/game/run/motifs";
import {
  applyEdgeMotifs,
  applyEffectsToState,
  applyNodeMotifs,
  createRunState,
  emptyPuzzleTally,
  emptySinks,
  gain,
  greedyShipyard,
  greedyShop,
  maxMk,
  maxRealSchoolCount,
  runAnomaly,
  runDraft,
  runEvent,
  takeDie,
  type PuzzleTally,
  type RunState,
} from "./simPolicy/state";
import { ENGRAVINGS } from "../src/data/engravings";
import {
  ENCOUNTER_DISCOUNT_PCT,
  FIRST_FIND_SHARDS,
  META_DIE_PRICE,
} from "../src/data/metaShop";
import { PLAYABLE_SHIPS, type ShipId } from "../src/data/ships";
import { THEMES } from "../src/data/themes";
import { RESPEC_SHARD_COST } from "../src/game/chart/engine";
import { nudgeChargeCost } from "../src/game/battle/resolver";
import { computeMutatorMods } from "../src/data/mutators";
import { runHasTrait } from "../src/game/run/runMods";
import {
  bossFirstKillShards,
  levelFromTotalXp,
  MAX_LEVEL,
  runXp,
  shardBreakdown,
  totalXpForLevel,
} from "../src/game/xp";
import {
  ALL_ENEMIES,
  ENEMY_BY_ID,
  expandEncounterIds,
  isEncounterGroup,
} from "../src/data/enemies";
import {
  DECK_CAP,
  MINIBOSS_PACKAGE_SCRAP,
} from "../src/game/economy/prices";
import {
  computeNodeReward,
  dieForRarity,
  isDraftNode,
} from "../src/game/economy/rewards";
import { SECTORS } from "../src/data/sectors";
import {
  bossNodeIdFor,
  generateSectorMap,
  START_NODE_ID,
} from "../src/game/map/generator";
import { nodeById, type MapGraph, type MapNode } from "../src/game/map/types";
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
  sectorDmgPct,
  sectorHpPct,
} from "../src/game/run/encounter";
import { computePerkMods } from "../src/game/run/perkMods";
import { computeRunMods, runChargeCap } from "../src/game/run/runMods";
import { ascensionMods } from "../src/data/ascension";
import { moduleSlots } from "../src/data/modules";
import { ALL_PERKS } from "../src/data/perks";
import type { PerkPool } from "../src/data/perks/types";
import { PERK_DRAFT_SIZE } from "../src/game/run/perkDraft";
import { decideDraft } from "./simPolicy/draft";
import { schoolOf } from "./simPolicy/state";
import { rollModule } from "../src/game/economy/rewards";
import { shipHullMax } from "../src/game/battle/setup";
import type { MkLevels } from "../src/stores/runStore";
import {
  createStream,
  createStreams,
  deriveSeed,
  type RngStream,
} from "../src/services/rng";
import type { BattleSnapshot, SlotId } from "../src/types/battle";
import type { EventDef, EventOption } from "../src/types/events";
import { ALL_EVENTS } from "../src/data/events";
import { pickEvent, type EventContext } from "../src/game/events/engine";
import {
  driftAllowed,
  sectorDriftDelta,
  DRIFT_RUN_CAP,
} from "../src/game/run/axis";

const TURN_CAP = 30;

interface BattleInit {
  shipId?: ShipId;
  hull?: number;
  hullMax?: number;
  runScrap?: number;
  tide?: number;
  interference?: number;
  mkLevels?: MkLevels;
  perks?: readonly string[];
  chartPicks?: readonly string[];
  modules?: readonly string[];
  mutators?: readonly string[];
  sectorHpPct?: number;
  sectorDmgPct?: number;
  enemyHpBonusPct?: number;
  eliteShield?: number;
  ascension?: number;
  inverted?: boolean;
  nodeStorm?: boolean;
}

interface BattleResult {
  win: boolean;
  timeout: boolean;
  turns: number;
  hullLeft: number;
  kills: number;
  dealt: number;
  taken: number;
  turnsPlayed: number;
  sensorTurns: number;
  engineTurns: number;
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

const SURGE = 10;

const overflows = (snapshot: BattleSnapshot, uid: string): boolean => {
  const die = snapshot.dice.find((d) => d.uid === uid);
  if (die === undefined) return false;
  const mult = die.school === "black" || die.school === "prismatic" ? 1.5 : 1;
  return snapshot.charge + Math.floor(die.value * mult) > snapshot.chargeCap;
};

const spendCharge = (snapshot: BattleSnapshot, init: BattleInit): void => {
  const cost = nudgeChargeCost(
    computeRunMods(init.perks ?? [], init.chartPicks ?? [], init.modules ?? [])
      .nudgeCostDelta + computeMutatorMods(init.mutators ?? []).nudgeCostDelta,
    runHasTrait(
      init.perks ?? [],
      init.chartPicks ?? [],
      "coldLogic",
      init.modules ?? [],
    ),
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
    init.shipId ?? "wanderer",
    deck,
    enemyIds,
    streams,
    enemyStream,
    init.mkLevels ?? {},
    {
      tide: init.tide,
      interference: init.interference,
      perks: init.perks,
      chartPicks: init.chartPicks,
      modules: init.modules,
      hull: init.hull,
      hullMax: init.hullMax,
      runScrap: init.runScrap,
      chargeCap: runChargeCap(
        init.perks ?? [],
        init.chartPicks ?? [],
        init.modules ?? [],
      ),
      sectorHpPct: init.sectorHpPct,
      sectorDmgPct: init.sectorDmgPct,
      enemyHpBonusPct: init.enemyHpBonusPct,
      eliteShield: init.eliteShield,
      ascension: init.ascension,
      inverted: init.inverted,
      nodeStorm: init.nodeStorm,
    },
  );
  let dealt = 0;
  let taken = 0;
  let turnsPlayed = 0;
  let sensorTurns = 0;
  let engineTurns = 0;

  for (let round = 0; round < TURN_CAP; round += 1) {
    const rerollUids = decideReroll(snapshot);
    if (rerollUids.length > 0) {
      snapshot.dice = snapshot.dice.map((d) =>
        rerollUids.includes(d.uid) && d.state === "tray"
          ? { ...d, value: streams.dice.int(1, d.tier) }
          : d,
      );
      for (const live of snapshot.enemies) {
        if (live.hp <= 0) continue;
        if (ENEMY_BY_ID.get(live.defId)?.feedsOnReroll !== true) continue;
        live.statuses = { ...live.statuses, charge: 1 };
      }
    }
    const decision = decidePlacements(snapshot);
    if (decision.targetId !== null) snapshot.targetId = decision.targetId;
    for (const placement of decision.placements) {
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

    turnsPlayed += 1;
    if (snapshot.slots.sensors?.dieUid !== undefined) sensorTurns += 1;
    if (snapshot.slots.engines?.dieUid !== undefined) engineTurns += 1;

    const player = resolvePlayerPhase(snapshot, streams.dice);
    dealt += player.beats
      .filter((b) => b.kind === "damage")
      .reduce((sum, b) => sum + b.amount, 0);
    snapshot = player.next;
    if (snapshot.outcome !== undefined) break;

    const enemy = resolveEnemyPhase(snapshot, enemyStream, streams.defense);
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
    turnsPlayed,
    sensorTurns,
    engineTurns,
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

interface SectorResult {
  win: boolean;
  deathRow: number;
  nodes: number;
  fights: number;
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

interface WalkOptions {
  sector: number;
  seed: number;
  ns: string;
  tideCap: number;
  scrapMult: number;
  ascension: number;
  enemyHpBonusPct: number;
  eliteShield: number;
  bossAsGate: boolean;
  stopRow: number;
  rollModules: boolean;
  guard: number;
  noDraft?: boolean;
  wormholes?: WormholeTally;
}

interface WalkResult {
  cleared: boolean;
  deathRow: number;
  rows: number;
  hullEntering: number[];
}

const resolveWormhole = (
  state: RunState,
  sector: number,
  map: MapGraph,
  byId: ReadonlyMap<string, MapNode>,
  from: string,
  hole: MapNode,
  visited: readonly string[],
  route: RouteState,
  stream: RngStream,
  tally: WormholeTally,
  tideCap: number,
): MapNode | undefined => {
  const rides = tally.rides;
  if (ridesWormhole(route, stream.next())) {
    const roll = rollThrow(
      { map, from, hole: hole.id, visited, rides },
      stream,
    );
    const landing = roll.landing === null ? undefined : byId.get(roll.landing);
    if (landing !== undefined) {
      tally.rides += 1;
      tally.rowsMoved += Math.abs(roll.rows);
      if (roll.rows < 0) tally.backward += 1;
      if (roll.fallback !== "none") tally.fallbacks += 1;
      return landing;
    }
  }
  const target = bypassTargetFor(map, from, hole.id, visited);
  const node = target === null ? undefined : byId.get(target);
  if (node === undefined) return undefined;
  const toll = holeTollFor(sector, state.hull);
  if (toll > 0) {
    applyEffectsToState(state, [{ k: "hull", n: -toll }], tideCap);
    tally.tollPaid += toll;
  }
  tally.bypasses += 1;
  return node;
};

const nsKey = (ns: string, prefix: string, id: string): string =>
  ns === "" ? `${prefix}:${id}` : `${prefix}:${ns}:${id}`;

export interface WormholeTally {
  rides: number;
  bypasses: number;
  backward: number;
  fallbacks: number;
  rowsMoved: number;
  tollPaid: number;
}

export const emptyWormholeTally = (): WormholeTally => ({
  rides: 0,
  bypasses: 0,
  backward: 0,
  fallbacks: 0,
  rowsMoved: 0,
  tollPaid: 0,
});

const walkSector = (state: RunState, opts: WalkOptions): WalkResult => {
  const { seed, sector, ns } = opts;
  const streams =
    ns === "" ? createStreams(seed) : createStreams(deriveSeed(seed, `map:${ns}`));
  const map: MapGraph = generateSectorMap(streams.map, sector, {
    bossAsGate: opts.bossAsGate,
  });
  const bossId = bossNodeIdFor(sector);
  const byId = nodeById(map);
  const hullEntering: number[] = [];
  const visited: string[] = [START_NODE_ID];
  const chaosStream = createStream(deriveSeed(seed, `chaos:${ns}:${String(sector)}`));
  const tally = opts.wormholes ?? emptyWormholeTally();
  let position = START_NODE_ID;
  let posRow = 0;

  const route = (): RouteState => ({
    hullPct: (state.hull / Math.max(1, state.hullMax)) * 100,
    anomalyStreak: state.anomalyStreak,
    scrap: state.scrap,
    wormholeRides: tally.rides,
  });

  const stop = (cleared: boolean, deathRow: number): WalkResult => ({
    cleared,
    deathRow,
    rows: posRow,
    hullEntering,
  });

  for (let guard = 0; guard < opts.guard; guard += 1) {
    if (position === bossId) break;
    const step = greedyNext(map, byId, position, posRow, route());
    if (step === undefined) break;
    let next = step;
    if (step.hole === true) {
      const resolved = resolveWormhole(
        state,
        sector,
        map,
        byId,
        position,
        step,
        visited,
        route(),
        chaosStream,
        tally,
        opts.tideCap,
      );
      if (resolved === undefined) break;
      next = resolved;
    } else {
      applyEdgeMotifs(state, sector, map, position, next.id, opts.tideCap);
    }
    position = next.id;
    posRow = next.row;
    visited.push(next.id);
    if (next.pocket === true) state.pockets += 1;
    applyNodeMotifs(state, sector, next, opts.tideCap);
    state.jumpsSinceTide += 1;
    if (state.jumpsSinceTide >= 4) {
      state.tide = Math.min(opts.tideCap, state.tide + 1);
      state.jumpsSinceTide = 0;
    }

    const type = next.type;
    if (FIGHT_TYPES.has(type)) {
      hullEntering.push(state.hull);
      const encStream = createStream(deriveSeed(seed, nsKey(ns, "enc", next.id)));
      const enemyIds = buildEncounterIds(type, encStream, { sector, seed });
      const res = simulateBattle(
        enemyIds,
        state.deck,
        deriveSeed(seed, nsKey(ns, "node", next.id)),
        {
          shipId: state.shipId,
          hull: state.hull,
          hullMax: state.hullMax,
          runScrap: state.scrap,
          tide: state.tide,
          interference: state.interference,
          mkLevels: state.mkLevels,
          perks: state.perks,
          chartPicks: state.chartPicks,
          modules: state.modules,
          sectorHpPct: sectorHpPct({ sector, pocket: next.pocket === true }),
          sectorDmgPct: sectorDmgPct({ sector }),
          enemyHpBonusPct: opts.enemyHpBonusPct,
          eliteShield: opts.eliteShield,
          ascension: opts.ascension,
          inverted: next.inverted === true,
          nodeStorm: next.storm === true,
        },
      );
      state.hull = res.hullLeft;
      state.takenBySector[sector] = (state.takenBySector[sector] ?? 0) + res.taken;
      state.fightsBySector[sector] = (state.fightsBySector[sector] ?? 0) + 1;
      state.kills += res.kills;
      if (!res.win) return stop(false, next.row);
      state.nodes += 1;
      state.fights += 1;
      const loot = createStream(deriveSeed(seed, nsKey(ns, "loot", next.id)));
      const reward = computeNodeReward(type, loot, 0, next.pocket === true);
      const mods = computeRunMods(state.perks, state.chartPicks, state.modules);
      gain(
        state,
        Math.round(reward.scrap * opts.scrapMult * (1 + mods.scrapMultPct / 100)),
      );
      state.hull = Math.min(state.hullMax, state.hull + mods.battleEndHeal);
      if (type === "miniboss") {
        gain(
          state,
          loot.int(MINIBOSS_PACKAGE_SCRAP[0], MINIBOSS_PACKAGE_SCRAP[1]),
        );
        const dieChoice = dieForRarity(loot, "rare", 0);
        const moduleChoice = rollModule(loot, state.modules, "uncommon");
        const bayFree =
          state.modules.length < moduleSlots(mods.moduleSlotDelta);
        if (opts.rollModules && bayFree) state.modules.push(moduleChoice);
        else takeDie(state, dieChoice);
        state.vouchers += 1;
      } else {
        if (reward.dieDrop !== null) takeDie(state, reward.dieDrop);
        if (opts.rollModules && type === "elite") {
          const moduleId = rollModule(loot, state.modules, "common");
          if (state.modules.length < moduleSlots(mods.moduleSlotDelta)) {
            state.modules.push(moduleId);
          }
        }
      }
      if (isDraftNode(type) && opts.noDraft !== true) {
        runDraft(state, sector, loot);
      }
      if (type === "boss") return stop(true, -1);
      if (opts.stopRow > 0 && posRow >= opts.stopRow) return stop(true, -1);
    } else if (type === "anomaly") {
      runAnomaly(state, sector, next, deriveSeed(seed, `anomaly:${ns}`));
      state.nodes += 1;
    } else if (type === "beacon") {
      runEvent(
        state,
        sector,
        "beacon",
        deriveSeed(seed, nsKey(ns, "beaconEvent", next.id)),
        opts.tideCap,
      );
      if (opts.noDraft !== true) {
        runDraft(
          state,
          sector,
          createStream(deriveSeed(seed, nsKey(ns, "beacon", next.id))),
        );
      }
      state.nodes += 1;
    } else if (type === "event") {
      const follow = runEvent(
        state,
        sector,
        "event",
        deriveSeed(seed, nsKey(ns, "event", next.id)),
        opts.tideCap,
      );
      if (follow !== null) {
        const res = simulateBattle(
          [...follow.enemyIds],
          state.deck,
          deriveSeed(seed, nsKey(ns, "eventFight", next.id)),
          {
            shipId: state.shipId,
            hull: state.hull,
            hullMax: state.hullMax,
            runScrap: state.scrap,
            tide: state.tide,
            interference: state.interference,
            mkLevels: state.mkLevels,
            perks: state.perks,
            chartPicks: state.chartPicks,
            modules: state.modules,
            sectorHpPct: sectorHpPct({ sector }),
            sectorDmgPct: sectorDmgPct({ sector }),
            enemyHpBonusPct: opts.enemyHpBonusPct,
            eliteShield: opts.eliteShield,
            ascension: opts.ascension,
          },
        );
        state.hull = res.hullLeft;
        state.takenBySector[sector] =
          (state.takenBySector[sector] ?? 0) + res.taken;
        state.fightsBySector[sector] =
          (state.fightsBySector[sector] ?? 0) + 1;
        state.kills += res.kills;
        if (!res.win) return stop(false, next.row);
        state.fights += 1;
        if (follow.scrap !== undefined) gain(state, follow.scrap);
      }
      state.nodes += 1;
    } else if (type === "shop") {
      greedyShop(state, ns === "" ? seed : deriveSeed(seed, `shop:${ns}`), next);
      state.nodes += 1;
    } else if (type === "shipyard") {
      const forecast =
        fightsUntilRest(map, byId, next.id, next.row, route()) *
        EXPECTED_DMG_PER_FIGHT;
      greedyShipyard(state, forecast > state.hull * 0.6);
      state.nodes += 1;
    } else {
      state.nodes += 1;
    }
  }
  return stop(position === bossId, -1);
};

const sectorResultOf = (
  state: RunState,
  walk: WalkResult,
): SectorResult => ({
  win: walk.cleared,
  deathRow: walk.deathRow,
  nodes: state.nodes,
  fights: state.fights,
  kills: state.kills,
  scrapEarned: state.scrapEarned,
  scrapSpent: state.scrapSpent,
  scrapUnspent: state.scrap,
  hullMin:
    walk.hullEntering.length > 0 ? Math.min(...walk.hullEntering) : state.hull,
  hullMedian: median(
    walk.hullEntering.length > 0 ? walk.hullEntering : [state.hull],
  ),
  resonanceSet: maxRealSchoolCount(state.deck) >= 4,
  mkReached: maxMk(state.mkLevels),
  pockets: state.pockets,
});

const runSector = (seed: number): SectorResult => {
  const state = createRunState({ hull: 30, hullMax: 30, deck: STARTER_DECK });
  const walk = walkSector(state, {
    sector: 1,
    seed,
    ns: "",
    tideCap: 3,
    scrapMult: 1,
    ascension: 0,
    enemyHpBonusPct: 0,
    eliteShield: 0,
    bossAsGate: false,
    stopRow: 0,
    rollModules: false,
    guard: 64,
  });
  return sectorResultOf(state, walk);
};

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
  const sector = Math.min(SECTORS.length, sectorIndex);
  const walk = walkSector(state, {
    sector,
    seed,
    ns: String(sectorIndex),
    tideCap: DRIFT_TIDE_CAP,
    scrapMult: SECTORS.find((s2) => s2.id === sector)?.scrapMult ?? 1,
    ascension: 0,
    enemyHpBonusPct:
      DRIFT_LOOP_HP_PCT * Math.max(0, sectorIndex - SECTORS.length),
    eliteShield: 0,
    bossAsGate: true,
    stopRow: sectorDepth(sectorIndex),
    rollModules: false,
    guard: 64,
  });
  return { cleared: walk.cleared, rows: walk.rows };
};

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
  const state = createRunState({
    hull: 30,
    hullMax: 30,
    deck: mid ? DRIFT_MID_DECK : STARTER_DECK,
    mkLevels: mid ? { ...DRIFT_MID_MK } : {},
  });

  let sectorIndex = 1;
  let depth = 0;
  for (; sectorIndex <= 40; sectorIndex += 1) {
    const { cleared, rows } = driftSector(state, seed, sectorIndex);
    depth = depthFor(sectorIndex, rows);
    if (!cleared) break;
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
    const turnsPlayed = results.reduce((sum, r) => sum + r.turnsPlayed, 0);
    const sensorShare =
      turnsPlayed === 0
        ? 0
        : results.reduce((sum, r) => sum + r.sensorTurns, 0) / turnsPlayed;
    const engineShare =
      turnsPlayed === 0
        ? 0
        : results.reduce((sum, r) => sum + r.engineTurns, 0) / turnsPlayed;
    console.log(
      `sim: ${key} — winrate ${(winrate * 100).toFixed(1)}% · avgTurns ${avgTurns.toFixed(1)} · avgHullLeft(wins) ${avgHullLeftWins.toFixed(1)} · timeouts ${String(timeouts)}`,
    );
    console.log(
      `sim: ${key} — slot use: sensors ${(sensorShare * 100).toFixed(0)}% · engines ${(engineShare * 100).toFixed(0)}% of played turns`,
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

interface GateProfile {
  sector: number;
  deck: readonly string[];
  mkLevels: MkLevels;
  hull: number;
  tide: number;
  scrap: number;
}

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
              sectorDmgPct: sectorDmgPct({ sector: profile.sector }),
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

interface Archetype {
  name: string;
  deck: readonly string[];
  mkLevels: MkLevels;
  modules: readonly string[];
}

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
    name: "blue-wall",
    deck: [
      "blue-d6", "frostplate", "bulwark", "aegis",
      "red-d6", "red-d6", "ember", "slug", "fused-emberforge",
    ],
    mkLevels: { weaponA: 3, shields: 3, engines: 2, reactor: 2 },
    modules: ["ablativeWeave", "dampingCoil"],
  },
  {
    name: "black-edge",
    deck: [
      "black-d6", "ashen", "pitch", "eclipse", "voidmaw",
      "red-d6", "ember", "slug", "fused-emberforge",
    ],
    mkLevels: { weaponA: 3, weaponB: 2, shields: 2, reactor: 3 },
    modules: ["blackLedger", "heatsink"],
  },
];

const MID_COLLECTION_PICKS: readonly string[] = buildChartPicks(
  MID_COLLECTION_LEVEL,
);

interface SweepOptions {
  sector: number;
  ascension: number;
  archetype: Archetype;
  shipId?: ShipId;
  forcedPerk?: string;
  noDraft?: boolean;
  perks?: readonly string[];
  chartPicks?: readonly string[];
  deckExtra?: readonly string[];
  mkLevels?: MkLevels;
}

const sweepState = (opts: SweepOptions): RunState => {
  const aMods = ascensionMods(opts.ascension);
  const shipId = opts.shipId ?? "wanderer";
  const carried =
    opts.forcedPerk !== undefined ? [opts.forcedPerk] : [...(opts.perks ?? [])];
  const hullMax = Math.max(
    1,
    Math.round(shipHullMax(shipId) * (1 + aMods.hullPct / 100)) +
      computePerkMods(carried).hullMaxDelta,
  );
  return createRunState({
    shipId,
    hull: hullMax,
    hullMax,
    deck: [...opts.archetype.deck, ...(opts.deckExtra ?? [])].slice(0, DECK_CAP),
    mkLevels: { ...opts.archetype.mkLevels, ...(opts.mkLevels ?? {}) },
    perks: carried,
    modules: [...opts.archetype.modules],
    chartPicks: [...(opts.chartPicks ?? [])],
  });
};

const sweepWalkOptions = (opts: SweepOptions): WalkOptions => {
  const aMods = ascensionMods(opts.ascension);
  return {
    sector: opts.sector,
    seed: 0,
    ns: "",
    tideCap:
      (SECTORS.find((sd) => sd.id === opts.sector)?.tideCap ?? 3) +
      aMods.tideCapDelta,
    scrapMult: SECTORS.find((sd) => sd.id === opts.sector)?.scrapMult ?? 1,
    ascension: opts.ascension,
    enemyHpBonusPct: aMods.enemyHpPct,
    eliteShield: aMods.eliteShield,
    bossAsGate: false,
    stopRow: 0,
    rollModules: true,
    guard: 64,
    noDraft: opts.noDraft === true,
  };
};

const runSweepSectorWithState = (
  seed: number,
  opts: SweepOptions,
): { result: SectorResult; state: RunState } => {
  const state = sweepState(opts);
  const walk = walkSector(state, { ...sweepWalkOptions(opts), seed });
  return { result: sectorResultOf(state, walk), state };
};

const runSweepSector = (seed: number, opts: SweepOptions): SectorResult =>
  runSweepSectorWithState(seed, opts).result;

const SWEEP_ASCENSIONS: readonly number[] = [0, 3, 6];

const LADDER_GAP_PP = 18;

const LADDER_LAST_CHECKED_ACT = 5;

const LADDER_DECKS: readonly Archetype[] = ARCHETYPES.filter(
  (a) => a.name !== "black-edge",
);

const ladderWinrate = (
  sector: number,
  runs: number,
  seed: number,
  build: Pick<SweepOptions, "chartPicks">,
): number => {
  const results: SectorResult[] = [];
  for (const archetype of LADDER_DECKS) {
    for (let i = 0; i < runs; i += 1) {
      results.push(
        runSweepSector(
          deriveSeed(
            seed,
            `sweep:${String(sector)}:${archetype.name}:${String(i)}`,
          ),
          { sector, ascension: 0, archetype, ...build },
        ),
      );
    }
  }
  return results.filter((r) => r.win).length / Math.max(1, results.length);
};

const sweepModeMain = (runs: number, seed: number, startedAt: number): void => {
  const rows: string[] = [
    "sector,ascension,deck,runs,winrate,avgNodes,avgKills,avgScrapEarned,avgScrapSpent,avgHullMedian,avgMk,avgPockets",
  ];
  console.log(
    `sim sweep: ${String(SECTORS.length)} sectors x ${String(SWEEP_ASCENSIONS.length)} ascensions x ${String(ARCHETYPES.length)} decks x ${String(runs)} runs`,
  );
  const coldLadder = new Map<number, number[]>();
  for (const sector of SECTORS.map((def) => def.id)) {
    for (const ascension of SWEEP_ASCENSIONS) {
      for (const archetype of ARCHETYPES) {
        const results: SectorResult[] = [];
        for (let i = 0; i < runs; i += 1) {
          results.push(
            runSweepSector(
              deriveSeed(
                seed,
                `sweep:${String(sector)}:${archetype.name}:${String(i)}`,
              ),
              { sector, ascension, archetype },
            ),
          );
        }
        const n = Math.max(1, results.length);
        const avg = (f: (r: SectorResult) => number): number =>
          results.reduce((sum, r) => sum + f(r), 0) / n;
        const winrate = results.filter((r) => r.win).length / n;
        if (ascension === 0 && archetype.name !== "black-edge") {
          const cell = coldLadder.get(sector) ?? [];
          cell.push(winrate);
          coldLadder.set(sector, cell);
        }
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
  console.log(
    "\nsim sweep: intrinsic difficulty ladder (A0, red+blue, mid-collection chart picks)",
  );
  console.log(
    `  the cold column is printed as diagnostics and never checked; the rule holds over S1-S${String(LADDER_LAST_CHECKED_ACT)}.`,
  );
  rows.push("");
  rows.push("sector,coldWinrate,midWinrate,gapToPreviousPp,verdict");
  let cliffs = 0;
  let rises = 0;
  let previous: number | null = null;
  for (const sector of SECTORS.map((def) => def.id)) {
    const cold = coldLadder.get(sector) ?? [];
    const coldMean =
      cold.reduce((sum, v) => sum + v, 0) / Math.max(1, cold.length);
    const mean = ladderWinrate(sector, runs, seed, {
      chartPicks: MID_COLLECTION_PICKS,
    });
    const checked = sector <= LADDER_LAST_CHECKED_ACT;
    const gap = previous === null ? 0 : (mean - previous) * 100;
    const cliff = checked && previous !== null && Math.abs(gap) > LADDER_GAP_PP;
    const rise = checked && previous !== null && gap > 0;
    if (cliff) cliffs += 1;
    if (rise) rises += 1;
    console.log(
      `  S${String(sector)} ${(mean * 100).toFixed(1).padStart(6)}% (cold ${(coldMean * 100).toFixed(1)}%)${previous === null ? "" : `  gap ${gap >= 0 ? "+" : ""}${gap.toFixed(1)}pp${cliff ? " CLIFF" : ""}${rise ? " EASIER THAN THE ACT BEFORE" : ""}${checked ? "" : " exempt"}`}`,
    );
    rows.push(
      `${String(sector)},${coldMean.toFixed(3)},${mean.toFixed(3)},${gap.toFixed(1)},${cliff ? "CLIFF" : rise ? "RISE" : checked ? "ok" : "exempt"}`,
    );
    if (checked) previous = mean;
  }
  console.log(
    `  ${String(cliffs)} gap(s) over ${String(LADDER_GAP_PP)}pp | ${String(rises)} act(s) easier than the one before`,
  );

  const outDir = join(process.cwd(), "sim-out");
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date(startedAt).toISOString().replace(/[:.]/g, "-");
  const outPath = join(outDir, `sweep-${stamp}.csv`);
  writeFileSync(outPath, `${rows.join("\n")}\n`, "utf8");
  console.log(`sim: wrote ${outPath} in ${String(Date.now() - startedAt)} ms`);
  if (cliffs > 0 || rises > 0) process.exitCode = 1;
};

interface LadderCell {
  label: string;
  winrate: number;
  avgNodes: number;
  avgFights: number;
  avgKills: number;
  hullMedian: number;
  resonancePct: number;
  deathRows: Map<number, number>;
  deathsAtGate: number;
  deathsAtBoss: number;
}

const ladderCell = (
  label: string,
  runs: number,
  seed: number,
  sector: number,
  build: Pick<SweepOptions, "perks" | "chartPicks">,
): LadderCell => {
  const shape = SECTORS.find((def) => def.id === sector)?.shape;
  const results: SectorResult[] = [];
  for (const archetype of LADDER_DECKS) {
    for (let i = 0; i < runs; i += 1) {
      results.push(
        runSweepSector(
          deriveSeed(
            seed,
            `sweep:${String(sector)}:${archetype.name}:${String(i)}`,
          ),
          { sector, ascension: 0, archetype, ...build },
        ),
      );
    }
  }
  const n = Math.max(1, results.length);
  const avg = (f: (r: SectorResult) => number): number =>
    results.reduce((sum, r) => sum + f(r), 0) / n;
  const deathRows = new Map<number, number>();
  let deathsAtGate = 0;
  let deathsAtBoss = 0;
  for (const r of results) {
    if (r.win || r.deathRow < 0) continue;
    deathRows.set(r.deathRow, (deathRows.get(r.deathRow) ?? 0) + 1);
    if (r.deathRow === shape?.gateRow) deathsAtGate += 1;
    if (r.deathRow === shape?.bossRow) deathsAtBoss += 1;
  }
  return {
    label,
    winrate: results.filter((r) => r.win).length / n,
    avgNodes: avg((r) => r.nodes),
    avgFights: avg((r) => r.fights),
    avgKills: avg((r) => r.kills),
    hullMedian: avg((r) => r.hullMedian),
    resonancePct: (results.filter((r) => r.resonanceSet).length / n) * 100,
    deathRows,
    deathsAtGate,
    deathsAtBoss,
  };
};

const printLadderCell = (
  cell: LadderCell,
  target: number | null,
): void => {
  const hist = [...cell.deathRows.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([row, count]) => `r${String(row)}:${String(count)}`)
    .join(" ");
  const delta = target === null ? 0 : cell.winrate * 100 - target;
  const out = target !== null && Math.abs(delta) > LADDER_BAND_PP;
  console.log(
    `    ${cell.label.padEnd(22)} winrate ${(cell.winrate * 100).toFixed(1).padStart(5)}%${target === null ? " · unchecked" : ` · target ${target.toFixed(0).padStart(3)} (${delta >= 0 ? "+" : ""}${delta.toFixed(1)}pp)${out ? " OUT OF BAND" : " ok"}`}`,
  );
  console.log(
    `      nodes ${cell.avgNodes.toFixed(1)} · fights ${cell.avgFights.toFixed(1)} · kills ${cell.avgKills.toFixed(1)} · hull(med) ${cell.hullMedian.toFixed(1)} · set ${cell.resonancePct.toFixed(0)}% · deaths gate ${String(cell.deathsAtGate)} · boss ${String(cell.deathsAtBoss)} · ${hist === "" ? "none" : hist}`,
  );
};

const LADDER_PERK_POOLS: readonly PerkPool[] = [
  "red",
  "blue",
  "green",
  "yellow",
  "black",
  "grey",
];

const LADDER_PERK_SAMPLE: readonly string[] = LADDER_PERK_POOLS.map(
  (pool) =>
    ALL_PERKS.find((perk) => perk.pool === pool && perk.rarity === "common")
      ?.id ?? "",
).filter((id) => id !== "");

interface LadderBand {
  sector: number;
  mid: number;
  perks: number;
}

const LADDER_BANDS: readonly LadderBand[] = [
  { sector: 1, mid: 98, perks: 99 },
  { sector: 2, mid: 84, perks: 90 },
  { sector: 3, mid: 70, perks: 78 },
  { sector: 4, mid: 58, perks: 66 },
  { sector: 5, mid: 48, perks: 56 },
  { sector: 6, mid: 36, perks: 44 },
];

const LADDER_BAND_PP = 5;

const ladderModeMain = (runs: number, seed: number, startedAt: number): void => {
  const only = Number(getArg("sector", "0"));
  console.log(
    `sim ladder: the difficulty contract — A0, red+blue, ${String(runs)} runs per deck per act`,
  );
  console.log(
    `  the two equipped columns carry the bands (±${String(LADDER_BAND_PP)}pp); the cold column is printed diagnostics.`,
  );
  console.log(
    "  each act is measured three ways to separate act scaling from build strength.",
  );
  const rows: string[] = [
    "sector,build,winrate,target,deltaPp,checked,nodes,fights,kills,hullMedian",
  ];
  let out = 0;
  for (const sector of SECTORS.map((def) => def.id)) {
    if (only > 0 && sector !== only) continue;
    const band = LADDER_BANDS.find((b) => b.sector === sector);
    console.log(`  S${String(sector)}`);
    const builds: readonly {
      label: string;
      target: number | null;
      build: Pick<SweepOptions, "perks" | "chartPicks">;
    }[] = [
      { label: "cold (diagnostics)", target: null, build: {} },
      {
        label: "mid-collection",
        target: band?.mid ?? null,
        build: { chartPicks: MID_COLLECTION_PICKS },
      },
      {
        label: "+ picks + 6 perks",
        target: band?.perks ?? null,
        build: {
          chartPicks: MID_COLLECTION_PICKS,
          perks: LADDER_PERK_SAMPLE,
        },
      },
    ];
    for (const entry of builds) {
      const cell = ladderCell(entry.label, runs, seed, sector, entry.build);
      printLadderCell(cell, entry.target);
      const delta =
        entry.target === null ? 0 : cell.winrate * 100 - entry.target;
      if (entry.target !== null && Math.abs(delta) > LADDER_BAND_PP) out += 1;
      rows.push(
        [
          String(sector),
          entry.label,
          cell.winrate.toFixed(3),
          entry.target === null ? "" : entry.target.toFixed(0),
          entry.target === null ? "" : delta.toFixed(1),
          entry.target === null ? "no" : "yes",
          cell.avgNodes.toFixed(2),
          cell.avgFights.toFixed(2),
          cell.avgKills.toFixed(2),
          cell.hullMedian.toFixed(1),
        ].join(","),
      );
    }
  }
  console.log(
    `  ${String(out)} of ${String(LADDER_BANDS.length * 2)} checked cell(s) outside ±${String(LADDER_BAND_PP)}pp`,
  );
  const outDir = join(process.cwd(), "sim-out");
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date(startedAt).toISOString().replace(/[:.]/g, "-");
  const outPath = join(outDir, `ladder-${stamp}.csv`);
  writeFileSync(outPath, `${rows.join("\n")}\n`, "utf8");
  console.log(`sim: wrote ${outPath} in ${String(Date.now() - startedAt)} ms`);
  if (out > 0) process.exitCode = 1;
};

const DEAD_PERK_LINE = -8;
const DOMINANT_PICK_PCT = 60;
const PICK_TRIALS = 120;
const DOMINANT_EDGE_PP = 8;

const perkModeMain = (runs: number, seed: number, startedAt: number): void => {
  const archetype = ARCHETYPES[0];
  if (archetype === undefined) return;
  const sector = Number(getArg("sector", "2"));
  const baseline = (forcedPerk?: string): number => {
    let wins = 0;
    for (let i = 0; i < runs; i += 1) {
      const res = runSweepSector(
        deriveSeed(seed, `perk:${String(sector)}:${String(i)}`),
        { sector, ascension: 0, archetype, forcedPerk, noDraft: true },
      );
      if (res.win) wins += 1;
    }
    return wins / Math.max(1, runs);
  };

  const pickBudget = { scrap: 0, sector, banishLeft: 0, rerollLeft: 0 };
  const pickStream = createStream(deriveSeed(seed, "pickRate"));
  const pickRates = new Map<string, number>();
  for (const perk of ALL_PERKS) {
    const peers = ALL_PERKS.filter(
      (d) => d.id !== perk.id && d.rarity === perk.rarity,
    ).map((d) => d.id);
    let taken = 0;
    let trials = 0;
    for (const build of ARCHETYPES) {
      const pickLoadout = {
        deckDefIds: build.deck,
        perks: [] as string[],
        modules: build.modules,
      };
      for (let i = 0; i < PICK_TRIALS; i += 1) {
        const others = pickStream.shuffle(peers).slice(0, PERK_DRAFT_SIZE - 1);
        const offer = pickStream.shuffle([perk.id, ...others]);
        trials += 1;
        if (
          decideDraft(offer, pickLoadout, pickBudget, schoolOf).pick === perk.id
        ) {
          taken += 1;
        }
      }
    }
    pickRates.set(perk.id, taken / Math.max(1, trials));
  }
  const base = baseline();
  const rows: string[] = [
    "perk,pool,rarity,tags,synergy,winrate,baseline,delta_pct,pickRate",
  ];
  const deltas: { id: string; delta: number; winrate: number }[] = [];
  const byTag = new Map<string, { n: number; total: number }>();
  const bumpTag = (tag: string, delta: number): void => {
    const cell = byTag.get(tag) ?? { n: 0, total: 0 };
    cell.n += 1;
    cell.total += delta;
    byTag.set(tag, cell);
  };
  for (const perk of ALL_PERKS) {
    const wr = baseline(perk.id);
    const delta = (wr - base) * 100;
    deltas.push({ id: perk.id, delta, winrate: wr });
    for (const tag of perk.tags ?? []) bumpTag(tag, delta);
    for (const tag of perk.synergy ?? []) bumpTag(`synergy:${tag}`, delta);
    rows.push(
      [
        perk.id,
        perk.pool,
        perk.rarity,
        (perk.tags ?? []).join("|"),
        (perk.synergy ?? []).join("|"),
        wr.toFixed(3),
        base.toFixed(3),
        delta.toFixed(1),
        (pickRates.get(perk.id) ?? 0).toFixed(3),
      ].join(","),
    );
  }
  deltas.sort((a, b) => a.delta - b.delta);
  const dead = deltas.filter((d) => d.delta < DEAD_PERK_LINE);
  const dominant = deltas
    .map((d) => ({ ...d, pickRate: pickRates.get(d.id) ?? 0 }))
    .filter(
      (d) => d.pickRate * 100 > DOMINANT_PICK_PCT && d.delta > DOMINANT_EDGE_PP,
    );
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
      ? `  no perk below the ${String(DEAD_PERK_LINE)}% dead-weight line`
      : `  BELOW ${String(DEAD_PERK_LINE)}%: ${dead.map((d) => `${d.id} ${d.delta.toFixed(1)}%`).join(" · ")}`,
  );
  console.log(
    dominant.length === 0
      ? `  no perk is picked from an equal offer more than ${String(DOMINANT_PICK_PCT)}% of the time`
      : `  DOMINANT (>${String(DOMINANT_PICK_PCT)}% pick rate at equal offer): ${dominant.map((d) => `${d.id} ${(d.pickRate * 100).toFixed(1)}%`).join(" · ")}`,
  );

  const tagRows = [...byTag.entries()]
    .map(([tag, cell]) => ({ tag, n: cell.n, mean: cell.total / cell.n }))
    .filter((row) => row.n >= 3)
    .sort((a, b) => a.mean - b.mean);
  console.log(`  tag roll-up (${String(tagRows.length)} tags with n>=3):`);
  for (const row of tagRows.slice(0, 6)) {
    console.log(
      `    ${row.tag.padEnd(20)} n=${String(row.n).padStart(3)}  ${row.mean.toFixed(2).padStart(6)}pp`,
    );
  }
  console.log("    …");
  for (const row of tagRows.slice(-6).reverse()) {
    console.log(
      `    ${row.tag.padEnd(20)} n=${String(row.n).padStart(3)}  ${row.mean.toFixed(2).padStart(6)}pp`,
    );
  }
  rows.push("");
  rows.push("tag,perks,mean_delta_pct");
  for (const row of tagRows) {
    rows.push(`${row.tag},${String(row.n)},${row.mean.toFixed(2)}`);
  }

  const outDir = join(process.cwd(), "sim-out");
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date(startedAt).toISOString().replace(/[:.]/g, "-");
  const outPath = join(outDir, `perks-${stamp}.csv`);
  writeFileSync(outPath, `${rows.join("\n")}\n`, "utf8");
  console.log(
    `sim: wrote ${outPath} in ${String(Date.now() - startedAt)} ms — ${String(dead.length)} dead, ${String(dominant.length)} dominant`,
  );
};

const ECONOMY_PER_NODE_MIN = 12;
const ECONOMY_PER_NODE_MAX = 60;
const ECONOMY_SECTOR_MIN = 130;
const ECONOMY_SECTOR_MAX = 130 * 6;
const ECONOMY_MIN_CLEARS = 12;

const economyModeMain = (runs: number, seed: number, startedAt: number): void => {
  const rows: string[] = [
    "sector,deck,runs,clears,medianEarnedPerFight,medianEarned,basis,medianSpent,spendShare,verdict",
  ];
  const sectorSinks: {
    sector: number;
    deck: string;
    sinks: Record<string, number>;
    pockets: number;
    skips: number;
  }[] = [];
  let failures = 0;
  for (const sector of [1, 3, 5, 6]) {
    const def = SECTORS.find((sd) => sd.id === sector);
    const mult = def?.scrapMult ?? 1;
    const depth = def?.shape.bossRow ?? 15;
    for (const archetype of ARCHETYPES) {
      const perNode: number[] = [];
      const clearedEarned: number[] = [];
      const spent: number[] = [];
      const sinks = emptySinks();
      let pockets = 0;
      let skipIncome = 0;
      for (let i = 0; i < runs; i += 1) {
        const { result: r, state } = runSweepSectorWithState(
          deriveSeed(seed, `eco:${String(sector)}:${archetype.name}:${String(i)}`),
          { sector, ascension: 0, archetype },
        );
        spent.push(r.scrapSpent);
        if (r.win) {
          clearedEarned.push(
            Math.max(0, r.scrapEarned - Math.max(0, state.eventScrap)),
          );
        }
        if (r.fights > 0) {
          perNode.push(
            Math.max(0, r.scrapEarned - Math.max(0, state.eventScrap)) / r.fights,
          );
        }
        pockets += r.pockets;
        skipIncome += state.draftSkips;
        for (const key of Object.keys(sinks)) {
          sinks[key] = (sinks[key] ?? 0) + (state.sinks[key] ?? 0);
        }
      }
      sectorSinks.push({
        sector,
        deck: archetype.name,
        sinks,
        pockets: pockets / Math.max(1, runs),
        skips: skipIncome / Math.max(1, runs),
      });
      const mEarnedPerNode = median(perNode);
      const clears = clearedEarned.length;
      const projected = clears >= ECONOMY_MIN_CLEARS;
      const mEarned = projected
        ? median(clearedEarned)
        : mEarnedPerNode * depth;
      const basis = projected ? "cleared" : "projected";
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
          String(clears),
          mEarnedPerNode.toFixed(2),
          mEarned.toFixed(1),
          basis,
          mSpent.toFixed(1),
          share.toFixed(3),
          ok ? "ok" : "OUT_OF_BAND",
        ].join(","),
      );
      console.log(
        `sim economy: S${String(sector)} ${archetype.name.padEnd(10)} ${mEarnedPerNode.toFixed(1)}/fight (band ${lo.toFixed(0)}-${hi.toFixed(0)}) · ${basis} ${mEarned.toFixed(0)} (${String(clears)}/${String(runs)} clears) · spent ${mSpent.toFixed(0)} (${(share * 100).toFixed(0)}%) — ${ok ? "ok" : "OUT OF BAND"}`,
      );
    }
  }
  const sinkKeys = Object.keys(emptySinks());
  console.log("\nsim economy: sink table (mean scrap per run)");
  console.log(
    `  sector deck        ${sinkKeys.map((k) => k.padStart(13)).join("")}  pockets  skips`,
  );
  rows.push("");
  rows.push(`sector,deck,${sinkKeys.join(",")},pockets,draftSkips`);
  for (const row of sectorSinks) {
    const cells = sinkKeys.map((key) =>
      ((row.sinks[key] ?? 0) / Math.max(1, runs)).toFixed(1),
    );
    console.log(
      `  S${String(row.sector)}     ${row.deck.padEnd(11)} ${cells.map((c) => c.padStart(13)).join("")}  ${row.pockets.toFixed(2).padStart(7)}  ${row.skips.toFixed(2).padStart(5)}`,
    );
    rows.push(
      `${String(row.sector)},${row.deck},${cells.join(",")},${row.pockets.toFixed(2)},${row.skips.toFixed(2)}`,
    );
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

const DEAD_DIE_LINE = -8;

const diceModeMain = (runs: number, seed: number, startedAt: number): void => {
  const archetype = ARCHETYPES[0];
  if (archetype === undefined) return;
  const sector = Number(getArg("sector", "2"));
  const winrateWith = (swapIn?: string): number => {
    let wins = 0;
    for (let i = 0; i < runs; i += 1) {
      const deck = [...archetype.deck];
      if (swapIn !== undefined) deck[deck.length - 1] = swapIn;
      const res = runSweepSector(
        deriveSeed(seed, `die:${String(sector)}:${String(i)}`),
        {
          sector,
          ascension: 0,
          archetype: { ...archetype, deck },
          noDraft: true,
        },
      );
      if (res.win) wins += 1;
    }
    return wins / Math.max(1, runs);
  };

  const base = winrateWith();
  const rows: string[] = [
    "die,school,rarity,tier,pts,winrate,baseline,delta_pct,verdict",
  ];
  const deltas: { id: string; delta: number }[] = [];
  for (const die of ALL_DICE) {
    const wr = winrateWith(die.id);
    const delta = (wr - base) * 100;
    deltas.push({ id: die.id, delta });
    rows.push(
      [
        die.id,
        die.school,
        die.rarity,
        String(die.tier),
        String(die.pts),
        wr.toFixed(3),
        base.toFixed(3),
        delta.toFixed(1),
        delta < DEAD_DIE_LINE ? "DEAD" : "ok",
      ].join(","),
    );
  }
  deltas.sort((a, b) => a.delta - b.delta);
  const dead = deltas.filter((d) => d.delta < DEAD_DIE_LINE);
  console.log(
    `sim dice: baseline ${(base * 100).toFixed(1)}% over ${String(runs)} runs on S${String(sector)}, one slot swapped`,
  );
  console.log(
    `  worst five: ${deltas.slice(0, 5).map((d) => `${d.id} ${d.delta.toFixed(1)}%`).join(" · ")}`,
  );
  console.log(
    `  best five: ${deltas.slice(-5).reverse().map((d) => `${d.id} +${d.delta.toFixed(1)}%`).join(" · ")}`,
  );
  console.log(
    dead.length === 0
      ? `  no die below the ${String(DEAD_DIE_LINE)}% dead-weight line`
      : `  BELOW ${String(DEAD_DIE_LINE)}%: ${dead.map((d) => `${d.id} ${d.delta.toFixed(1)}%`).join(" · ")}`,
  );
  const outDir = join(process.cwd(), "sim-out");
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date(startedAt).toISOString().replace(/[:.]/g, "-");
  const outPath = join(outDir, `dice-${stamp}.csv`);
  writeFileSync(outPath, `${rows.join("\n")}\n`, "utf8");
  console.log(
    `sim: wrote ${outPath} in ${String(Date.now() - startedAt)} ms — ${String(dead.length)} dead of ${String(ALL_DICE.length)}`,
  );
};

interface CampaignResult {
  cleared: boolean;
  sectorsCleared: number;
  deathSector: number;
  deathRow: number;
  nodes: number;
  kills: number;
  scrapEarned: number;
  scrapSpent: number;
  hullEnd: number;
  perks: number;
  mk: number;
  puzzleByTier: Record<number, PuzzleTally>;
  sinks: Record<string, number>;
  draftSkips: number;
  draftRerolls: number;
  eventsResolved: number;
  eventScrap: number;
  eventHull: number;
  vouchers: number;
  interference: number;
  wormholes: WormholeTally;
  takenBySector: Record<number, number>;
  fightsBySector: Record<number, number>;
}

const CAMPAIGN_SECTORS = 5;

const runCampaign = (
  seed: number,
  archetype: Archetype,
  ascension: number,
  startDraft = false,
  shipId: ShipId = "wanderer",
): CampaignResult => {
  const aMods = ascensionMods(ascension);
  const hullMax = Math.max(
    1,
    Math.round(shipHullMax(shipId) * (1 + aMods.hullPct / 100)),
  );
  const state = createRunState({
    shipId,
    hull: hullMax,
    hullMax,
    deck: archetype.deck,
    chartPicks: MID_COLLECTION_PICKS,
  });
  if (startDraft) {
    runDraft(state, 1, createStream(deriveSeed(seed, "voucherDraft")));
  }
  const wormholes = emptyWormholeTally();
  let cleared = 0;
  let deathSector = 0;
  let deathRow = -1;
  for (let sector = 1; sector <= CAMPAIGN_SECTORS; sector += 1) {
    state.tide = 0;
    state.jumpsSinceTide = 0;
    const walk = walkSector(state, {
      sector,
      seed,
      ns: String(sector),
      tideCap:
        (SECTORS.find((sd) => sd.id === sector)?.tideCap ?? 3) +
        aMods.tideCapDelta,
      scrapMult: SECTORS.find((sd) => sd.id === sector)?.scrapMult ?? 1,
      ascension,
      enemyHpBonusPct: aMods.enemyHpPct,
      eliteShield: aMods.eliteShield,
      bossAsGate: false,
      stopRow: 0,
      rollModules: true,
      guard: 64,
      wormholes,
    });
    if (!walk.cleared) {
      deathSector = sector;
      deathRow = walk.deathRow;
      break;
    }
    cleared += 1;
  }
  return {
    cleared: cleared === CAMPAIGN_SECTORS,
    sectorsCleared: cleared,
    deathSector,
    deathRow,
    nodes: state.nodes,
    kills: state.kills,
    scrapEarned: state.scrapEarned,
    scrapSpent: state.scrapSpent,
    hullEnd: state.hull,
    perks: state.perks.length,
    mk: maxMk(state.mkLevels),
    puzzleByTier: state.puzzleByTier,
    sinks: state.sinks,
    draftSkips: state.draftSkips,
    draftRerolls: state.draftRerolls,
    eventsResolved: state.eventsResolved,
    eventScrap: state.eventScrap,
    eventHull: state.eventHull,
    vouchers: state.vouchers,
    interference: state.interference,
    wormholes,
    takenBySector: state.takenBySector,
    fightsBySector: state.fightsBySector,
  };
};

const CAMPAIGN_BAND: readonly [number, number] = [0.3, 0.36];

const CAMPAIGN_ASCENSIONS: readonly number[] = getArg("asc", "0,3")
  .split(",")
  .map((part) => Number(part.trim()))
  .filter((n) => Number.isFinite(n) && n >= 0);
const MONOTONIC_GAP_PP = 18;

const mergeTallies = (
  into: Record<number, PuzzleTally>,
  from: Record<number, PuzzleTally>,
): void => {
  for (const tier of [1, 2, 3, 4, 5]) {
    const target = into[tier];
    const source = from[tier];
    if (target === undefined || source === undefined) continue;
    target.entered += source.entered;
    target.solved += source.solved;
    target.attempts += source.attempts;
    target.paid += source.paid;
  }
};

const mergeSinks = (
  into: Record<string, number>,
  from: Record<string, number>,
): void => {
  for (const [key, value] of Object.entries(from)) {
    into[key] = (into[key] ?? 0) + value;
  }
};

interface CampaignRoll {
  archetype: string;
  ascension: number;
  runs: number;
  winrate: number;
  avgSectors: number;
  avgNodes: number;
  avgEarned: number;
  avgSpent: number;
  deathHist: Map<number, number>;
}

const campaignRoll = (
  runs: number,
  seed: number,
  archetype: Archetype,
  ascension: number,
  startDraft = false,
  shipId: ShipId = "wanderer",
): { roll: CampaignRoll; results: CampaignResult[] } => {
  const results: CampaignResult[] = [];
  for (let i = 0; i < runs; i += 1) {
    results.push(
      runCampaign(
        deriveSeed(seed, `campaign:${archetype.name}:${String(i)}`),
        archetype,
        ascension,
        startDraft,
        shipId,
      ),
    );
  }
  const n = Math.max(1, results.length);
  const avg = (f: (r: CampaignResult) => number): number =>
    results.reduce((sum, r) => sum + f(r), 0) / n;
  const deathHist = new Map<number, number>();
  for (const r of results) {
    if (r.cleared) continue;
    deathHist.set(r.deathSector, (deathHist.get(r.deathSector) ?? 0) + 1);
  }
  return {
    roll: {
      archetype: archetype.name,
      ascension,
      runs: results.length,
      winrate: results.filter((r) => r.cleared).length / n,
      avgSectors: avg((r) => r.sectorsCleared),
      avgNodes: avg((r) => r.nodes),
      avgEarned: avg((r) => r.scrapEarned),
      avgSpent: avg((r) => r.scrapSpent),
      deathHist,
    },
    results,
  };
};

const campaignModeMain = (
  runs: number,
  seed: number,
  startedAt: number,
): void => {
  const startDraft = process.argv.includes("--start-draft");
  const rows: string[] = [
    "deck,ascension,runs,winrate,avgSectorsCleared,avgNodes,avgScrapEarned,avgScrapSpent,verdict",
  ];
  console.log(
    `sim campaign: S1-S5 chained, ${String(ARCHETYPES.length)} decks x ${String(runs)} runs${startDraft ? " · voucher start draft" : ""}`,
  );
  const tallies = emptyPuzzleTally();
  const sinks = emptySinks();
  let skips = 0;
  let rerolls = 0;
  let events = 0;
  let eventScrap = 0;
  let eventHull = 0;
  const a0: number[] = [];
  const a0Runs: CampaignResult[] = [];
  for (const ascension of CAMPAIGN_ASCENSIONS) {
    for (const archetype of ARCHETYPES) {
      const { roll, results } = campaignRoll(
        runs,
        seed,
        archetype,
        ascension,
        startDraft,
      );
      if (ascension === 0) {
        for (const r of results) {
          mergeTallies(tallies, r.puzzleByTier);
          mergeSinks(sinks, r.sinks);
          skips += r.draftSkips;
          rerolls += r.draftRerolls;
          events += r.eventsResolved;
          eventScrap += r.eventScrap;
          eventHull += r.eventHull;
        }
        if (archetype.name !== "black-edge") {
          a0.push(roll.winrate);
          a0Runs.push(...results);
        }
      }

      rows.push(
        [
          archetype.name,
          `A${String(ascension)}`,
          String(roll.runs),
          roll.winrate.toFixed(3),
          roll.avgSectors.toFixed(2),
          roll.avgNodes.toFixed(1),
          roll.avgEarned.toFixed(1),
          roll.avgSpent.toFixed(1),
          "",
        ].join(","),
      );
      const hist = [...roll.deathHist.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([sector, n]) => `s${String(sector)}:${String(n)}`)
        .join(" ");
      console.log(
        `  A${String(ascension)} ${archetype.name.padEnd(10)} winrate ${(roll.winrate * 100).toFixed(1)}% · sectors ${roll.avgSectors.toFixed(2)} · scrap +${roll.avgEarned.toFixed(0)}/-${roll.avgSpent.toFixed(0)} · deaths ${hist === "" ? "none" : hist}`,
      );
    }
  }
  const mean = a0.reduce((sum, v) => sum + v, 0) / Math.max(1, a0.length);
  console.log(
    `  A0 mid-collection mean (red+blue) ${(mean * 100).toFixed(1)}% — band ${(CAMPAIGN_BAND[0] * 100).toFixed(0)}-${(CAMPAIGN_BAND[1] * 100).toFixed(0)}%${mean >= CAMPAIGN_BAND[0] && mean <= CAMPAIGN_BAND[1] ? " — ok" : " — OUT OF BAND"}`,
  );

  const conditional: number[] = [];
  console.log(
    "  per-sector conditional clear rate (A0, red+blue — the monotonicity read):",
  );
  rows.push("");
  rows.push("sector,entered,cleared,conditionalClearRate,gapToPrevious");
  let previous: number | null = null;
  let cliffs = 0;
  for (let sector = 1; sector <= CAMPAIGN_SECTORS; sector += 1) {
    const entered = a0Runs.filter((r) => r.sectorsCleared >= sector - 1).length;
    const clearedHere = a0Runs.filter((r) => r.sectorsCleared >= sector).length;
    const rate = entered === 0 ? 0 : clearedHere / entered;
    conditional.push(rate);
    const gap = previous === null ? 0 : (rate - previous) * 100;
    if (previous !== null && Math.abs(gap) > MONOTONIC_GAP_PP) cliffs += 1;
    console.log(
      `    S${String(sector)} ${String(clearedHere).padStart(4)}/${String(entered).padEnd(4)} ${(rate * 100).toFixed(1).padStart(6)}%${previous === null ? "" : `  gap ${gap >= 0 ? "+" : ""}${gap.toFixed(1)}pp${Math.abs(gap) > MONOTONIC_GAP_PP ? " — CLIFF" : ""}${gap > 0 ? " — EASIER THAN THE ACT BEFORE" : ""}`}`,
    );
    rows.push(
      `${String(sector)},${String(entered)},${String(clearedHere)},${rate.toFixed(3)},${gap.toFixed(1)}`,
    );
    previous = rate;
  }
  console.log("  damage taken per act (A0, red+blue — hull+shield absorbed per fight):");
  rows.push("");
  rows.push("sector,fights,damageTaken,perFight");
  for (let sector = 1; sector <= CAMPAIGN_SECTORS; sector += 1) {
    const taken = a0Runs.reduce(
      (sum, r) => sum + (r.takenBySector[sector] ?? 0),
      0,
    );
    const fights = a0Runs.reduce(
      (sum, r) => sum + (r.fightsBySector[sector] ?? 0),
      0,
    );
    if (fights === 0) continue;
    console.log(
      `    S${String(sector)} ${String(fights).padStart(5)} fights · ${String(taken).padStart(6)} taken · ${(taken / fights).toFixed(2)} per fight`,
    );
    rows.push(
      `${String(sector)},${String(fights)},${String(taken)},${(taken / fights).toFixed(2)}`,
    );
  }
  console.log("  where a run dies inside its act (A0, red+blue):");
  for (let sector = 1; sector <= CAMPAIGN_SECTORS; sector += 1) {
    const shape = SECTORS.find((sd) => sd.id === sector)?.shape;
    const deaths = a0Runs.filter((r) => r.deathSector === sector);
    if (deaths.length === 0) continue;
    const hist = new Map<number, number>();
    for (const r of deaths) hist.set(r.deathRow, (hist.get(r.deathRow) ?? 0) + 1);
    const atGate = deaths.filter((r) => r.deathRow === shape?.gateRow).length;
    const atBoss = deaths.filter((r) => r.deathRow === shape?.bossRow).length;
    console.log(
      `    S${String(sector)} ${String(deaths.length)} deaths · gate row ${String(shape?.gateRow ?? 0)}: ${String(atGate)} · boss row ${String(shape?.bossRow ?? 0)}: ${String(atBoss)} · ${[...hist.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([row, n]) => `r${String(row)}:${String(n)}`)
        .join(" ")}`,
    );
  }

  const rises = conditional.filter(
    (rate, index) => index > 0 && rate > (conditional[index - 1] ?? 0),
  ).length;
  console.log(
    `    ${String(cliffs)} cliff(s) over ${String(MONOTONIC_GAP_PP)}pp · ${String(rises)} act(s) easier than the one before`,
  );
  const holes = a0Runs.reduce(
    (into: WormholeTally, run: CampaignResult) => ({
      rides: into.rides + run.wormholes.rides,
      bypasses: into.bypasses + run.wormholes.bypasses,
      backward: into.backward + run.wormholes.backward,
      fallbacks: into.fallbacks + run.wormholes.fallbacks,
      rowsMoved: into.rowsMoved + run.wormholes.rowsMoved,
      tollPaid: into.tollPaid + run.wormholes.tollPaid,
    }),
    emptyWormholeTally(),
  );
  const holeRuns = Math.max(1, a0Runs.length);
  const metRuns = a0Runs.filter(
    (run) => run.wormholes.rides + run.wormholes.bypasses > 0,
  ).length;
  console.log("  black holes (A0, red+blue):");
  console.log(
    `    met in ${((metRuns / holeRuns) * 100).toFixed(1)}% of runs · ${(
      (holes.rides + holes.bypasses) / holeRuns
    ).toFixed(2)} encounters/run`,
  );
  console.log(
    `    rides ${String(holes.rides)} (${
      holes.rides === 0
        ? "0"
        : ((holes.backward / holes.rides) * 100).toFixed(0)
    }% backward · ${
      holes.rides === 0
        ? "0"
        : ((holes.fallbacks / holes.rides) * 100).toFixed(0)
    }% fallback · ${
      holes.rides === 0 ? "0" : (holes.rowsMoved / holes.rides).toFixed(2)
    } rows avg) · bypasses ${String(holes.bypasses)} (${String(holes.tollPaid)} hull paid)`,
  );
  console.log("  campaign sinks (A0, all decks):");
  for (const sink of Object.keys(sinks)) {
    console.log(
      `    ${sink.padEnd(14)} ${String(Math.round(sinks[sink] ?? 0))}`,
    );
  }
  console.log(
    `  draft agency: ${String(skips)} skips · ${String(rerolls)} rerolls over ${String(runs * ARCHETYPES.length)} A0 runs`,
  );
  const a0Total = Math.max(1, runs * ARCHETYPES.length);
  console.log(
    `  events: ${(events / a0Total).toFixed(1)}/run · scrap ${eventScrap >= 0 ? "+" : ""}${(eventScrap / a0Total).toFixed(1)} · hull ${eventHull >= 0 ? "+" : ""}${(eventHull / a0Total).toFixed(1)} per run`,
  );
  console.log("  puzzles met in campaign:");
  for (const tier of [1, 2, 3, 4, 5]) {
    const tally = tallies[tier];
    if (tally === undefined || tally.entered === 0) continue;
    console.log(
      `    T${String(tier)} entered ${String(tally.entered)} · solved ${((tally.solved / tally.entered) * 100).toFixed(1)}% · ${(tally.attempts / tally.entered).toFixed(2)} attempts · ${(tally.paid / tally.entered).toFixed(1)} scrap staked`,
    );
  }
  const outDir = join(process.cwd(), "sim-out");
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date(startedAt).toISOString().replace(/[:.]/g, "-");
  const outPath = join(outDir, `campaign-${stamp}.csv`);
  writeFileSync(outPath, `${rows.join("\n")}\n`, "utf8");
  console.log(`sim: wrote ${outPath} in ${String(Date.now() - startedAt)} ms`);
  if (mean < CAMPAIGN_BAND[0] || mean > CAMPAIGN_BAND[1]) process.exitCode = 1;
};

const SHIP_BAND: readonly [number, number] = [0.2, 0.6];

const SHIP_BAND_ENFORCED: readonly ShipId[] = ["corsair", "foundry", "prism"];

const PRISM_SPECTRUM: Archetype = {
  name: "prism-spectrum",
  deck: [
    "glimmer", "prismChip", "facet", "spectra",
    "red-d6", "blue-d6", "green-d4", "ember", "slug",
  ],
  mkLevels: { weaponA: 3, weaponB: 2, shields: 2, reactor: 2 },
  modules: ["siegeMount", "ablativeWeave"],
};

const SHIP_ARCHETYPES: readonly Archetype[] = [...ARCHETYPES, PRISM_SPECTRUM];

const shipsModeMain = (runs: number, seed: number, startedAt: number): void => {
  const only = getArg("ship", "");
  const ships =
    only === "" ? PLAYABLE_SHIPS : PLAYABLE_SHIPS.filter((s) => s.id === only);
  const rows: string[] = ["ship,deck,runs,winrate,avgSectorsCleared,hullMax"];
  console.log(
    `sim ships: S1-S5 chained per ship, ${String(ships.length)} ships x ${String(SHIP_ARCHETYPES.length)} decks x ${String(runs)} runs`,
  );
  console.log(
    `  the band is ${(SHIP_BAND[0] * 100).toFixed(0)}-${(SHIP_BAND[1] * 100).toFixed(0)}% on the red+blue+prism mean; black-edge is printed, never enforced.`,
  );
  console.log(
    "  it is asserted on the hulls P11 authored; the three legacy hulls are reference readings.",
  );
  let outOfBand = 0;
  for (const ship of ships) {
    const banded: number[] = [];
    for (const archetype of SHIP_ARCHETYPES) {
      const { roll } = campaignRoll(runs, seed, archetype, 0, false, ship.id);
      if (archetype.name !== "black-edge") banded.push(roll.winrate);
      rows.push(
        [
          ship.id,
          archetype.name,
          String(roll.runs),
          roll.winrate.toFixed(3),
          roll.avgSectors.toFixed(2),
          String(shipHullMax(ship.id)),
        ].join(","),
      );
      console.log(
        `  ${ship.id.padEnd(9)} ${archetype.name.padEnd(10)} winrate ${(roll.winrate * 100).toFixed(1).padStart(5)}% · sectors ${roll.avgSectors.toFixed(2)}`,
      );
    }
    const mean = banded.reduce((sum, v) => sum + v, 0) / Math.max(1, banded.length);
    const inBand = mean >= SHIP_BAND[0] && mean <= SHIP_BAND[1];
    const enforced = SHIP_BAND_ENFORCED.includes(ship.id);
    if (!inBand && enforced) outOfBand += 1;
    console.log(
      `  ${ship.id.padEnd(9)} banded mean ${(mean * 100).toFixed(1)}%${inBand ? "" : enforced ? " OUT OF BAND" : " outside the band (reference)"}`,
    );
    rows.push(`${ship.id},banded mean,,${mean.toFixed(3)},,`);
  }
  const outDir = join(process.cwd(), "sim-out");
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date(startedAt).toISOString().replace(/[:.]/g, "-");
  const outPath = join(outDir, `ships-${stamp}.csv`);
  writeFileSync(outPath, `${rows.join("\n")}\n`, "utf8");
  console.log(`sim: wrote ${outPath} in ${String(Date.now() - startedAt)} ms`);
  if (outOfBand > 0) process.exitCode = 1;
};

const PUZZLE_BELL: readonly number[] = [8, 15, 20, 12, 5];

const puzzleModeMain = (runs: number, seed: number, startedAt: number): void => {
  const rows: string[] = [
    "tier,authored,target,medianAttemptWin,medianBudgeted,floor,freeAttempts,paidSteps,inRunEntered,inRunSolveRate,avgAttempts,avgStaked,verdict",
  ];
  const tallies = emptyPuzzleTally();
  for (const archetype of ARCHETYPES) {
    for (let i = 0; i < runs; i += 1) {
      const result = runCampaign(
        deriveSeed(seed, `puzzles:${archetype.name}:${String(i)}`),
        archetype,
        0,
      );
      mergeTallies(tallies, result.puzzleByTier);
    }
  }
  console.log(
    `sim puzzles: ${String(PUZZLES.length)} authored · in-run telemetry over ${String(runs * ARCHETYPES.length)} A0 campaigns`,
  );
  console.log(
    "  tier  n/target  attemptWin  budgeted  floor   entered  solved  attempts  staked",
  );
  let failures = 0;
  for (const tier of [1, 2, 3, 4, 5] as PuzzleTier[]) {
    const authored = PUZZLES.filter((p) => p.tier === tier);
    const target = PUZZLE_BELL[tier - 1] ?? 0;
    const attemptWins = authored
      .map((p) => difficultyOf(p).attemptWin)
      .sort((a, b) => a - b);
    const budgeted = authored
      .map((p) => difficultyOf(p).budgetedSolve)
      .sort((a, b) => a - b);
    const floor = TIER_BANDS.find((b) => b.tier === tier)?.solveFloor ?? 0;
    const stakes = TIER_STAKES[tier];
    const tally = tallies[tier] ?? {
      entered: 0,
      solved: 0,
      attempts: 0,
      paid: 0,
    };
    const solveRate = tally.entered === 0 ? 0 : tally.solved / tally.entered;
    const ok = authored.length === target;
    if (!ok) failures += 1;
    rows.push(
      [
        String(tier),
        String(authored.length),
        String(target),
        median(attemptWins).toFixed(3),
        median(budgeted).toFixed(3),
        floor.toFixed(2),
        String(stakes.freeAttempts),
        String(stakes.paidCosts.length),
        String(tally.entered),
        solveRate.toFixed(3),
        tally.entered === 0 ? "0" : (tally.attempts / tally.entered).toFixed(2),
        tally.entered === 0 ? "0" : (tally.paid / tally.entered).toFixed(1),
        ok ? "ok" : "COUNT_OFF_BELL",
      ].join(","),
    );
    console.log(
      `  T${String(tier)}    ${String(authored.length).padStart(2)}/${String(target).padStart(2)}      ${median(attemptWins).toFixed(3)}      ${median(budgeted).toFixed(3)}    ${floor.toFixed(2)}    ${String(tally.entered).padStart(6)}  ${(solveRate * 100).toFixed(1).padStart(5)}%  ${(tally.entered === 0 ? 0 : tally.attempts / tally.entered).toFixed(2).padStart(7)}  ${(tally.entered === 0 ? 0 : tally.paid / tally.entered).toFixed(1).padStart(6)}${ok ? "" : "  COUNT OFF BELL"}`,
    );
  }
  const maxed = PUZZLES.filter(
    (p) => difficultyOf(p).budgetedSolve >= 0.999 && maxAttempts(p) > 1,
  );
  console.log(
    maxed.length === 0
      ? "  no puzzle is a guaranteed solve inside its budget"
      : `  guaranteed inside budget: ${maxed.map((p) => p.id).join(" ")}`,
  );
  const outDir = join(process.cwd(), "sim-out");
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date(startedAt).toISOString().replace(/[:.]/g, "-");
  const outPath = join(outDir, `puzzles-${stamp}.csv`);
  writeFileSync(outPath, `${rows.join("\n")}\n`, "utf8");
  console.log(
    `sim: wrote ${outPath} in ${String(Date.now() - startedAt)} ms — ${String(failures)} tier(s) off the bell`,
  );
};

const S6_ENTRY_MK: MkLevels = {
  weaponA: 3,
  weaponB: 3,
  spinal: 3,
  shields: 3,
  shieldsB: 3,
  engines: 3,
  sensors: 3,
  reactor: 3,
  repairBay: 3,
};

const S6_ENTRY_PERKS: readonly string[] = [
  "targeter",
  "bulkhead",
  "stabilizer",
  "hardenedHull",
  "targetingSuite",
  "refitCrew",
  "piercingRounds",
  "fullRefit",
];

const S6_ENTRY_DICE: readonly string[] = ["aurora", "coreshard", "lodestar"];

const DEEP_BAND: readonly [number, number] = [0.35, 0.75];

const deepModeMain = (runs: number, seed: number, startedAt: number): void => {
  const rows: string[] = [
    "sector,ascension,deck,profile,runs,winrate,avgNodes,avgScrapEarned,avgHullMedian,verdict",
  ];
  console.log(
    `sim deep: sector 6 at entry quality, ${String(ARCHETYPES.length)} decks x ${String(runs)} runs`,
  );
  let outOfBand = 0;
  for (const ascension of [0, 3, 6]) {
    for (const archetype of ARCHETYPES) {
      for (const profile of ["entry", "sectorSweep"] as const) {
        const results: SectorResult[] = [];
        for (let i = 0; i < runs; i += 1) {
          results.push(
            runSweepSector(
              deriveSeed(seed, `deep:${archetype.name}:${profile}:${String(i)}`),
              {
                sector: 6,
                ascension,
                archetype,
                ...(profile === "entry"
                  ? {
                      perks: S6_ENTRY_PERKS,
                      deckExtra: S6_ENTRY_DICE,
                      mkLevels: S6_ENTRY_MK,
                    }
                  : {}),
              },
            ),
          );
        }
        const n = Math.max(1, results.length);
        const avg = (f: (r: SectorResult) => number): number =>
          results.reduce((sum, r) => sum + f(r), 0) / n;
        const winrate = results.filter((r) => r.win).length / n;
        const ok =
          profile !== "entry" ||
          ascension !== 0 ||
          archetype.name === "black-edge" ||
          (winrate >= DEEP_BAND[0] && winrate <= DEEP_BAND[1]);
        if (!ok) outOfBand += 1;
        rows.push(
          [
            "6",
            `A${String(ascension)}`,
            archetype.name,
            profile,
            String(n),
            winrate.toFixed(3),
            avg((r) => r.nodes).toFixed(2),
            avg((r) => r.scrapEarned).toFixed(1),
            avg((r) => r.hullMedian).toFixed(1),
            ok ? "ok" : "OUT_OF_BAND",
          ].join(","),
        );
        console.log(
          `sim deep: A${String(ascension)} ${archetype.name.padEnd(10)} ${profile.padEnd(11)} winrate ${(winrate * 100).toFixed(1)}% · nodes ${avg((r) => r.nodes).toFixed(1)} · scrap +${avg((r) => r.scrapEarned).toFixed(0)}${ok ? "" : " — OUT OF BAND"}`,
        );
      }
    }
  }
  const outDir = join(process.cwd(), "sim-out");
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date(startedAt).toISOString().replace(/[:.]/g, "-");
  const outPath = join(outDir, `deep-${stamp}.csv`);
  writeFileSync(outPath, `${rows.join("\n")}\n`, "utf8");
  console.log(`sim: wrote ${outPath} in ${String(Date.now() - startedAt)} ms`);
  console.log(
    outOfBand === 0
      ? `sim deep: every entry-quality row inside the ${String(DEEP_BAND[0] * 100)}-${String(DEEP_BAND[1] * 100)}% band`
      : `sim deep: ${String(outOfBand)} entry-quality row(s) outside the band`,
  );
};

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
            sectorDmgPct: sectorDmgPct({ sector }),
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
  if (failures > 0 || unfair > 0) process.exitCode = 1;
};

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

interface CareerRun {
  sectorsCleared: number;
  nodes: number;
  elites: number;
  minibosses: number;
  bosses: number;
  hullPct: number;
  beacons: number;
  newDice: number;
  contractStars: number;
}

type CareerProfile = "learning" | "mixed" | "ace";

const careerRun = (profile: CareerProfile, index: number): CareerRun => {
  const deep = (
    sectorsCleared: number,
    nodes: number,
    elites: number,
    minibosses: number,
    bosses: number,
    hullPct: number,
    beacons: number,
    newDice: number,
  ): CareerRun => ({
    sectorsCleared,
    nodes,
    elites,
    minibosses,
    bosses,
    hullPct,
    beacons,
    newDice,
    contractStars: 0,
  });
  if (profile === "ace") return deep(5, 60, 12, 5, 5, 70, 5, index < 12 ? 4 : 1);
  if (profile === "learning") {
    if (index < 8) return deep(1, 14, 2, 1, 1, 0, 0, index < 6 ? 3 : 1);
    if (index < 20) return deep(2, 26, 4, 2, 2, 0, 1, index < 14 ? 2 : 1);
    if (index < 34) return deep(3, 38, 7, 3, 3, 0, 2, 1);
    return deep(4, 50, 10, 4, 4, 0, 3, 1);
  }
  if (index < 4) return deep(1, 14, 2, 1, 1, 0, 0, 3);
  if (index < 10) return deep(3, 30, 5, 2, 2, 0, 1, 2);
  if (index < 18) return deep(4, 44, 8, 4, 3, 0, 3, 1);
  return deep(5, 60, 12, 5, 5, 62, 5, index < 26 ? 1 : 0);
};

interface CareerTally {
  runs: number;
  xp: number;
  shards: number;
  bySource: Record<string, number>;
}

const RARITY_ORDER = ["common", "uncommon", "rare", "legendary"] as const;

const findShardsFor = (count: number, offset: number): number => {
  let total = 0;
  for (let i = 0; i < count; i += 1) {
    const rarity = RARITY_ORDER[(offset + i) % RARITY_ORDER.length] ?? "common";
    total += FIRST_FIND_SHARDS[rarity] ?? 0;
  }
  return total;
};

const walkCareer = (profile: CareerProfile, maxRuns: number): CareerTally => {
  const tally: CareerTally = {
    runs: 0,
    xp: 0,
    shards: 0,
    bySource: {
      sectors: 0,
      beacons: 0,
      firstEnding: 0,
      hullClear: 0,
      streak: 0,
      ascension: 0,
      bossFirstKill: 0,
      finds: 0,
    },
  };
  let streak = 0;
  let endingsSeen = 0;
  const bossKills = new Set<number>();
  let findOffset = 0;
  for (let i = 0; i < maxRuns; i += 1) {
    const run = careerRun(profile, i);
    const win = run.sectorsCleared >= 5;
    streak = win ? streak + 1 : 0;
    const firstEnding = win && endingsSeen < 4;
    if (firstEnding) endingsSeen += 1;
    const breakdown = shardBreakdown({
      win,
      sectorsCleared: run.sectorsCleared,
      beacons: run.beacons,
      hullPct: run.hullPct,
      firstEnding,
      streak,
      ascension: 0,
      deepClear: false,
    });
    let bossBonus = 0;
    for (let sector = 1; sector <= run.bosses; sector += 1) {
      if (bossKills.has(sector)) continue;
      bossKills.add(sector);
      bossBonus += bossFirstKillShards(sector);
    }
    const finds = findShardsFor(run.newDice, findOffset);
    findOffset += run.newDice;
    tally.runs = i + 1;
    tally.xp += runXp({
      nodes: run.nodes,
      elites: run.elites,
      minibosses: run.minibosses,
      bosses: run.bosses,
      contractStars: run.contractStars,
    });
    tally.shards += breakdown.total + bossBonus + finds;
    tally.bySource.sectors = (tally.bySource.sectors ?? 0) + breakdown.sectors;
    tally.bySource.beacons = (tally.bySource.beacons ?? 0) + breakdown.beacons;
    tally.bySource.firstEnding =
      (tally.bySource.firstEnding ?? 0) + breakdown.firstEnding;
    tally.bySource.hullClear =
      (tally.bySource.hullClear ?? 0) + breakdown.hullClear;
    tally.bySource.streak = (tally.bySource.streak ?? 0) + breakdown.streak;
    tally.bySource.ascension =
      (tally.bySource.ascension ?? 0) + breakdown.ascension;
    tally.bySource.bossFirstKill =
      (tally.bySource.bossFirstKill ?? 0) + bossBonus;
    tally.bySource.finds = (tally.bySource.finds ?? 0) + finds;
    if (levelFromTotalXp(tally.xp) >= MAX_LEVEL) break;
  }
  return tally;
};

const L50_BAND: readonly [number, number] = [25, 35];
const L50_SLACK = 0.1;

const metaModeMain = (_runs: number, _seed: number, startedAt: number): void => {
  const profiles: readonly CareerProfile[] = ["ace", "mixed", "learning"];
  const CAP = 200;
  console.log(
    `sim: meta — L50 needs ${String(totalXpForLevel(MAX_LEVEL))} xp · band ${String(L50_BAND[0])}-${String(L50_BAND[1])} mixed runs ±${String(Math.round(L50_SLACK * 100))}%`,
  );
  console.log("  profile     runs to L50   xp/run   shards at L50   shards/run");
  const rows: { profile: CareerProfile; tally: CareerTally }[] = [];
  for (const profile of profiles) {
    const tally = walkCareer(profile, CAP);
    rows.push({ profile, tally });
    console.log(
      `  ${profile.padEnd(11)} ${String(tally.runs).padStart(11)} ${(tally.xp / tally.runs).toFixed(0).padStart(8)} ${String(tally.shards).padStart(15)} ${(tally.shards / tally.runs).toFixed(0).padStart(12)}`,
    );
  }

  const mixed = rows.find((row) => row.profile === "mixed");
  let outOfBand = false;
  if (mixed !== undefined) {
    const low = L50_BAND[0] * (1 - L50_SLACK);
    const high = L50_BAND[1] * (1 + L50_SLACK);
    outOfBand = mixed.tally.runs < low || mixed.tally.runs > high;
    console.log(
      `  mixed L50 pace ${String(mixed.tally.runs)} runs — ${outOfBand ? "OUT OF BAND" : "in band"} (${low.toFixed(1)}-${high.toFixed(1)})`,
    );
    console.log("  shard income by source (mixed career to L50):");
    const total = mixed.tally.shards;
    for (const [source, value] of Object.entries(mixed.tally.bySource)) {
      if (value === 0) continue;
      console.log(
        `    ${source.padEnd(14)} ${String(value).padStart(6)}  ${((value / total) * 100).toFixed(1).padStart(5)}%`,
      );
    }
  }

  const diceFull = ALL_DICE.reduce(
    (sum, die) => sum + META_DIE_PRICE[die.rarity],
    0,
  );
  const diceMet = ALL_DICE.reduce(
    (sum, die) =>
      sum +
      Math.round(
        (META_DIE_PRICE[die.rarity] * (100 - ENCOUNTER_DISCOUNT_PCT)) / 100,
      ),
    0,
  );
  const ships = PLAYABLE_SHIPS.reduce((sum, ship) => sum + ship.price, 0);
  const themes = THEMES.reduce((sum, theme) => sum + theme.price, 0);
  const engravings = ENGRAVINGS.reduce((sum, def) => sum + def.price, 0);
  const respecs = RESPEC_SHARD_COST * 10;
  console.log("  shard sinks:");
  const sinks: readonly [string, number][] = [
    [`all ${String(ALL_DICE.length)} dice (full price)`, diceFull],
    [`all ${String(ALL_DICE.length)} dice (all met, −30%)`, diceMet],
    ["ships", ships],
    ["themes", themes],
    ["one of every engraving", engravings],
    ["ten respecs before L50", respecs],
  ];
  for (const [label, value] of sinks) {
    console.log(`    ${label.padEnd(30)} ${String(value).padStart(7)}`);
  }

  if (mixed !== undefined) {
    const perRun = mixed.tally.shards / mixed.tally.runs;
    console.log(
      `  affordability horizon at ${perRun.toFixed(0)} shards/run: full ${String(Math.ceil(diceFull / perRun))} runs · all met ${String(Math.ceil(diceMet / perRun))} runs`,
    );
  }

  const outDir = join(process.cwd(), "sim-out");
  mkdirSync(outDir, { recursive: true });
  const csv = ["profile,runsToL50,xpPerRun,shardsAtL50,shardsPerRun"];
  for (const row of rows) {
    csv.push(
      `${row.profile},${String(row.tally.runs)},${(row.tally.xp / row.tally.runs).toFixed(0)},${String(row.tally.shards)},${(row.tally.shards / row.tally.runs).toFixed(0)}`,
    );
  }
  const outPath = join(outDir, "meta-curve.csv");
  writeFileSync(outPath, `${csv.join("\n")}\n`, "utf8");
  console.log(`sim: wrote ${outPath} in ${String(Date.now() - startedAt)} ms`);
  if (outOfBand) process.exitCode = 1;
};

const main = (): void => {
  const startedAt = Date.now();
  const mode = getArg("mode", "battle");
  const defaultRuns =
    mode === "run"
      ? "300"
      : mode === "ladder"
        ? "200"
      : mode === "sweep"
        ? "500"
        : mode === "perks"
          ? "60"
          : mode === "economy"
            ? "200"
            : mode === "roster"
              ? "40"
              : mode === "deep" || mode === "s6"
                ? "300"
                : mode === "axis"
                  ? "200"
                  : mode === "campaign" || mode === "ships"
                    ? "200"
                    : mode === "puzzles"
                      ? "60"
                      : mode === "dice"
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
  if (mode === "ladder") {
    ladderModeMain(runs, seed, startedAt);
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
  if (mode === "deep" || mode === "s6") {
    deepModeMain(runs, seed, startedAt);
    return;
  }
  if (mode === "campaign") {
    campaignModeMain(runs, seed, startedAt);
    return;
  }
  if (mode === "ships") {
    shipsModeMain(runs, seed, startedAt);
    return;
  }
  if (mode === "puzzles") {
    puzzleModeMain(runs, seed, startedAt);
    return;
  }
  if (mode === "dice") {
    diceModeMain(runs, seed, startedAt);
    return;
  }
  if (mode === "axis") {
    axisModeMain(runs, seed, startedAt);
    return;
  }
  if (mode === "meta") {
    metaModeMain(runs, seed, startedAt);
    return;
  }
  battleModeMain(runs, seed, startedAt);
};

main();
