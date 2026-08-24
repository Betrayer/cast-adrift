import { ascensionMods, MAX_ASCENSION } from "@/data/ascension";
import { dossierId } from "@/data/codex";
import { contractDef } from "@/data/contracts";
import { DIE_BY_ID } from "@/data/dice";
import { MODULE_BY_ID } from "@/data/modules";
import { STARTER_DECK } from "@/data/decks";
import { computeMutatorMods } from "@/data/mutators";
import { ENEMY_BY_ID } from "@/data/enemies";
import { beaconsResolved } from "@/data/events/beacons";
import { sealFinalMemory, syncMemoryArc } from "@/game/narrative/memoryArc";
import {
  CHECK_DECK,
  CHECK_ENEMY_HP_PCT,
  PROLOGUE_ENEMY,
  SYSTEMS_CHECK,
} from "@/data/narrative/prologue";
import { SECTOR_COUNT, SECTORS, sectorDef } from "@/data/sectors";
import { shipHullMax } from "@/game/battle/setup";
import type { ShipId } from "@/data/ships";
import { beginCheckFunnel } from "@/game/onboarding";
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
  wormholeFor,
  type MapNode,
  type NodeId,
} from "@/game/map/types";
import {
  bypassTargetFor,
  rollThrow,
  type WormholeThrow,
} from "@/game/map/wormhole";
import { chaos } from "@/services/chaos";
import { DECK_CAP, ptsForDie, sellValue } from "@/game/economy/prices";
import { pushRunCloud } from "@/game/run/cloud";
import {
  buildEncounterIds,
  pickBoss,
  sectorDmgPct,
  sectorHpPct,
} from "@/game/run/encounter";
import {
  applyEdgeMotifs,
  applyHoleToll,
  applyNodeMotifs,
} from "@/game/run/motifs";
import { logJournal, settleSectorDrift } from "@/game/run/journal";
import { emitBark, resetBarkMemory } from "@/game/narrative";
import { computePerkMods } from "@/game/run/perkMods";
import { computeRunMods, runChargeCap } from "@/game/run/runMods";
import {
  DRAFT_REROLL_COST,
  rollPerkChoices,
  skipScrapFor,
  type DraftContext,
} from "@/game/run/perkDraft";
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
  runXp,
  shardBreakdown,
  ZERO_SHARD_BREAKDOWN,
} from "@/game/xp";
import { milestonesBetween } from "@/data/milestones";
import {
  settleAchievements,
  settleLifetimeAchievements,
} from "@/game/meta/achievements";
import {
  freshUnlocks,
  grantDieUnlock,
  metaHasFeature,
  unlockContextOf,
} from "@/game/meta/unlockState";
import { useSummaryStore } from "@/stores/summaryStore";
import { captureRunSnapshot } from "@/game/run/snapshot";
import { trackEvent } from "@/services/analytics";
import { now } from "@/services/clock";
import { createStream, createStreams, deriveSeed } from "@/services/rng";
import { clearRun, saveRunSnapshot } from "@/services/save";
import { useAppStore } from "@/stores/appStore";
import { battleTally, useBattleStore } from "@/stores/battleStore";
import {
  SMOTRITEL_BADGE,
  useMetaStore,
  type MetaStats,
} from "@/stores/metaStore";
import { useNarrativeStore } from "@/stores/narrativeStore";
import { createInitialRunValues, useRunStore } from "@/stores/runStore";
import { useSettingsStore } from "@/stores/settingsStore";
import type {
  BattleTally,
  RunMode,
  RunState,
  RunValues,
} from "@/stores/runStore";
import { PERK_BY_ID } from "@/data/perks";
import type { RunSnapshot, ScreenId } from "@/types";
import type { SlotId } from "@/types/battle";
import type { School } from "@/types/content";
import type { FlagValue, ForcedBattle } from "@/types/events";

import { BASE_TIDE_CAP, tideCapFor } from "@/game/run/tide";

export { BASE_TIDE_CAP, tideCapFor };

