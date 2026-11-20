import { ascensionMods, ascensionScrapBonusPct } from "@/data/ascension";
import { dossierId } from "@/data/codex";
import { masteryPerkIds } from "@/data/perks/ship";
import { masteryRankOf } from "@/data/shipMastery";
import { contractDef } from "@/data/contracts";
import { DIE_BY_ID } from "@/data/dice";
import { STARTER_DECK } from "@/data/decks";
import { computeMutatorMods } from "@/data/mutators";
import {
  echoNodesCrossed,
  echoSoftLands,
  echoEquipped,
} from "@/data/echo";
import { memoryFragmentCount } from "@/data/narrative/memories";
import {
  lifetimeFragments,
  sealFinalMemory,
  syncMemoryArc,
} from "@/game/narrative/memoryArc";
import {
  CHECK_DECK,
  CHECK_ENEMY_HP_PCT,
  PROLOGUE_ENEMY,
  SYSTEMS_CHECK,
} from "@/data/narrative/prologue";
import { SECTOR_COUNT, SECTORS, sectorDef } from "@/data/sectors";
import { shipHullMax } from "@/game/battle/setup";
import { beginCheckFunnel } from "@/game/onboarding";
import { hubBudgetBonus } from "@/game/chart/engine";
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
  isGentleRide,
  rollThrow,
  softLandThrow,
  type WormholeThrow,
} from "@/game/map/wormhole";
import { chaos } from "@/services/chaos";
import { MINIBOSS_PACKAGE_SCRAP } from "@/game/economy/prices";
import {
  announceReanchor,
  cargoNodeToll,
  deliverCargo,
  lapseCargo,
  reanchorCargo,
  spendCargoBark,
} from "@/game/run/cargo";
import { pushRunCloud } from "@/game/run/cloud";
import { grantDie } from "@/game/run/inventory";
import { pickBoss } from "@/game/run/encounter";
import { noteShipEvent } from "@/game/run/shipProgress";
import { firstMkDiscount } from "@/game/run/shipRules";
import {
  applyEdgeMotifs,
  applyHoleToll,
  applyNodeMotifs,
  disintegrationPctFor,
  ridesStayGentle,
} from "@/game/run/motifs";
import {
  logConsequence,
  logJournal,
  settleSectorDrift,
} from "@/game/run/journal";
import {
  ACT_SCOPED_FACES,
  isSalvageNode,
  rollSalvageOffer,
} from "@/game/run/salvage";
import {
  weatherIn,
  withoutWeather,
  withWeatherFor,
} from "@/game/run/weather";
import { emitBark, resetBarkMemory } from "@/game/narrative/barks";
import { contractSectorOf, mapOptionsFor } from "@/game/run/mapOptions";
import { computeRunMods, runChargeCap } from "@/game/run/runMods";
import { rollPerkChoices } from "@/game/run/perkDraft";
import { recordAction, resetActionLog, syncActionStats } from "@/game/run/actionLog";
import { emitRunHook } from "@/game/run/runEffects";
import {
  contentSector,
  dailyMutators,
  dailySeed,
  depthFor,
  isSectorExitRow,
  setupForRun,
} from "@/game/run/modes";
import { bossFirstKillShards } from "@/game/xp";
import { hangarBudget } from "@/data/milestones";
import { DECK_MIN, deckPoints, diePoints } from "@/data/metaShop";
import { validateDeck } from "@/game/meta/deck";
import {
  settleAchievements,
  settleLifetimeAchievements,
} from "@/game/meta/achievements";
import { grantDieUnlock, metaHasFeature } from "@/game/meta/unlockState";
import { useSummaryStore } from "@/stores/summaryStore";
import { trackEvent } from "@/services/analytics";
import { now } from "@/services/clock";
import { createStream, createStreams, deriveSeed } from "@/services/rng";
import { clearRun } from "@/services/save";
import { useAppStore } from "@/stores/appStore";
import {
  battleTally,
  useBattleStore,
  type BattleState,
} from "@/stores/battleStore";
import { useMetaStore, type MetaStats } from "@/stores/metaStore";
import { useNarrativeStore } from "@/stores/narrativeStore";
import { createInitialRunValues, useRunStore } from "@/stores/runStore";
import { useSettingsStore } from "@/stores/settingsStore";
import type {
  BattleTally,
  RunMode,
  RunState,
  RunValues,
} from "@/stores/runStore";

