import { ascensionMods, MAX_ASCENSION } from "@/data/ascension";
import { dossierId } from "@/data/codex";
import { contractDef } from "@/data/contracts";
import { DIE_BY_ID } from "@/data/dice";
import { MODULE_BY_ID } from "@/data/modules";
import { STARTER_DECK } from "@/data/decks";
import { computeMutatorMods } from "@/data/mutators";
import { ENEMY_BY_ID } from "@/data/enemies";
import { beaconsResolved } from "@/data/events/beacons";
import { finalMemoryCodexId, memoryAt } from "@/data/narrative/memories";
import { PROLOGUE_ENEMY, PROLOGUE_SCRIPT } from "@/data/narrative/prologue";
import { SECTOR_COUNT, sectorDef } from "@/data/sectors";
import { shipHullMax } from "@/game/battle/setup";
import { chartSlotTierDelta } from "@/game/chart/engine";
import {
  computeNodeReward,
  dieForRarity,
  isDraftNode,
  rollModule,
} from "@/game/economy/rewards";
import { generateSectorMap, START_NODE_ID } from "@/game/map/generator";
import {
  areConnected,
  nodeById,
  type MapNode,
  type NodeId,
} from "@/game/map/types";
import { DECK_CAP, ptsForDie, sellValue } from "@/game/economy/prices";
import { pushRunCloud } from "@/game/run/cloud";
import {
  buildEncounterIds,
  pickBoss,
  sectorHpPct,
} from "@/game/run/encounter";
import { applyEdgeMotifs, applyNodeMotifs } from "@/game/run/motifs";
import { battleEndAxisDelta, countDeckSchool } from "@/game/run/axis";
import { emitBark, resetBarkMemory } from "@/game/narrative";
import { computePerkMods } from "@/game/run/perkMods";
import { computeRunMods, runChargeCap } from "@/game/run/runMods";
import { rollPerkChoices, SKIP_SCRAP } from "@/game/run/perkDraft";
import { recordAction, resetActionLog, syncActionStats } from "@/game/run/actionLog";
import { emitRunHook } from "@/game/run/runEffects";
import { finishScoredRun } from "@/game/run/boards";
import { countStars, goalStarsMask, type GoalContext } from "@/game/run/goals";
import {
  contentSector,
  dailyMutators,
  dailySeed,
  depthFor,
  driftLoop,
  driftLoopHpPct,
  isScoredMode,
  isSectorExitRow,
  scoreBreakdown,
  setupForRun,
} from "@/game/run/modes";
import {
  bossFirstKillShards,
  campaignShards,
  runXp,
  sectorClearShards,
} from "@/game/xp";
import { MILESTONES } from "@/data/milestones";
import { useSummaryStore } from "@/stores/summaryStore";
import { captureRunSnapshot } from "@/game/run/snapshot";
import { trackEvent } from "@/services/analytics";
import { createStream, createStreams, deriveSeed } from "@/services/rng";
import { clearRun, saveRunSnapshot } from "@/services/save";
import { useAppStore } from "@/stores/appStore";
import { battleTally, useBattleStore } from "@/stores/battleStore";
import { SMOTRITEL_BADGE, useMetaStore } from "@/stores/metaStore";
import { createInitialRunValues, useRunStore } from "@/stores/runStore";
import type { BattleTally, RunMode, RunValues } from "@/stores/runStore";
import type { RunSnapshot } from "@/types";
import type { SlotId } from "@/types/battle";
import type { School } from "@/types/content";
import type { FlagValue, ForcedBattle } from "@/types/events";

import { BASE_TIDE_CAP, tideCapFor } from "@/game/run/tide";

export { BASE_TIDE_CAP, tideCapFor };

export const JUMPS_PER_TIDE = 4;
export const STARTING_SCRAP = 0;
export const MINIBOSS_PACKAGE_SCRAP: readonly [number, number] = [30, 40];

// «Резонансный шторм» boosts one real school per battle, drawn from a per-node
// stream so the boost is replayable and never touches the battle's own streams.
const STORM_SCHOOLS: readonly School[] = [
  "red",
  "blue",
  "green",
  "yellow",
  "black",
  "grey",
];

const runRotation = (run: RunValues): string[] => {
  const faced = [
    ...run.usedMinibosses,
    ...(run.stats.bosses > 0 ? [pickBoss(run.sector, run.seed)] : []),
  ];
  return faced
    .map((id) => ENEMY_BY_ID.get(id)?.name)
    .filter((name): name is string => name !== undefined);
};

const contractPerksDisabled = (): boolean =>
  setupForRun(useRunStore.getState()).perksDisabled === true;

export interface NodeResult {
  outcome: "cleared" | "defeat";
  scrap?: number;
  setHull?: number;
  kills?: number;
  deepScan?: boolean;
}

export const jumpsPerTideFor = (mutators: readonly string[]): number =>
  Math.max(1, JUMPS_PER_TIDE + computeMutatorMods(mutators).jumpsPerTideDelta);