export const JUMPS_PER_TIDE = 4;
export const WORMHOLE_REVEAL = 1;
export const STARTING_SCRAP = 0;
export const MINIBOSS_PACKAGE_SCRAP: readonly [number, number] = [30, 40];

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

const runDeckSchools = (run: RunValues): number =>
  new Set(
    run.deck
      .map((d) => DIE_BY_ID.get(d.defId)?.school)
      .filter(
        (school): school is School =>
          school !== undefined && school !== "prismatic",
      ),
  ).size;

export const FULL_RESONANCE = 6;

const shipClearDelta = (
  shipId: ShipId,
  win: boolean,
  mode: RunMode,
): Partial<MetaStats> => {
  if (!win || mode !== "campaign") return {};
  switch (shipId) {
    case "wanderer":
      return { clearsWanderer: 1 };
    case "ram":
      return { clearsRam: 1 };
    case "ark":
      return { clearsArk: 1 };
    case "corsair":
      return { clearsCorsair: 1 };
    case "foundry":
      return { clearsFoundry: 1 };
    case "prism":
      return { clearsPrism: 1 };
    default:
      return {};
  }
};

const noteBattleLifetime = (
  tally: BattleTally,
  flawlessBoss: boolean,
): void => {
  const delta: Partial<MetaStats> = {
    ...(tally.maxResonance >= FULL_RESONANCE ? { resonance6: 1 } : {}),
    ...(flawlessBoss ? { flawlessBosses: 1 } : {}),
  };
  if (Object.keys(delta).length === 0) return;
  useMetaStore.getState().bumpLifetime(delta);
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
  const beacons = beaconsResolved(run.flags);
  const hullPct = run.hullMax <= 0 ? 0 : (run.hull / run.hullMax) * 100;
  meta.recordStreak(win && run.mode === "campaign");
  const streak = useMetaStore.getState().stats.noDeathStreak;
  const shards =
    run.mode === "campaign"
      ? shardBreakdown({
          win,
          sectorsCleared: cleared,
          beacons,
          hullPct,
          firstEnding: run.endingFirstTime,
          streak,
          ascension: run.ascension,
          deepClear: run.crossedThreshold,
        })
      : ZERO_SHARD_BREAKDOWN;
  const award = meta.awardRun(xpGain, shards.total, win);
  meta.archiveRunFlags(Object.keys(run.flags));
  if (win && run.mode === "campaign") {
    meta.recordCampaignClear(run.ascension);
    if (run.ascension >= MAX_ASCENSION) meta.awardBadge(SMOTRITEL_BADGE);
  }
  meta.bumpLifetime({
    scrapEarned: run.stats.scrapEarned,
    beacons,
    ...shipClearDelta(run.shipId, win, run.mode),
    driftRuns: run.mode === "drift" ? 1 : 0,
    dailyRuns: run.mode === "daily" ? 1 : 0,
    contractRuns: run.mode === "contract" ? 1 : 0,
    deepClears: win && run.crossedThreshold ? 1 : 0,
    ...(run.mode === "drift" ? { deepestDrift: run.stats.depth } : {}),
  });
  const finds = meta.recordEncounters(run.encounters);
  const settled = settleAchievements({
    win,
    hullPct,
    beacons,
    puzzles: run.solvedPuzzles.length,
    ascension: run.ascension,
    deckSchools: runDeckSchools(run),
    stats: run.stats,
  });
  const milestones = milestonesBetween(award.fromLevel, award.toLevel).map(
    (m) => m.label,
  );
  const after = useMetaStore.getState();
  const unlocks = freshUnlocks(unlockContextOf(after), after.unlocksSeen);
  useSummaryStore.getState().setResult({
    xpGain,
    shardGain: shards.total + finds.shards + settled.shards,
    shards,
    findShards: finds.shards,
    firstFinds: finds.firstFinds,
    achievements: settled.unlocked.map((def) => def.id),
    achievementShards: settled.shards,
    unlocks: unlocks.defs.map((def) => def.label),
    unlockIds: unlocks.ids,
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
  if (win) useAppStore.getState().go(summaryScreenFor(run.mode));
  else useAppStore.getState().go("ending", { death: "1" });
  autosaveRun();
};

export const summaryScreenFor = (mode: RunMode): ScreenId =>
  isScoredMode(mode) ? "driftSummary" : "summary";

export const leaveDeathEpilogue = (): void => {
  useAppStore
    .getState()
    .go(summaryScreenFor(useRunStore.getState().mode));
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
    meta.unlockCodex(dossierId(defId));
    if (run.markKilledType(defId) && firstNew === undefined) firstNew = defId;
  }
  if (hull <= 5) emitBark("nearDeathWin");
  else if (firstNew !== undefined) emitBark(`firstKill:${firstNew}`);
  else emitBark("battleWin");
};

export const unlockNextMemory = (): void => {
  if (syncMemoryArc().length > 0) emitBark("memory");
};

const encounterInit = (pocket: boolean) => {
  const s = useRunStore.getState();
  const mods = ascensionMods(s.ascension);
  const mut = computeMutatorMods(s.mutators);
  return {
    ascension: s.ascension,
    sectorHpPct: sectorHpPct({ sector: s.sector, pocket }),
    sectorDmgPct: sectorDmgPct({ sector: s.sector }),
    enemyHpBonusPct:
      mods.enemyHpPct +
      mut.enemyHpPct +
      mut.copyHpPct +
      driftLoopHpPct(driftLoop(s.sectorIndex)),
    eliteShield: mods.eliteShield,
  };
};

const runBattleInit = (
  nodeKey: string,
  pocket = false,
  causality: { inverted?: boolean; storm?: boolean } = {},
) => {
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
    runScrap: s.scrap,
    chargeCap: Math.max(
      1,
      runChargeCap(s.perks, s.chartPicks, s.modules) + mut.chargeCapDelta,
    ),
    rerollSizeBonus: s.rerollSizeRun,
    forcedTraits: setup.forcedTraits,
    slotTierDelta,
    disabledSlots,
    resonanceBoost,
    inverted: causality.inverted === true,
    nodeStorm: causality.storm === true,
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
      ...runBattleInit(node.id, node.pocket === true, {
        inverted: node.inverted,
        storm: node.storm,
      }),
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
        {
          inverted: nodeById(s.map).get(s.position)?.inverted,
          storm: nodeById(s.map).get(s.position)?.storm,
        },
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
  startDraft?: boolean;
}

const mapOptionsFor = (mutators: readonly string[], mode: RunMode) => ({
  bossAsGate: mode === "drift",
  noShops: computeMutatorMods(mutators).noShops,
});

export const startRun = (
  seed = now() >>> 0,
  ascension = 0,
  startDraft = false,
): void => {
  startRunMode({ mode: "campaign", seed, ascension, startDraft });
};

const openStartDraft = (rootSeed: number): void => {
  const run = useRunStore.getState();
  const stream = createStream(deriveSeed(rootSeed, "voucherDraft"));
  const choices = rollPerkChoices(stream, draftContext(run));
  if (choices.length === 0) return;
  run.setPendingRewards({
    dieDrop: null,
    perkChoices: choices,
    draftNodeId: START_NODE_ID,
  });
  noteDraftOffer(choices);
};

export const startRunMode = (options: StartRunOptions = {}): void => {
  const mode = options.mode ?? "campaign";
  const rootSeed = (options.seed ?? now()) >>> 0;
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
    startedAt: now(),
    deck: deckIds.map((defId, index) => ({
      uid: `d${String(index)}`,
      defId,
    })),
    deckSeq: deckIds.length,
  };
  useRunStore.getState().hydrate(values);
  useBattleStore.getState().reset();
  useSummaryStore.getState().clear();
  useNarrativeStore.getState().reset();
  resetActionLog();
  resetBarkMemory();
  if (
    options.startDraft === true &&
    !contractPerksDisabled() &&
    useMetaStore.getState().spendVoucher("perkDraft")
  ) {
    openStartDraft(rootSeed);
  }
  useAppStore.getState().go("interstitial");
  emitBark(`sectorEnter:${String(values.sector)}`);
  trackEvent({ name: "run_start", params: { mode, ship: shipId } });
  autosaveRun();
};