import {
  BASE_TIDE_CAP,
  JUMPS_PER_TIDE,
  jumpsPerTideFor,
  tideCapFor,
} from "@/game/run/tide";
import { autosaveRun } from "@/game/run/snapshot";
import { endRun, leaveDeathEpilogue } from "@/game/run/runEnd";
import { startBattleNode, startEventBattle } from "@/game/run/battleLaunch";
import {
  applyPerkPick,
  banishPerkChoice,
  draftContext,
  noteDraftOffer,
  rerollPerkDraft,
  resolveDieChoice,
  resolveDieReward,
  resolveModuleChoice,
  resolvePerkChoice,
  resolveSalvagePick,
} from "@/game/run/rewardPicks";

export { BASE_TIDE_CAP, JUMPS_PER_TIDE, jumpsPerTideFor, tideCapFor };
export {
  applyPerkPick,
  autosaveRun,
  banishPerkChoice,
  endRun,
  leaveDeathEpilogue,
  rerollPerkDraft,
  resolveDieChoice,
  resolveDieReward,
  resolveModuleChoice,
  resolvePerkChoice,
  resolveSalvagePick,
  startEventBattle,
};

export const WORMHOLE_REVEAL = 1;
export const STARTING_SCRAP = 0;

export const FULL_RESONANCE = 6;

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

const announceEchoCrossings = (before: number): void => {
  for (const def of echoNodesCrossed(before, lifetimeFragments())) {
    logConsequence(`run:echo.opened.${def.id}`);
  }
};

export const unlockNextMemory = (): void => {
  const before = lifetimeFragments();
  const fresh = syncMemoryArc().length > 0;
  announceEchoCrossings(before);
  if (fresh) emitBark("memory");
};