const sectorsClearedCount = (): number => {
  const run = useRunStore.getState();
  return Math.max(0, Math.min(SECTOR_COUNT, run.stats.bosses));
};

const goalContextFor = (win: boolean): GoalContext => {
  const run = useRunStore.getState();
  return {
    win,
    stats: run.stats,
    hull: run.hull,
    hullMax: run.hullMax,
    scrap: run.scrap,
    deckSize: run.deck.length,
    deckSchools: new Set(
      run.deck
        .map((d) => DIE_BY_ID.get(d.defId)?.school)
        .filter((school): school is School => school !== undefined),
    ).size,
    axis: run.axis,
    solvedPuzzles: run.solvedPuzzles,
    flags: run.flags,
  };
};

// Contract stars ride the ordinary XP pipeline: only bits the profile has never
// held before are counted, so a replay grants nothing.
const settleContract = (win: boolean): { stars: number; newStars: number } => {
  const run = useRunStore.getState();
  const def = contractDef(run.contractId);
  if (def === undefined) return { stars: 0, newStars: 0 };
  const mask = goalStarsMask(def.goals, goalContextFor(win));
  const gained = useMetaStore.getState().recordContractStars(def.id, mask);
  if (gained > 0) {
    trackEvent({
      name: "contract_star",
      params: { contract: def.id, stars: countStars(mask) },
    });
  }
  return { stars: countStars(mask), newStars: gained };
};

export const endRun = (win: boolean): void => {
  syncActionStats();
  const run = useRunStore.getState();
  const meta = useMetaStore.getState();
  const contract = run.mode === "contract" ? settleContract(win) : null;
  const counts = {
    nodes: run.stats.nodesCleared,
    elites: run.stats.elites,
    minibosses: run.stats.minibosses,
    bosses: run.stats.bosses,
    contractStars: contract?.newStars ?? 0,
  };
  const cleared = sectorsClearedCount();
  const xpMult =
    1 +
    computeRunMods(run.perks, run.chartPicks, run.modules).xpMultPct / 100;
  const xpGain = Math.round(runXp(counts, run.ascension) * xpMult);
  const shardGain = run.mode === "campaign" ? campaignShards(cleared) : 0;
  const award = meta.awardRun(xpGain, shardGain, win);
  meta.archiveRunFlags(Object.keys(run.flags));
  if (win && run.mode === "campaign") {
    meta.recordCampaignClear(run.ascension);
    // «Смотритель»: the A10 clear badge, awarded exactly once.
    if (run.ascension >= MAX_ASCENSION) meta.awardBadge(SMOTRITEL_BADGE);
  }
  meta.bumpLifetime({
    kills: run.stats.kills,
    scrapEarned: run.stats.scrapEarned,
    driftRuns: run.mode === "drift" ? 1 : 0,
    dailyRuns: run.mode === "daily" ? 1 : 0,
    contractRuns: run.mode === "contract" ? 1 : 0,
    ...(run.mode === "drift" ? { deepestDrift: run.stats.depth } : {}),
  });
  const milestones = MILESTONES.filter(
    (m) => m.level > award.fromLevel && m.level <= award.toLevel,
  ).map((m) => m.label);
  useSummaryStore.getState().setResult({
    xpGain,
    shardGain,
    fromLevel: award.fromLevel,
    toLevel: award.toLevel,
    win,
    milestones,
    mode: run.mode,
    score: isScoredMode(run.mode) ? scoreBreakdown(run.stats) : null,
    contractId: run.contractId,
    contractStars: contract?.stars ?? 0,
    rotation: runRotation(run),
  });
  if (!win) {
    trackEvent({
      name: "death",
      params: {
        sector: run.sector,
        depth: depthFor(run.sectorIndex, run.depthRow),
        cause: run.hull <= 0 ? "hull" : "abandon",
      },
    });
  }
  useRunStore.setState({ active: false });
  if (isScoredMode(run.mode)) void finishScoredRun();
  useAppStore.getState().go(isScoredMode(run.mode) ? "driftSummary" : "summary");
  autosaveRun();
};

export const autosaveRun = (): void => {
  try {
    saveRunSnapshot(captureRunSnapshot() as unknown as RunSnapshot);
  } catch (error) {
    console.error("flow: autosave failed", error);
  }
};

const RARE_RARITIES: ReadonlySet<string> = new Set(["rare", "legendary"]);

const announceVictory = (
  enemyDefIds: readonly string[],
  hull: number,
): void => {
  const run = useRunStore.getState();
  const meta = useMetaStore.getState();
  let firstNew: string | undefined;
  for (const defId of enemyDefIds) {
    // First kill of a type unlocks its Codex dossier (DESIGN §2.1).
    meta.unlockCodex(dossierId(defId));
    if (run.markKilledType(defId) && firstNew === undefined) firstNew = defId;
  }
  if (hull <= 5) emitBark("nearDeathWin");
  else if (firstNew !== undefined) emitBark(`firstKill:${firstNew}`);
  else emitBark("battleWin");
};