export const startDriftRun = (seed = now() >>> 0): void => {
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

export const advanceSector = (): void => {
  settleSectorDrift();
  const s = useRunStore.getState();
  const endless = s.mode === "drift";
  const lastIndex = s.crossedThreshold ? SECTORS.length : SECTOR_COUNT;
  const nextIndex = endless
    ? s.sectorIndex + 1
    : Math.min(lastIndex, s.sectorIndex + 1);
  const nextSector = endless ? contentSector(nextIndex) : nextIndex;
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
    pendingWormhole: null,
    lastWormhole: null,
    pendingDeepScan: false,
    bonusReveal: 0,
  });
  useRunStore.getState().noteDepth(depthFor(nextIndex, 0));
  useAppStore.getState().go("interstitial");
  emitBark(`sectorEnter:${String(nextSector)}`);
  autosaveRun();
  pushRunCloud();
};

interface TideStep {
  tide: number;
  jumpsSinceTide: number;
  raised: boolean;
}

const stepTide = (s: RunValues): TideStep => {
  const jumps = s.jumpsSinceTide + 1;
  const cap = tideCapFor(s.ascension, s.mode, s.sector);
  if (jumps < jumpsPerTideFor(s.mutators)) {
    return { tide: s.tide, jumpsSinceTide: jumps, raised: false };
  }
  const tide = Math.min(cap, s.tide + 1);
  return { tide, jumpsSinceTide: 0, raised: tide > s.tide };
};