const routeToNode = (node: MapNode): void => {
  const go = useAppStore.getState().go;
  applyNodeMotifs(node, useRunStore.getState().sector);
  deliverCargo(node);
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

const withinHangarBudget = (
  deck: readonly string[],
  budget: number,
): readonly string[] => {
  if (validateDeck(deck, budget).valid) return deck;
  const trimmed = [...deck];
  while (trimmed.length > DECK_MIN && deckPoints(trimmed) > budget) {
    let worst = 0;
    for (let i = 1; i < trimmed.length; i += 1) {
      if (diePoints(trimmed[i] ?? "") > diePoints(trimmed[worst] ?? "")) {
        worst = i;
      }
    }
    trimmed.splice(worst, 1);
  }
  return validateDeck(trimmed, budget).valid ? trimmed : STARTER_DECK;
};

export const startRunMode = (options: StartRunOptions = {}): void => {
  const mode = options.mode ?? "campaign";
  const rootSeed = (options.seed ?? now()) >>> 0;
  const contract = contractDef(options.contractId ?? null);
  const setup = contract?.setup ?? {};
  const mutators = [...(options.mutators ?? setup.mutators ?? [])];
  const sectorIndex = Math.max(1, setup.sector ?? 1);
  const sector = contractSectorOf(contract);
  const streams = createStreams(rootSeed);
  const map = generateSectorMap(
    streams.map,
    sector,
    mapOptionsFor(mutators, mode, contract),
  );
  const meta = useMetaStore.getState();
  const shipId = setup.ship ?? meta.selectedShip;
  const chartPicks = setup.chartDisabled === true ? [] : [...meta.chartPicks];
  const echo = echoEquipped(
    meta.selectedEcho,
    memoryFragmentCount(meta.codex),
  );
  const savedDeck =
    meta.hangar.deck.length >= DECK_MIN ? meta.hangar.deck : STARTER_DECK;
  const deckIds =
    setup.deckPreset ??
    withinHangarBudget(
      savedDeck,
      hangarBudget(meta.level, hubBudgetBonus(meta.chartPicks)),
    );
  if (deckIds !== savedDeck && setup.deckPreset === undefined) {
    useMetaStore.getState().setDeck(deckIds);
  }
  const masteryRank =
    setup.chartDisabled === true
      ? 0
      : masteryRankOf(meta.shipMastery[shipId]?.xp ?? 0);
  const masteryPerks = masteryPerkIds(shipId, masteryRank);
  const chartMods = computeRunMods(masteryPerks, chartPicks);
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
    sector,
    sectorIndex,
    depthRow: 0,
    position: START_NODE_ID,
    map,
    visited: [START_NODE_ID],
    hull: hullMax,
    hullMax,
    scrap: STARTING_SCRAP,
    shipId,
    masteryRank,
    perks: masteryPerks,
    shipyardDiscount: firstMkDiscount(shipId, masteryRank),
    chartPicks,
    echo,
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

export const startDriftRun = (seed = now() >>> 0, ascension = 0): void => {
  startRunMode({ mode: "drift", seed, ascension });
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
  lapseCargo();
  const s = useRunStore.getState();
  const endless = s.mode === "drift";
  const lastIndex = s.crossedThreshold ? SECTORS.length : SECTOR_COUNT;
  const nextIndex = endless
    ? s.sectorIndex + 1
    : Math.min(lastIndex, s.sectorIndex + 1);
  const nextSector = endless ? contentSector(nextIndex) : nextIndex;
  const mutators =
    s.mode === "campaign"
      ? withWeatherFor(s.mutators, s.seed, nextIndex, nextSector)
      : withoutWeather(s.mutators);
  const map = generateSectorMap(
    createStream(deriveSeed(s.seed, `map:${String(nextIndex)}`)),
    nextSector,
    mapOptionsFor(mutators, s.mode),
  );
  useRunStore.setState({
    sector: nextSector,
    sectorIndex: nextIndex,
    mutators,
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
    sectorReveal: 0,
  });
  useRunStore.getState().noteDepth(depthFor(nextIndex, 0));
  useAppStore.getState().go("interstitial");
  const weather = weatherIn(mutators);
  if (weather !== null) logConsequence(weather.line);
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

const stepInto = (toNodeId: NodeId, alongEdge: boolean): boolean => {
  const s = useRunStore.getState();
  if (!s.active || s.map === null || s.position === null) return false;
  if (s.position === toNodeId) return false;
  if (s.visited.includes(toNodeId)) return false;
  if (alongEdge && !areConnected(s.map, s.position, toNodeId)) return false;
  const node = nodeById(s.map).get(toNodeId);
  if (node === undefined) return false;
  if (node.hole === true) return false;

  const step = stepTide(s);
  const settled = reanchorCargo(
    s.cargo,
    s.map,
    toNodeId,
    s.visited,
    s.sectorIndex,
  );

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
    cargo: settled.cargo,
  });
  announceReanchor(settled);
  useRunStore.getState().bumpStats({ jumps: 1 });
  useRunStore.getState().noteDepth(depthFor(s.sectorIndex, node.row));
  if (step.raised) emitBark("tideUp");
  routeToNode(node);
  autosaveRun();
  return true;
};

export const jumpTo = (toNodeId: NodeId): boolean => stepInto(toNodeId, true);

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
  if (target === null) {
    useRunStore.setState({ pendingWormhole: null });
    autosaveRun();
    return false;
  }
  if (applyHoleToll(gate.run.sector, gate.from, holeId) === null) return false;
  useRunStore.setState({ pendingWormhole: null });
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
  emitBark("holeBypass");
  return stepInto(target, false);
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

export type WormholeRide =
  | { kind: "landed"; throw: WormholeThrow }
  | { kind: "fatal" };

const disintegrate = (): void => {
  useRunStore.setState({ pendingWormhole: null });
  useMetaStore.getState().bumpLifetime({ disintegrations: 1 });
  logJournal({ k: "singularity" });
  endRun(false, "singularity");
};

export const canSoftLandWormhole = (
  s: Pick<RunValues, "echo" | "echoUsed"> = useRunStore.getState(),
): boolean => echoSoftLands(s.echo) && !s.echoUsed;

export const rideWormhole = (
  holeId: NodeId,
  route = true,
  softLand = false,
): WormholeRide | null => {
  const gate = wormholeGate(holeId);
  if (gate === null) return null;
  const s = gate.run;
  const softLanded = softLand && canSoftLandWormhole(s);
  const roll = softLanded
    ? softLandThrow(gate.map, gate.from, holeId, s.visited)
    : rollThrow(
        {
          map: gate.map,
          from: gate.from,
          hole: holeId,
          visited: s.visited,
          rides: s.stats.wormholeRides,
        },
        chaos,
      );
  const gentleLanded = softLanded && roll.landing !== null;
  if (gentleLanded) useRunStore.getState().spendEcho();
  const unmadePct = disintegrationPctFor(s.sector, s.ascension);
  if (
    !softLanded &&
    unmadePct > 0 &&
    (!isGentleRide(s.stats.wormholeRides) || !ridesStayGentle(s.ascension)) &&
    chaos.roll(unmadePct)
  ) {
    disintegrate();
    return { kind: "fatal" };
  }
  const landingId =
    roll.landing ??
    (softLanded
      ? null
      : bypassTargetFor(gate.map, gate.from, holeId, s.visited));
  const node = landingId === null ? undefined : nodeById(gate.map).get(landingId);
  if (node === undefined || landingId === null) {
    useRunStore.setState({ pendingWormhole: null, lastWormhole: roll });
    autosaveRun();
    return { kind: "landed", throw: roll };
  }

  const settled: WormholeThrow = { ...roll, landing: landingId };
  const step = stepTide(s);
  const hold = reanchorCargo(
    s.cargo,
    gate.map,
    landingId,
    s.visited,
    s.sectorIndex,
  );
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
    cargo: hold.cargo,
  });
  announceReanchor(hold);
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
  emitBark("wormholeRide");
  if (step.raised) emitBark("tideUp");
  autosaveRun();
  if (route) enterNode(landingId);
  return { kind: "landed", throw: settled };
};

