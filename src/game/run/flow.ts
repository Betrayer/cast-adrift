import { ascensionMods } from "@/data/ascension";
import { DIE_BY_ID } from "@/data/dice";
import { STARTER_DECK } from "@/data/decks";
import { ENEMY_BY_ID } from "@/data/enemies";
import { beaconsResolved } from "@/data/events/beacons";
import { finalMemoryCodexId, memoryAt } from "@/data/narrative/memories";
import { PROLOGUE_ENEMY, PROLOGUE_SCRIPT } from "@/data/narrative/prologue";
import { SECTOR_COUNT, sectorDef } from "@/data/sectors";
import { gateHpBonusPct, shipHullMax } from "@/game/battle/setup";
import {
  computeNodeReward,
  dieForRarity,
  isDraftNode,
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
import { buildEncounterIds } from "@/game/run/encounter";
import { battleEndAxisDelta, countDeckSchool } from "@/game/run/axis";
import { emitBark, resetBarkMemory } from "@/game/narrative";
import { computePerkMods } from "@/game/run/perkMods";
import { computeRunMods, runChargeCap } from "@/game/run/runMods";
import { rollPerkChoices, SKIP_SCRAP } from "@/game/run/perkDraft";
import {
  bossFirstKillShards,
  campaignShards,
  runXp,
  sectorClearShards,
} from "@/game/xp";
import { MILESTONES } from "@/data/milestones";
import { useSummaryStore } from "@/stores/summaryStore";
import { captureRunSnapshot } from "@/game/run/snapshot";
import { createStream, createStreams, deriveSeed } from "@/services/rng";
import { clearRun, saveRunSnapshot } from "@/services/save";
import { useAppStore } from "@/stores/appStore";
import { useBattleStore } from "@/stores/battleStore";
import { useMetaStore } from "@/stores/metaStore";
import { createInitialRunValues, useRunStore } from "@/stores/runStore";
import type { RunValues } from "@/stores/runStore";
import type { RunSnapshot } from "@/types";
import type { FlagValue, ForcedBattle } from "@/types/events";

export const JUMPS_PER_TIDE = 4;
export const BASE_TIDE_CAP = 3;
export const STARTING_SCRAP = 0;
export const MINIBOSS_PACKAGE_SCRAP: readonly [number, number] = [30, 40];

export interface NodeResult {
  outcome: "cleared" | "defeat";
  scrap?: number;
  setHull?: number;
  kills?: number;
  deepScan?: boolean;
}

export const tideCapFor = (ascension: number): number =>
  BASE_TIDE_CAP + ascensionMods(ascension).tideCapDelta;

const sectorsClearedCount = (): number => {
  const run = useRunStore.getState();
  return Math.max(0, Math.min(SECTOR_COUNT, run.stats.bosses));
};

export const endRun = (win: boolean): void => {
  const run = useRunStore.getState();
  const meta = useMetaStore.getState();
  const counts = {
    nodes: run.stats.nodesCleared,
    elites: run.stats.elites,
    minibosses: run.stats.minibosses,
    bosses: run.stats.bosses,
    contractStars: 0,
  };
  const cleared = sectorsClearedCount();
  const xpGain = runXp(counts, run.ascension);
  const shardGain = campaignShards(cleared);
  const award = meta.awardRun(xpGain, shardGain, win);
  meta.archiveRunFlags(Object.keys(run.flags));
  if (win) meta.recordCampaignClear(run.ascension);
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
  });
  useRunStore.setState({ active: false });
  useAppStore.getState().go("summary");
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
  let firstNew: string | undefined;
  for (const defId of enemyDefIds) {
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

const encounterInit = () => {
  const s = useRunStore.getState();
  const mods = ascensionMods(s.ascension);
  return {
    ascension: s.ascension,
    enemyHpBonusPct: mods.enemyHpPct,
    gateHpBonusPct: gateHpBonusPct(s.sector),
    eliteShield: mods.eliteShield,
  };
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
  });
  if (enemyIds.includes("bountyHuntress")) s.setFlag("hunterEngaged");
  if (node.type === "miniboss" && enemyIds[0] !== undefined) {
    s.markMinibossUsed(enemyIds[0]);
  }
  for (let i = 0; i < mods.enemyPlus; i += 1) enemyIds.push("scavDrone");
  useBattleStore.getState().startBattle(
    {
      enemyIds,
      shipId: s.shipId,
      tide: s.tide,
      interference: s.interferenceStacks,
      perks: s.perks,
      chartPicks: s.chartPicks,
      hull: s.hull,
      hullMax: s.hullMax,
      chargeCap: runChargeCap(s.perks, s.chartPicks),
      startCharge: mods.startCharge,
      rerollSizeBonus: s.rerollSizeRun,
      ...encounterInit(),
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
      enemyIds,
      shipId: s.shipId,
      tide: s.tide,
      interference: s.interferenceStacks,
      perks: s.perks,
      chartPicks: s.chartPicks,
      hull: s.hull,
      hullMax: s.hullMax,
      chargeCap: runChargeCap(s.perks, s.chartPicks),
      startCharge: mods.startCharge,
      rerollSizeBonus: s.rerollSizeRun,
      ...encounterInit(),
    },
    s.deck.map((d) => d.defId),
    streams,
  );
  useAppStore.getState().go("battle");
  autosaveRun();
};