export const jumpTo = (toNodeId: NodeId): boolean => {
  const s = useRunStore.getState();
  if (!s.active || s.map === null || s.position === null) return false;
  if (s.position === toNodeId) return false;
  if (s.visited.includes(toNodeId)) return false;
  if (!areConnected(s.map, s.position, toNodeId)) return false;
  const node = nodeById(s.map).get(toNodeId);
  if (node === undefined) return false;
  if (node.hole === true) return false;

  const step = stepTide(s);

  recordAction(`jump:${toNodeId}`);
  applyEdgeMotifs(s.map, s.position, toNodeId, s.sector);
  useRunStore.setState({
    position: toNodeId,
    depthRow: node.row,
    jumpsSinceTide: step.jumpsSinceTide,
    tide: step.tide,
    pendingWormhole: null,
    pendingDeepScan: false,
    bonusReveal: 0,
  });
  useRunStore.getState().bumpStats({ jumps: 1 });
  useRunStore.getState().noteDepth(depthFor(s.sectorIndex, node.row));
  if (step.raised) emitBark("tideUp");
  routeToNode(node);
  autosaveRun();
  return true;
};

export const openWormhole = (holeId: NodeId): boolean => {
  const s = useRunStore.getState();
  if (!s.active || s.map === null || s.position === null) return false;
  if (wormholeFor(s.map, s.position, holeId) === undefined) return false;
  if (s.pendingWormhole === holeId) return true;
  useRunStore.setState({ pendingWormhole: holeId });
  autosaveRun();
  return true;
};

const wormholeGate = (
  holeId: NodeId,
): { run: RunValues; map: NonNullable<RunValues["map"]>; from: NodeId } | null => {
  const s = useRunStore.getState();
  if (!s.active || s.map === null || s.position === null) return null;
  if (s.pendingWormhole !== holeId) return null;
  if (wormholeFor(s.map, s.position, holeId) === undefined) return null;
  return { run: s, map: s.map, from: s.position };
};