// Echo's arc advances one slot per boss / mini-boss first kill of the campaign
// (11 gates + the finale = 12 slots).
export const unlockNextMemory = (): void => {
  const run = useRunStore.getState();
  const next = run.memoriesUnlocked + 1;
  const memory = memoryAt(next);
  if (memory === undefined) return;
  useRunStore.getState().unlockNextMemory();
  useMetaStore.getState().unlockCodex(memory.codexId);
  emitBark("memory");
};

const encounterInit = (pocket: boolean) => {
  const s = useRunStore.getState();
  const mods = ascensionMods(s.ascension);
  const mut = computeMutatorMods(s.mutators);
  return {
    ascension: s.ascension,
    sectorHpPct: sectorHpPct({ sector: s.sector, pocket }),
    enemyHpBonusPct:
      mods.enemyHpPct +
      mut.enemyHpPct +
      mut.copyHpPct +
      driftLoopHpPct(driftLoop(s.sectorIndex)),
    eliteShield: mods.eliteShield,
  };
};

// Mutators and contract setups are constant for the run, so every battle in the
// run enters through the same shaped encounter.
const runBattleInit = (nodeKey: string, pocket = false) => {
  const s = useRunStore.getState();
  const setup = setupForRun(s);
  const mut = computeMutatorMods(s.mutators);
  const slotTierDelta: Partial<Record<SlotId, number>> = {
    ...chartSlotTierDelta(s.chartPicks),
  };
  if (mut.sensorsTierDelta !== 0) {
    slotTierDelta.sensors =
      (slotTierDelta.sensors ?? 0) + mut.sensorsTierDelta;
  }
  const disabledSlots: SlotId[] = [
    ...(setup.sensorsDisabled === true ? (["sensors"] as SlotId[]) : []),
    ...(setup.shieldsDisabled === true
      ? (["shields", "shieldsB"] as SlotId[])
      : []),
  ];
  const resonanceBoost =
    mut.resonanceBonus > 0
      ? {
          school: createStream(
            deriveSeed(s.seed, `storm:${nodeKey}`),
          ).pick(STORM_SCHOOLS),
          n: mut.resonanceBonus,
        }
      : undefined;
  return {
    shipId: s.shipId,
    tide: s.tide,
    interference: s.interferenceStacks,
    perks: s.perks,
    chartPicks: s.chartPicks,
    mutators: s.mutators,
    modules: s.modules,
    engravings: useMetaStore.getState().engravings,
    flags: Object.keys(s.flags),
    runCounters: s.counters,
    hull: s.hull,
    hullMax: s.hullMax,
    chargeCap: Math.max(
      1,
      runChargeCap(s.perks, s.chartPicks, s.modules) + mut.chargeCapDelta,
    ),
    rerollSizeBonus: s.rerollSizeRun,
    forcedTraits: setup.forcedTraits,
    slotTierDelta,
    disabledSlots,
    resonanceBoost,
    ...encounterInit(pocket),
  };
};

const withEnemyCopies = (enemyIds: string[]): string[] => {
  const copies = computeMutatorMods(useRunStore.getState().mutators).enemyCopies;
  if (copies <= 0) return enemyIds;
  const first = enemyIds[0];
  if (first === undefined) return enemyIds;
  return [...enemyIds, ...Array.from({ length: copies }, () => first)];
};

const startBattleNode = (node: MapNode): void => {
  const s = useRunStore.getState();
  const mods = s.consumeBattleMods();
  const streams = createStreams(deriveSeed(s.seed, `node:${node.id}`));
  const encStream = createStream(deriveSeed(s.seed, `enc:${node.id}`));
  const enemyIds = buildEncounterIds(node.type, encStream, {
    sector: s.sector,
    flags: s.flags,
    usedMinibosses: s.usedMinibosses,
    seed: s.seed,
  });
  if (enemyIds.includes("bountyHuntress")) s.setFlag("hunterEngaged");
  if (node.type === "miniboss" && enemyIds[0] !== undefined) {
    s.markMinibossUsed(enemyIds[0]);
    emitBark("minibossIntro");
  }
  for (let i = 0; i < mods.enemyPlus; i += 1) enemyIds.push("scavDrone");
  useBattleStore.getState().startBattle(
    {
      enemyIds: withEnemyCopies(enemyIds),
      startCharge: mods.startCharge,
      ...runBattleInit(node.id, node.pocket === true),
    },
    s.deck.map((d) => d.defId),
    streams,
  );
  useAppStore.getState().go("battle");
};