const routeToNode = (node: MapNode): void => {
  const go = useAppStore.getState().go;
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

export const startRun = (seed = Date.now() >>> 0, ascension = 0): void => {
  const rootSeed = seed >>> 0;
  const streams = createStreams(rootSeed);
  const map = generateSectorMap(streams.map, 1);
  const meta = useMetaStore.getState();
  const shipId = meta.selectedShip;
  const chartPicks = [...meta.chartPicks];
  const deckIds =
    meta.hangar.deck.length >= 3 ? meta.hangar.deck : STARTER_DECK;
  const chartHullDelta = computeRunMods([], chartPicks).hullMaxDelta;
  const hullMax = Math.max(1, shipHullMax(shipId) + chartHullDelta);
  const values: RunValues = {
    ...createInitialRunValues(),
    active: true,
    seed: rootSeed,
    mode: "campaign",
    sector: 1,
    depthRow: 0,
    position: START_NODE_ID,
    map,
    visited: [START_NODE_ID],
    hull: hullMax,
    hullMax,
    scrap: STARTING_SCRAP,
    shipId,
    chartPicks,
    ascension: Math.max(0, ascension),
    startedAt: Date.now(),
    deck: deckIds.map((defId, index) => ({
      uid: `d${String(index)}`,
      defId,
    })),
    deckSeq: deckIds.length,
  };
  useRunStore.getState().hydrate(values);
  useBattleStore.getState().reset();
  resetBarkMemory();
  useAppStore.getState().go("map");
  emitBark("sectorEnter:1");
  autosaveRun();
};

// Sector transition: fresh map, tide reset, position back to the start node. The
// interstitial screen owns the wash + fragment line before the map returns.
export const advanceSector = (): void => {
  const s = useRunStore.getState();
  const nextSector = Math.min(SECTOR_COUNT, s.sector + 1);
  const map = generateSectorMap(
    createStream(deriveSeed(s.seed, `map:${String(nextSector)}`)),
    nextSector,
  );
  useRunStore.setState({
    sector: nextSector,
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
  const cap = tideCapFor(s.ascension);
  let tide = s.tide;
  let jumpsSinceTide = jumps;
  if (jumps >= JUMPS_PER_TIDE) {
    tide = Math.min(cap, tide + 1);
    jumpsSinceTide = 0;
  }

  useRunStore.setState({
    position: toNodeId,
    depthRow: node.row,
    jumpsSinceTide,
    tide,
    pendingDeepScan: false,
    bonusReveal: 0,
  });
  if (tide > s.tide) emitBark("tideUp");
  routeToNode(node);
  autosaveRun();
  return true;
};

const afterBossVictory = (): void => {
  const run = useRunStore.getState();
  const meta = useMetaStore.getState();
  const bossId = sectorDef(run.sector).bossId;
  if (meta.recordBossFirstKill(bossId)) {
    meta.addShards(bossFirstKillShards(run.sector));
  }
  if (run.sector >= SECTOR_COUNT) {
    useAppStore.getState().go("finale");
    autosaveRun();
    pushRunCloud();
    return;
  }
  advanceSector();
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
  if (!run.visited.includes(node.id)) {
    useRunStore.setState({ visited: [...run.visited, node.id] });
  }

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
  } else if (node.type === "boss") {
    afterBossVictory();
  } else {
    useAppStore.getState().go("map");
    autosaveRun();
    pushRunCloud();
  }
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
  if (node?.type === "boss") {
    afterBossVictory();
  } else {
    useAppStore.getState().go("map");
    autosaveRun();
    pushRunCloud();
  }
};

const minibossPackage = (
  lootStream: ReturnType<typeof createStream>,
  perks: readonly string[],
): NonNullable<RunValues["pendingRewards"]> => ({
  dieDrop: null,
  perkChoices: rollPerkChoices(lootStream, perks, "uncommon"),
  dieChoices: [
    dieForRarity(lootStream, "rare"),
    dieForRarity(lootStream, "rare"),
  ],
  voucher: true,
  packageScrap: lootStream.int(
    MINIBOSS_PACKAGE_SCRAP[0],
    MINIBOSS_PACKAGE_SCRAP[1],
  ),
});

export const resolveRunBattle = (): void => {
  const b = useBattleStore.getState();
  if (b.outcome === undefined) return;
  const run = useRunStore.getState();
  if (run.map === null || run.position === null) return;
  const node = nodeById(run.map).get(run.position);
  if (node === undefined) return;

  if (b.outcome === "defeat") {
    useBattleStore.getState().reset();
    endRun(false);
    return;
  }

  const kills = b.enemies.length;
  const battleScrap = b.scrap;
  const stolen = b.stolenScrap;
  const battleHull = b.hull;
  const enemyDefIds = b.enemies.map((e) => e.defId);
  const axisDelta = battleEndAxisDelta(
    b.blackUsed,
    b.blueUsed,
    countDeckSchool(run.deck, "black"),
    countDeckSchool(run.deck, "blue"),
  );
  useBattleStore.getState().reset();
  if (axisDelta !== 0) run.addAxis(axisDelta);
  if (stolen > 0) run.spendScrap(Math.min(stolen, run.scrap));
  announceVictory(enemyDefIds, battleHull);
  if (node.type === "miniboss" || node.type === "boss") unlockNextMemory();

  const lootStream = createStream(deriveSeed(run.seed, `loot:${node.id}`));
  const mods = computeRunMods(run.perks, run.chartPicks);
  const sectorScrapMult = sectorDef(run.sector).scrapMult;
  const reward = computeNodeReward(node.type, lootStream);
  const rewardScrap = Math.round(
    reward.scrap * sectorScrapMult * (1 + mods.scrapMultPct / 100),
  );

  const pending: NonNullable<RunValues["pendingRewards"]> =
    node.type === "miniboss"
      ? minibossPackage(lootStream, run.perks)
      : {
          dieDrop: reward.dieDrop,
          perkChoices: isDraftNode(node.type)
            ? rollPerkChoices(lootStream, run.perks)
            : [],
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
    useBattleStore.getState().reset();
    endRun(false);
    return;
  }

  const kills = b.enemies.length;
  const battleScrap = b.scrap;
  const stolen = b.stolenScrap;
  const battleHull = b.hull;
  const enemyDefIds = b.enemies.map((e) => e.defId);
  const axisDelta = battleEndAxisDelta(
    b.blackUsed,
    b.blueUsed,
    countDeckSchool(run.deck, "black"),
    countDeckSchool(run.deck, "blue"),
  );
  useBattleStore.getState().reset();
  if (axisDelta !== 0) run.addAxis(axisDelta);
  if (stolen > 0) run.spendScrap(Math.min(stolen, run.scrap));
  announceVictory(enemyDefIds, battleHull);

  const mods = computeRunMods(run.perks, run.chartPicks);
  if (pending.lootDie !== null || pending.lootRarity !== null) {
    const lootStream = createStream(
      deriveSeed(run.seed, `evloot:${pending.originNodeId}`),
    );
    const defId =
      pending.lootDie ??
      dieForRarity(lootStream, pending.lootRarity ?? "uncommon");
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
    .setPendingRewards({ ...pending, dieChoices: [] });
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
  ENEMY_BY_ID.get(sectorDef(sector).bossId)?.name ?? "";

export const abandonRun = (): void => {
  useRunStore.getState().reset();
  useBattleStore.getState().reset();
  clearRun();
  useAppStore.getState().go("menu");
};