export const bypassHole = (holeId: NodeId): boolean => {
  const gate = wormholeGate(holeId);
  if (gate === null) return false;
  const target = bypassTargetFor(
    gate.map,
    gate.from,
    holeId,
    gate.run.visited,
  );
  useRunStore.setState({ pendingWormhole: null });
  if (target === null) {
    autosaveRun();
    return false;
  }
  applyHoleToll(gate.run.sector, gate.from, holeId);
  useRunStore.getState().bumpStats({ holesBypassed: 1 });
  useMetaStore.getState().bumpLifetime({ holesBypassed: 1 });
  settleLifetimeAchievements();
  const to = nodeById(gate.map).get(target);
  logJournal({
    k: "wormhole",
    branch: "bypass",
    to: target,
    rows: (to?.row ?? 0) - (nodeById(gate.map).get(gate.from)?.row ?? 0),
    direction: "forward",
  });
  emitBark("wormhole");
  return jumpTo(target);
};

export const enterNode = (nodeId: NodeId): boolean => {
  const s = useRunStore.getState();
  if (!s.active || s.map === null || s.position !== nodeId) return false;
  const node = nodeById(s.map).get(nodeId);
  if (node === undefined) return false;
  routeToNode(node);
  autosaveRun();
  return true;
};

export const resumeUnenteredNode = (): boolean => {
  const s = useRunStore.getState();
  if (!s.active || s.map === null || s.position === null) return false;
  if (s.pendingWormhole !== null) return false;
  if (s.visited.includes(s.position)) return false;
  return enterNode(s.position);
};

export const rideWormhole = (
  holeId: NodeId,
  route = true,
): WormholeThrow | null => {
  const gate = wormholeGate(holeId);
  if (gate === null) return null;
  const s = gate.run;
  const roll = rollThrow(
    {
      map: gate.map,
      from: gate.from,
      hole: holeId,
      visited: s.visited,
      rides: s.stats.wormholeRides,
    },
    chaos,
  );
  const landingId =
    roll.landing ??
    bypassTargetFor(gate.map, gate.from, holeId, s.visited);
  const node = landingId === null ? undefined : nodeById(gate.map).get(landingId);
  if (node === undefined || landingId === null) {
    useRunStore.setState({ pendingWormhole: null, lastWormhole: roll });
    autosaveRun();
    return roll;
  }

  const settled: WormholeThrow = { ...roll, landing: landingId };
  const step = stepTide(s);
  recordAction(`warp:${landingId}`);
  useRunStore.setState({
    position: landingId,
    depthRow: node.row,
    jumpsSinceTide: step.jumpsSinceTide,
    tide: step.tide,
    pendingWormhole: null,
    lastWormhole: settled,
    pendingDeepScan: false,
    bonusReveal: WORMHOLE_REVEAL,
  });
  useRunStore.getState().bumpStats({ jumps: 1, wormholeRides: 1 });
  useMetaStore.getState().bumpLifetime({ wormholeRides: 1 });
  settleLifetimeAchievements();
  useRunStore.getState().noteDepth(depthFor(s.sectorIndex, node.row));
  logJournal({
    k: "wormhole",
    branch: "ride",
    to: landingId,
    rows: settled.rows,
    direction: settled.direction,
  });
  emitBark("wormhole");
  if (step.raised) emitBark("tideUp");
  autosaveRun();
  if (route) enterNode(landingId);
  return settled;
};

const afterBossVictory = (): void => {
  const run = useRunStore.getState();
  const meta = useMetaStore.getState();
  const bossId = pickBoss(run.sector, run.seed);
  if (meta.recordBossFirstKill(bossId)) {
    meta.addShards(bossFirstKillShards(run.sector));
  }
  settleAchievements();
  if (run.mode === "contract") {
    settleSectorDrift();
    endRun(true);
    return;
  }
  if (run.sectorIndex >= SECTOR_COUNT) {
    settleSectorDrift();
    useAppStore.getState().go("finale");
    autosaveRun();
    pushRunCloud();
    return;
  }
  advanceSector();
};

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
  useMetaStore.getState().bumpLifetime({
    kills: result.kills ?? 0,
    ...(node.type === "elite" ? { elites: 1 } : {}),
  });
  settleLifetimeAchievements();
  unlockNextMemory();
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

  if (node.type === "boss" && pendingRewards?.dieDrop != null) {
    grantDieUnlock(pendingRewards.dieDrop);
  }

  const tallyPending =
    useRunStore.getState().lastTally !== null &&
    !useSettingsStore.getState().skipTally;

  if (hasRewards || tallyPending) {
    useAppStore.getState().go("rewards");
    autosaveRun();
    pushRunCloud();
  } else if (isSectorExit(node)) {
    leaveSector(node);
  } else {
    useAppStore.getState().go("map", undefined, "back");
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
  run.clearBattleTally();
  const node =
    run.map === null || run.position === null
      ? undefined
      : nodeById(run.map).get(run.position);
  if (node !== undefined && isSectorExit(node)) {
    leaveSector(node);
  } else {
    useAppStore.getState().go("map", undefined, "back");
    autosaveRun();
    pushRunCloud();
  }
};