export const startEventBattle = (follow: ForcedBattle): void => {
  const s = useRunStore.getState();
  if (s.map === null || s.position === null) return;
  const mods = s.consumeBattleMods();
  const enemyIds = [...follow.enemyIds];
  for (let i = 0; i < mods.enemyPlus; i += 1) enemyIds.push("scavDrone");
  const streams = createStreams(deriveSeed(s.seed, `evbattle:${s.position}`));
  s.setPendingBattle({
    enemyIds: [...follow.enemyIds],
    originNodeId: s.position,
    scrap: follow.scrap ?? 0,
    lootDie: follow.loot?.die ?? null,
    lootRarity: follow.loot?.rarity ?? null,
    setFlags: (follow.setFlags ?? []).map(
      ([k, v]) => [k, v] as [string, FlagValue],
    ),
    clearFlags: [...(follow.clearFlags ?? [])],
  });
  useBattleStore.getState().startBattle(
    {
      enemyIds: withEnemyCopies(enemyIds),
      startCharge: mods.startCharge,
      ...runBattleInit(
        `ev:${s.position}`,
        nodeById(s.map).get(s.position)?.pocket === true,
      ),
    },
    s.deck.map((d) => d.defId),
    streams,
  );
  useAppStore.getState().go("battle");
  autosaveRun();
};

const routeToNode = (node: MapNode): void => {
  const go = useAppStore.getState().go;
  applyNodeMotifs(node, useRunStore.getState().sector);
  emitRunHook("nodeEnter", {
    node: {
      nodeId: node.id,
      nodeType: node.type,
      sector: useRunStore.getState().sector,
      row: node.row,
      pocket: node.pocket === true,
    },
  });
  switch (node.type) {
    case "battle":
    case "elite":
    case "miniboss":
    case "boss":
      startBattleNode(node);
      return;
    case "shop":
      go("shop");
      return;
    case "shipyard":
      useRunStore.getState().bumpStats({ shipyardVisits: 1 });
      go("shipyard");
      return;
    case "anomaly":
      go("puzzle");
      return;
    case "event":
    case "beacon":
      go("event");
      return;
    case "start":
      go("map");
      return;
  }
};

export interface StartRunOptions {
  mode?: RunMode;
  seed?: number;
  ascension?: number;
  contractId?: string | null;
  dailyDate?: string | null;
  mutators?: readonly string[];
}

const mapOptionsFor = (mutators: readonly string[], mode: RunMode) => ({
  bossAsGate: mode === "drift",
  noShops: computeMutatorMods(mutators).noShops,
});

export const startRun = (seed = Date.now() >>> 0, ascension = 0): void => {
  startRunMode({ mode: "campaign", seed, ascension });
};

export const startRunMode = (options: StartRunOptions = {}): void => {
  const mode = options.mode ?? "campaign";
  const rootSeed = (options.seed ?? Date.now()) >>> 0;
  const contract = contractDef(options.contractId ?? null);
  const setup = contract?.setup ?? {};
  const mutators = [...(options.mutators ?? setup.mutators ?? [])];
  const sectorIndex = Math.max(1, setup.sector ?? 1);
  const streams = createStreams(rootSeed);
  const map = generateSectorMap(
    streams.map,
    contentSector(sectorIndex),
    mapOptionsFor(mutators, mode),
  );
  const meta = useMetaStore.getState();
  const shipId = setup.ship ?? meta.selectedShip;
  const chartPicks = setup.chartDisabled === true ? [] : [...meta.chartPicks];
  const deckIds =
    setup.deckPreset ??
    (meta.hangar.deck.length >= 3 ? meta.hangar.deck : STARTER_DECK);
  const chartMods = computeRunMods([], chartPicks);
  // A10 and «Fate's Favorite» both cut a percentage off the ship before the
  // chart's flat bonuses land.
  const ascension = Math.max(0, options.ascension ?? 0);
  const hullPct = ascensionMods(ascension).hullPct + chartMods.hullMaxPct;
  const hullMax = Math.max(
    1,
    Math.round(shipHullMax(shipId) * (1 + hullPct / 100)) +
      chartMods.hullMaxDelta,
  );
  const values: RunValues = {
    ...createInitialRunValues(),
    active: true,
    seed: rootSeed,
    mode,
    mutators,
    contractId: options.contractId ?? null,
    dailyDate: options.dailyDate ?? null,
    sector: contentSector(sectorIndex),
    sectorIndex,
    depthRow: 0,
    position: START_NODE_ID,
    map,
    visited: [START_NODE_ID],
    hull: hullMax,
    hullMax,
    scrap: STARTING_SCRAP,
    shipId,
    chartPicks,
    tide: Math.max(0, setup.tideStart ?? 0),
    ascension,
    startedAt: Date.now(),
    deck: deckIds.map((defId, index) => ({
      uid: `d${String(index)}`,
      defId,
    })),
    deckSeq: deckIds.length,
  };
  useRunStore.getState().hydrate(values);
  useBattleStore.getState().reset();
  useSummaryStore.getState().clear();
  resetActionLog();
  resetBarkMemory();
  useAppStore.getState().go("map");
  emitBark(`sectorEnter:${String(values.sector)}`);
  trackEvent({ name: "run_start", params: { mode, ship: shipId } });
  autosaveRun();
};

export const startDriftRun = (seed = Date.now() >>> 0): void => {
  startRunMode({ mode: "drift", seed });
};