const afterBossVictory = (): void => {
  noteShipEvent("sectorCleared");
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
  if (run.mode !== "drift") return node.type === "boss";
  return run.map === null
    ? isSectorExitRow(run.sectorIndex, node.row)
    : node.row === run.map.shape.bossRow;
};

const finalizeNode = (
  node: MapNode,
  result: NodeResult,
  pendingRewards: RunValues["pendingRewards"],
): void => {
  if (spendCargoBark()) emitBark("cargoDelivered");
  const run = useRunStore.getState();

  if (result.scrap !== undefined && result.scrap > 0) run.addScrap(result.scrap);
  if (result.setHull !== undefined) run.setHull(result.setHull);
  cargoNodeToll(node);
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
  if (node.type === "elite" || node.type === "miniboss" || node.type === "boss") {
    noteShipEvent(node.type);
  }
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
      (pendingRewards.dieChoices ?? []).length > 0 ||
      (pendingRewards.moduleChoices ?? []).length > 0 ||
      (pendingRewards.salvage ?? []).length > 0);
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
  noteShipEvent("sectorCleared");
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

const endBattleStore = (): void => {
  useRunStore.getState().keepBattleLog(useBattleStore.getState().log);
  useBattleStore.getState().reset();
};

const settleLostBattle = (b: BattleState, run: RunState): void => {
  trackEvent({
    name: "battle_result",
    params: { win: false, turns: b.turn, sector: run.sector },
  });
  const lost = takeBattleTally();
  run.noteBattleTally(lost);
  noteBattleLifetime(lost, false);
  endBattleStore();
  endRun(false, "hull");
};