export const draftContext = (
  run: RunState,
  floor?: DraftContext["floor"],
): DraftContext => ({
  owned: run.perks,
  banished: run.banishedPerks,
  sector: run.sector,
  deckDefIds: run.deck.map((d) => d.defId),
  modules: run.modules,
  shipId: run.shipId,
  draftsSinceRare: run.draftsSinceRare,
  ...(floor === undefined ? {} : { floor }),
});

const noteDraftOffer = (choices: readonly string[]): void => {
  if (choices.length === 0) return;
  useRunStore
    .getState()
    .noteDraftOffer(
      choices.some((id) => PERK_BY_ID.get(id)?.rarity === "rare"),
    );
};

const minibossPackage = (
  lootStream: ReturnType<typeof createStream>,
  run: RunState,
  rarityStep: number,
  nodeId: NodeId,
): NonNullable<RunValues["pendingRewards"]> => ({
  dieDrop: null,
  perkChoices: rollPerkChoices(lootStream, draftContext(run, "uncommon")),
  dieChoices: [dieForRarity(lootStream, "rare", rarityStep)],
  moduleChoices: [rollModule(lootStream, run.modules, "uncommon")],
  voucher: true,
  draftNodeId: nodeId,
  draftFloor: "uncommon",
  packageScrap: lootStream.int(
    MINIBOSS_PACKAGE_SCRAP[0],
    MINIBOSS_PACKAGE_SCRAP[1],
  ),
});

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
    const lost = takeBattleTally();
    run.noteBattleTally(lost);
    noteBattleLifetime(lost, false);
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
  const survivedLethal = b.survivedLethal;
  useBattleStore.getState().reset();
  run.noteBattleTally(tally);
  noteBattleLifetime(
    tally,
    node.type === "boss" && tally.damageTaken === 0 && battleHull >= run.hull,
  );
  run.noteDriftUsage(b.blackUsed, b.blueUsed);
  if (survivedLethal) run.setFlag("survivedLethal");
  if (stolen > 0) run.spendScrap(Math.min(stolen, run.scrap));
  announceVictory(enemyDefIds, battleHull);

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
      ? minibossPackage(lootStream, run, mut.lootRarityStep, node.id)
      : {
          dieDrop: reward.dieDrop,
          perkChoices:
            isDraftNode(node.type) && !contractPerksDisabled()
              ? rollPerkChoices(lootStream, draftContext(run))
              : [],
          draftNodeId: node.id,
          ...(node.type === "elite"
            ? { moduleChoices: [rollModule(lootStream, run.modules, "common")] }
            : {}),
        };

  noteDraftOffer(pending.perkChoices);

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
    const lost = takeBattleTally();
    run.noteBattleTally(lost);
    noteBattleLifetime(lost, false);
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
  const survivedLethal = b.survivedLethal;
  useBattleStore.getState().reset();
  run.noteBattleTally(tally);
  noteBattleLifetime(tally, false);
  run.noteDriftUsage(b.blackUsed, b.blueUsed);
  if (survivedLethal) run.setFlag("survivedLethal");
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
    useAppStore.getState().go("map", undefined, "back");
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
    run.addScrap(skipScrapFor(run.sector));
  } else {
    applyPerkPick(perkId);
  }
  useRunStore.getState().setPendingRewards({ ...pending, perkChoices: [] });
  autosaveRun();
};