export const startContractRun = (contractId: string): void => {
  startRunMode({ mode: "contract", contractId });
};

export const startDailyRun = (date: string): void => {
  startRunMode({
    mode: "daily",
    seed: dailySeed(date),
    dailyDate: date,
    mutators: dailyMutators(date),
  });
};

// Sector transition: fresh map, tide reset, position back to the start node. The
// interstitial screen owns the wash + fragment line before the map returns.
// Drift keeps climbing sectorIndex past five; the content sector stays clamped.
export const advanceSector = (): void => {
  const s = useRunStore.getState();
  const endless = s.mode === "drift";
  const nextIndex = endless
    ? s.sectorIndex + 1
    : Math.min(SECTOR_COUNT, s.sectorIndex + 1);
  const nextSector = contentSector(nextIndex);
  const map = generateSectorMap(
    createStream(deriveSeed(s.seed, `map:${String(nextIndex)}`)),
    nextSector,
    mapOptionsFor(s.mutators, s.mode),
  );
  useRunStore.setState({
    sector: nextSector,
    sectorIndex: nextIndex,
    map,
    position: START_NODE_ID,
    depthRow: 0,
    visited: [START_NODE_ID],
    tide: 0,
    jumpsSinceTide: 0,
    shop: null,
    pendingRewards: null,
    pendingBattle: null,
    pendingDeepScan: false,
    bonusReveal: 0,
  });
  useRunStore.getState().noteDepth(depthFor(nextIndex, 0));
  useAppStore.getState().go("interstitial");
  emitBark(`sectorEnter:${String(nextSector)}`);
  autosaveRun();
  pushRunCloud();
};

export const jumpTo = (toNodeId: NodeId): boolean => {
  const s = useRunStore.getState();
  if (!s.active || s.map === null || s.position === null) return false;
  if (s.position === toNodeId) return false;
  if (s.visited.includes(toNodeId)) return false;
  if (!areConnected(s.map, s.position, toNodeId)) return false;
  const node = nodeById(s.map).get(toNodeId);
  if (node === undefined) return false;

  const jumps = s.jumpsSinceTide + 1;
  const cap = tideCapFor(s.ascension, s.mode);
  let tide = s.tide;
  let jumpsSinceTide = jumps;
  if (jumps >= jumpsPerTideFor(s.mutators)) {
    tide = Math.min(cap, tide + 1);
    jumpsSinceTide = 0;
  }

  recordAction(`jump:${toNodeId}`);
  applyEdgeMotifs(s.map, s.position, toNodeId, s.sector);
  useRunStore.setState({
    position: toNodeId,
    depthRow: node.row,
    jumpsSinceTide,
    tide,
    pendingDeepScan: false,
    bonusReveal: 0,
  });
  useRunStore.getState().bumpStats({ jumps: 1 });
  useRunStore.getState().noteDepth(depthFor(s.sectorIndex, node.row));
  if (tide > s.tide) emitBark("tideUp");
  routeToNode(node);
  autosaveRun();
  return true;
};

const afterBossVictory = (): void => {
  const run = useRunStore.getState();
  const meta = useMetaStore.getState();
  const bossId = pickBoss(run.sector, run.seed);
  if (meta.recordBossFirstKill(bossId)) {
    meta.addShards(bossFirstKillShards(run.sector));
  }
  // A contract is one sector: clearing its boss ends the run and scores the stars.
  if (run.mode === "contract") {
    endRun(true);
    return;
  }
  if (run.sectorIndex >= SECTOR_COUNT) {
    useAppStore.getState().go("finale");
    autosaveRun();
    pushRunCloud();
    return;
  }
  advanceSector();
};

// Campaign ends a sector on its boss; drift replaces that boss with a gate, so
// the exit is the row rather than the node type.
const isSectorExit = (node: MapNode): boolean => {
  const run = useRunStore.getState();
  return run.mode === "drift"
    ? isSectorExitRow(run.sectorIndex, node.row)
    : node.type === "boss";
};