interface WonBattle {
  kills: number;
  battleScrap: number;
  setHull: number;
}

const settleWonBattle = (
  b: BattleState,
  run: RunState,
  bossFight: boolean,
): WonBattle => {
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
  const blackBoxSpent = b.blackBoxSpent;
  endBattleStore();
  run.noteBattleTally(tally);
  noteBattleLifetime(
    tally,
    bossFight && tally.damageTaken === 0 && battleHull >= run.hull,
  );
  run.noteDriftUsage(b.blackUsed, b.blueUsed);
  if (survivedLethal) run.setFlag("survivedLethal");
  if (blackBoxSpent) useRunStore.setState({ blackBoxSpent: true });
  if (stolen > 0) run.spendScrap(Math.min(stolen, run.scrap));
  announceVictory(enemyDefIds, battleHull);
  const mods = computeRunMods(
    run.perks,
    run.chartPicks,
    run.modules,
    run.officers,
  );
  return {
    kills,
    battleScrap,
    setHull: Math.min(
      run.hullMax,
      battleHull + mods.battleEndHeal + run.battleEndHealRun,
    ),
  };
};

export const resolveRunBattle = (): void => {
  const b = useBattleStore.getState();
  if (b.outcome === undefined) return;
  const run = useRunStore.getState();
  if (run.map === null || run.position === null) return;
  const node = nodeById(run.map).get(run.position);
  if (node === undefined) return;

  if (b.outcome === "defeat") {
    settleLostBattle(b, run);
    return;
  }

  const won = settleWonBattle(b, run, node.type === "boss");

  const lootStream = createStream(deriveSeed(run.seed, `loot:${node.id}`));
  const mods = computeRunMods(
    run.perks,
    run.chartPicks,
    run.modules,
    run.officers,
  );
  const mut = computeMutatorMods(run.mutators);
  const sectorScrapMult = sectorDef(run.sector).scrapMult;
  const reward = computeNodeReward(
    node.type,
    lootStream,
    mut.lootRarityStep,
    node.pocket === true,
    sectorScrapMult,
  );
  const rewardScrap = Math.round(
    reward.scrap *
      sectorScrapMult *
      (1 +
        (mods.scrapMultPct +
          mut.scrapMultPct +
          ascensionScrapBonusPct(run.ascension)) /
          100),
  );

  const base: NonNullable<RunValues["pendingRewards"]> =
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
  const pending: NonNullable<RunValues["pendingRewards"]> = isSalvageNode(
    node.type,
  )
    ? {
        ...base,
        salvage: rollSalvageOffer(
          run.seed,
          node.id,
          isSectorExit(node) ? ACT_SCOPED_FACES : [],
        ),
      }
    : base;

  noteDraftOffer(pending.perkChoices);

  const packageScrap = pending.packageScrap ?? 0;

  finalizeNode(
    node,
    {
      outcome: "cleared",
      scrap: rewardScrap + won.battleScrap + packageScrap,
      setHull: won.setHull,
      kills: won.kills,
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
    settleLostBattle(b, run);
    return;
  }

  const won = settleWonBattle(b, run, false);

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
    grantDie(defId);
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
      scrap: won.battleScrap + pending.scrap,
      setHull: won.setHull,
      kills: won.kills,
    },
    null,
  );
};

export const resolveActiveBattle = (): void => {
  if (useRunStore.getState().pendingBattle !== null) resolveEventBattle();
  else resolveRunBattle();
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
  const fragmentsBeforeSeal = lifetimeFragments();
  sealFinalMemory(endingId);
  announceEchoCrossings(fragmentsBeforeSeal);
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
  discardActiveRun();
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