const redrawDraft = (label: string): void => {
  const run = useRunStore.getState();
  const pending = run.pendingRewards;
  if (pending === null) return;
  const nodeId = pending.draftNodeId ?? run.position ?? "draft";
  const stream = createStream(deriveSeed(run.seed, `${label}:${nodeId}`));
  const choices = rollPerkChoices(
    stream,
    draftContext(run, pending.draftFloor),
  );
  useRunStore.getState().setPendingRewards({ ...pending, perkChoices: choices });
  noteDraftOffer(choices);
  autosaveRun();
};

export const banishPerkChoice = (perkId: string): void => {
  const run = useRunStore.getState();
  if (run.pendingRewards === null) return;
  if (!run.banishPerk(perkId)) return;
  redrawDraft(`banish:${perkId}`);
};

export const rerollPerkDraft = (): void => {
  const run = useRunStore.getState();
  if (run.pendingRewards === null) return;
  if (run.draftRerollUsed) return;
  if (run.scrap < DRAFT_REROLL_COST) return;
  if (!run.spendScrap(DRAFT_REROLL_COST)) return;
  if (!useRunStore.getState().useDraftReroll()) return;
  redrawDraft("draftReroll");
};

export const startPrologueBattle = (seed = now() >>> 0): void => {
  beginCheckFunnel();
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
      enemyHpBonusPct: CHECK_ENEMY_HP_PCT,
      checkSteps: SYSTEMS_CHECK,
    },
    CHECK_DECK,
    createStreams(deriveSeed(s.seed, "prologue")),
  );
  useAppStore.getState().go("battle");
  autosaveRun();
};

export const CHECK_SANDBOX_SEED = 0x5ec7;

export const startSystemsCheckSandbox = (): void => {
  const shipId = useMetaStore.getState().selectedShip;
  const hullMax = shipHullMax(shipId);
  useBattleStore.getState().reset();
  useBattleStore.getState().startBattle(
    {
      enemyIds: [PROLOGUE_ENEMY],
      shipId,
      hull: hullMax,
      hullMax,
      enemyHpBonusPct: CHECK_ENEMY_HP_PCT,
      checkSteps: SYSTEMS_CHECK,
      checkSandbox: true,
    },
    CHECK_DECK,
    createStreams(CHECK_SANDBOX_SEED),
  );
  useAppStore.getState().go("battle");
};

export const canCrossThreshold = (): boolean => {
  const run = useRunStore.getState();
  return (
    run.mode === "campaign" &&
    run.active &&
    !run.crossedThreshold &&
    run.sector === SECTOR_COUNT &&
    run.sectorIndex >= SECTOR_COUNT &&
    metaHasFeature("sectorSix")
  );
};

export const crossThreshold = (): void => {
  if (!canCrossThreshold()) return;
  const run = useRunStore.getState();
  run.crossThreshold();
  run.setFlag("crossedThreshold");
  trackEvent({
    name: "threshold",
    params: { ascension: run.ascension, axis: run.axis },
  });
  emitBark("threshold");
  advanceSector();
};

export const chooseEnding = (endingId: string): void => {
  const run = useRunStore.getState();
  sealFinalMemory(endingId);
  run.setEnding(endingId, useMetaStore.getState().recordEnding(endingId));
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

export const abandonRun = (): void => {
  useRunStore.getState().reset();
  useBattleStore.getState().reset();
  useNarrativeStore.getState().reset();
  resetActionLog();
  clearRun();
  useAppStore.getState().go("menu");
};

export const discardActiveRun = (): void => {
  useRunStore.getState().reset();
  useBattleStore.getState().reset();
  useNarrativeStore.getState().reset();
  resetActionLog();
  clearRun();
};

export const hasActiveRun = (): boolean => useRunStore.getState().active;
;