const finalizeNode = (
  node: MapNode,
  result: NodeResult,
  pendingRewards: RunValues["pendingRewards"],
): void => {
  const run = useRunStore.getState();

  if (result.scrap !== undefined && result.scrap > 0) run.addScrap(result.scrap);
  if (result.setHull !== undefined) run.setHull(result.setHull);
  if (result.deepScan === true) run.setPendingDeepScan(true);
  const typeDelta =
    node.type === "elite"
      ? { elites: 1 }
      : node.type === "miniboss"
        ? { minibosses: 1 }
        : node.type === "boss"
          ? { bosses: 1 }
          : {};
  run.bumpStats({ nodesCleared: 1, kills: result.kills ?? 0, ...typeDelta });
  trackEvent({
    name: "node_complete",
    params: {
      type: node.type,
      sector: run.sector,
      depth: depthFor(run.sectorIndex, run.depthRow),
    },
  });
  if (!run.visited.includes(node.id)) {
    useRunStore.setState({ visited: [...run.visited, node.id] });
  }
  const afterHull = useRunStore.getState();
  afterHull.noteHullPct(
    afterHull.hullMax > 0 ? (afterHull.hull / afterHull.hullMax) * 100 : 0,
  );
  syncActionStats();

  const hasRewards =
    pendingRewards !== null &&
    (pendingRewards.dieDrop !== null ||
      pendingRewards.perkChoices.length > 0 ||
      (pendingRewards.dieChoices ?? []).length > 0);
  run.setPendingRewards(hasRewards ? pendingRewards : null);

  if (
    pendingRewards?.dieDrop != null &&
    RARE_RARITIES.has(DIE_BY_ID.get(pendingRewards.dieDrop)?.rarity ?? "")
  ) {
    emitBark("rareLoot");
  }

  if (hasRewards) {
    useAppStore.getState().go("rewards");
    autosaveRun();
    pushRunCloud();
  } else if (isSectorExit(node)) {
    leaveSector(node);
  } else {
    useAppStore.getState().go("map");
    autosaveRun();
    pushRunCloud();
  }
};

const leaveSector = (node: MapNode): void => {
  if (node.type === "boss") {
    afterBossVictory();
    return;
  }
  advanceSector();
};

export const completeNode = (result: NodeResult): void => {
  const run = useRunStore.getState();
  if (run.map === null || run.position === null) return;
  const node = nodeById(run.map).get(run.position);
  if (node === undefined) return;

  if (result.outcome === "defeat") {
    endRun(false);
    return;
  }
  finalizeNode(node, result, null);
};

export const finishRewards = (): void => {
  const run = useRunStore.getState();
  run.setPendingRewards(null);
  const node =
    run.map === null || run.position === null
      ? undefined
      : nodeById(run.map).get(run.position);
  if (node !== undefined && isSectorExit(node)) {
    leaveSector(node);
  } else {
    useAppStore.getState().go("map");
    autosaveRun();
    pushRunCloud();
  }
};

// DESIGN §6.4: choice of a rare die OR a module, plus a Mk voucher, scrap and a
// perk draft. Phase 8 substituted a second rare die because modules did not
// exist yet; Phase 10 restores the real fork.
const minibossPackage = (
  lootStream: ReturnType<typeof createStream>,
  perks: readonly string[],
  modules: readonly string[],
  rarityStep: number,
): NonNullable<RunValues["pendingRewards"]> => ({
  dieDrop: null,
  perkChoices: rollPerkChoices(lootStream, perks, "uncommon"),
  dieChoices: [dieForRarity(lootStream, "rare", rarityStep)],
  moduleChoices: [rollModule(lootStream, modules, "uncommon")],
  voucher: true,
  packageScrap: lootStream.int(
    MINIBOSS_PACKAGE_SCRAP[0],
    MINIBOSS_PACKAGE_SCRAP[1],
  ),
});

// Captured before the battle store resets, so the goal counters see the fight
// that just happened rather than an empty store.
const takeBattleTally = (): BattleTally =>
  battleTally(useBattleStore.getState());

export const resolveRunBattle = (): void => {
  const b = useBattleStore.getState();
  if (b.outcome === undefined) return;
  const run = useRunStore.getState();
  if (run.map === null || run.position === null) return;
  const node = nodeById(run.map).get(run.position);
  if (node === undefined) return;

  if (b.outcome === "defeat") {
    trackEvent({
      name: "battle_result",
      params: { win: false, turns: b.turn, sector: run.sector },
    });
    run.noteBattleTally(takeBattleTally());
    useBattleStore.getState().reset();
    endRun(false);
    return;
  }

  trackEvent({
    name: "battle_result",
    params: { win: true, turns: b.turn, sector: run.sector },
  });
  const kills = b.enemies.length;
  const battleScrap = b.scrap;
  const stolen = b.stolenScrap;
  const battleHull = b.hull;
  const enemyDefIds = b.enemies.map((e) => e.defId);
  const tally = takeBattleTally();
  const axisDelta = battleEndAxisDelta(
    b.blackUsed,
    b.blueUsed,
    countDeckSchool(run.deck, "black"),
    countDeckSchool(run.deck, "blue"),
  );
  useBattleStore.getState().reset();
  run.noteBattleTally(tally);
  if (axisDelta !== 0) run.addAxis(axisDelta);
  if (stolen > 0) run.spendScrap(Math.min(stolen, run.scrap));
  announceVictory(enemyDefIds, battleHull);
  if (node.type === "miniboss" || node.type === "boss") unlockNextMemory();

  const lootStream = createStream(deriveSeed(run.seed, `loot:${node.id}`));
  const mods = computeRunMods(run.perks, run.chartPicks, run.modules);
  const mut = computeMutatorMods(run.mutators);
  const sectorScrapMult = sectorDef(run.sector).scrapMult;
  const reward = computeNodeReward(
    node.type,
    lootStream,
    mut.lootRarityStep,
    node.pocket === true,
  );
  const rewardScrap = Math.round(
    reward.scrap *
      sectorScrapMult *
      (1 + (mods.scrapMultPct + mut.scrapMultPct) / 100),
  );

  const pending: NonNullable<RunValues["pendingRewards"]> =
    node.type === "miniboss"
      ? minibossPackage(
          lootStream,
          run.perks,
          run.modules,
          mut.lootRarityStep,
        )
      : {
          dieDrop: reward.dieDrop,
          perkChoices:
            isDraftNode(node.type) && !contractPerksDisabled()
              ? rollPerkChoices(lootStream, run.perks)
              : [],
          // Elites hand out a module alongside their die (DESIGN §9.4).
          ...(node.type === "elite"
            ? { moduleChoices: [rollModule(lootStream, run.modules, "common")] }
            : {}),
        };

  const packageScrap = pending.packageScrap ?? 0;

  finalizeNode(
    node,
    {
      outcome: "cleared",
      scrap: rewardScrap + battleScrap + packageScrap,
      setHull: Math.min(
        run.hullMax,
        battleHull + mods.battleEndHeal + run.battleEndHealRun,
      ),
      kills,
    },
    pending,
  );

  if (node.type === "miniboss") {
    useRunStore.getState().addVoucher(1);
    pushRunCloud();
  }
};

export const resolveEventBattle = (): void => {
  const b = useBattleStore.getState();
  if (b.outcome === undefined) return;
  const run = useRunStore.getState();
  const pending = run.pendingBattle;
  if (pending === null || run.map === null) {
    resolveRunBattle();
    return;
  }

  if (b.outcome === "defeat") {
    trackEvent({
      name: "battle_result",
      params: { win: false, turns: b.turn, sector: run.sector },
    });
    run.noteBattleTally(takeBattleTally());
    useBattleStore.getState().reset();
    endRun(false);
    return;
  }

  trackEvent({
    name: "battle_result",
    params: { win: true, turns: b.turn, sector: run.sector },
  });
  const kills = b.enemies.length;
  const battleScrap = b.scrap;
  const stolen = b.stolenScrap;
  const battleHull = b.hull;
  const enemyDefIds = b.enemies.map((e) => e.defId);
  const tally = takeBattleTally();
  const axisDelta = battleEndAxisDelta(
    b.blackUsed,
    b.blueUsed,
    countDeckSchool(run.deck, "black"),
    countDeckSchool(run.deck, "blue"),
  );
  useBattleStore.getState().reset();
  run.noteBattleTally(tally);
  if (axisDelta !== 0) run.addAxis(axisDelta);
  if (stolen > 0) run.spendScrap(Math.min(stolen, run.scrap));
  announceVictory(enemyDefIds, battleHull);

  const mods = computeRunMods(run.perks, run.chartPicks, run.modules);
  if (pending.lootDie !== null || pending.lootRarity !== null) {
    const lootStream = createStream(
      deriveSeed(run.seed, `evloot:${pending.originNodeId}`),
    );
    const defId =
      pending.lootDie ??
      dieForRarity(
        lootStream,
        pending.lootRarity ?? "uncommon",
        computeMutatorMods(run.mutators).lootRarityStep,
      );
    if (run.deck.length < DECK_CAP) run.addDie(defId);
    else run.addScrap(sellValue(ptsForDie(defId)));
  }
  for (const [key, value] of pending.setFlags) run.setFlag(key, value);
  for (const key of pending.clearFlags) run.clearFlag(key);
  run.setPendingBattle(null);

  const node = nodeById(run.map).get(pending.originNodeId);
  if (node === undefined) {
    useAppStore.getState().go("map");
    autosaveRun();
    return;
  }
  finalizeNode(
    node,
    {
      outcome: "cleared",
      scrap: battleScrap + pending.scrap,
      setHull: Math.min(
        run.hullMax,
        battleHull + mods.battleEndHeal + run.battleEndHealRun,
      ),
      kills,
    },
    null,
  );
};

export const resolveActiveBattle = (): void => {
  if (useRunStore.getState().pendingBattle !== null) resolveEventBattle();
  else resolveRunBattle();
};

export const applyPerkPick = (perkId: string): void => {
  const run = useRunStore.getState();
  run.addPerk(perkId);
  const mods = computePerkMods([perkId]);
  if (mods.hullMaxDelta > 0) {
    useRunStore.setState({ hullMax: run.hullMax + mods.hullMaxDelta });
    useRunStore.getState().healHull(mods.hullMaxDelta);
  }
};

export const resolveDieReward = (keep: boolean): void => {
  const run = useRunStore.getState();
  const pending = run.pendingRewards;
  if (pending === null || pending.dieDrop === null) return;
  const dieId = pending.dieDrop;
  if (keep && run.deck.length < DECK_CAP) {
    run.addDie(dieId);
  } else {
    run.addScrap(sellValue(ptsForDie(dieId)));
  }
  useRunStore
    .getState()
    .setPendingRewards({ ...pending, dieDrop: null });
  autosaveRun();
};

export const resolveDieChoice = (dieId: string): void => {
  const run = useRunStore.getState();
  const pending = run.pendingRewards;
  if (pending === null || (pending.dieChoices ?? []).length === 0) return;
  if (run.deck.length < DECK_CAP) run.addDie(dieId);
  else run.addScrap(sellValue(ptsForDie(dieId)));
  useRunStore
    .getState()
    .setPendingRewards({ ...pending, dieChoices: [], moduleChoices: [] });
  autosaveRun();
};

// The package is one fork: taking the module closes the die offer and vice
// versa. A full module bay pays the scrap value instead.
export const resolveModuleChoice = (moduleId: string): void => {
  const run = useRunStore.getState();
  const pending = run.pendingRewards;
  if (pending === null || (pending.moduleChoices ?? []).length === 0) return;
  if (!run.addModule(moduleId)) {
    run.addScrap(MODULE_BY_ID.get(moduleId)?.price ?? 0);
  }
  useRunStore
    .getState()
    .setPendingRewards({ ...pending, dieChoices: [], moduleChoices: [] });
  autosaveRun();
};

export const resolvePerkChoice = (perkId: string | null): void => {
  const run = useRunStore.getState();
  const pending = run.pendingRewards;
  if (pending === null) return;
  if (perkId === null) {
    run.addScrap(SKIP_SCRAP);
  } else {
    applyPerkPick(perkId);
  }
  useRunStore.getState().setPendingRewards({ ...pending, perkChoices: [] });
  autosaveRun();
};

// The prologue opens a real campaign run and then routes its scripted fight
// through the ordinary event-battle path, so victory lands on the sector map.
export const startPrologueBattle = (seed = Date.now() >>> 0): void => {
  startRun(seed, 0);
  const s = useRunStore.getState();
  s.setPendingBattle({
    enemyIds: [PROLOGUE_ENEMY],
    originNodeId: START_NODE_ID,
    scrap: 15,
    lootDie: null,
    lootRarity: null,
    setFlags: [["prologueRun", true]],
    clearFlags: [],
  });
  useBattleStore.getState().startBattle(
    {
      enemyIds: [PROLOGUE_ENEMY],
      shipId: s.shipId,
      hull: s.hull,
      hullMax: s.hullMax,
      chargeCap: runChargeCap(s.perks, s.chartPicks),
      scriptedSlots: PROLOGUE_SCRIPT,
    },
    s.deck.map((d) => d.defId),
    createStreams(deriveSeed(s.seed, "prologue")),
  );
  useAppStore.getState().go("battle");
  autosaveRun();
};

export const chooseEnding = (endingId: string): void => {
  const run = useRunStore.getState();
  run.setEnding(endingId);
  useMetaStore.getState().unlockCodex(finalMemoryCodexId(endingId));
  useMetaStore.getState().recordEnding(endingId);
  useRunStore.setState({ memoriesUnlocked: 12 });
  trackEvent({
    name: "ending",
    params: { id: endingId, ascension: run.ascension },
  });
  useAppStore.getState().go("ending");
  autosaveRun();
};

export const finishEnding = (): void => {
  endRun(true);
};

export const runBeaconsResolved = (): number =>
  beaconsResolved(useRunStore.getState().flags);

export const sectorShardPreview = (): number =>
  sectorClearShards(useRunStore.getState().sector);

export const currentBossName = (sector: number): string =>
  ENEMY_BY_ID.get(pickBoss(sector, useRunStore.getState().seed))?.name ?? "";

export const abandonRun = (): void => {
  useRunStore.getState().reset();
  useBattleStore.getState().reset();
  resetActionLog();
  clearRun();
  useAppStore.getState().go("menu");
};

// Every mode start funnels through here so the single-run-slot promise holds:
// an active run is discarded exactly once, before the new run is hydrated.
export const discardActiveRun = (): void => {
  useRunStore.getState().reset();
  useBattleStore.getState().reset();
  resetActionLog();
  clearRun();
};

export const hasActiveRun = (): boolean => useRunStore.getState().active;

export interface FlowDevHooks {
  startRunMode: typeof startRunMode;
  startDriftRun: typeof startDriftRun;
  startDailyRun: typeof startDailyRun;
  startContractRun: typeof startContractRun;
  advanceSector: typeof advanceSector;
  endRun: typeof endRun;
  jumpTo: typeof jumpTo;
  abandonRun: typeof abandonRun;
}

declare global {
  interface Window {
    __flow?: FlowDevHooks;
  }
}

// Same DEV-only escape hatch the stores expose, so the Playwright driver can
// exercise real mode transitions instead of faking store state.
if (import.meta.env.DEV && typeof window !== "undefined") {
  window.__flow = {
    startRunMode,
    startDriftRun,
    startDailyRun,
    startContractRun,
    advanceSector,
    endRun,
    jumpTo,
    abandonRun,
  };
}
