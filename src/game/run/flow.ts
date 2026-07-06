import { STARTER_DECK } from "@/data/decks";
import { shipHullMax } from "@/game/battle/setup";
import { computeNodeReward, isDraftNode } from "@/game/economy/rewards";
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
import { computePerkMods, perkChargeCap } from "@/game/run/perkMods";
import { rollPerkChoices, SKIP_SCRAP } from "@/game/run/perkDraft";
import { captureRunSnapshot } from "@/game/run/snapshot";
import {
  createStream,
  createStreams,
  deriveSeed,
} from "@/services/rng";
import { clearRun, saveRunSnapshot } from "@/services/save";
import { useAppStore } from "@/stores/appStore";
import { useBattleStore } from "@/stores/battleStore";
import { createInitialRunValues, useRunStore } from "@/stores/runStore";
import type { RunValues } from "@/stores/runStore";
import type { RunSnapshot } from "@/types";

export const JUMPS_PER_TIDE = 4;
export const TIDE_CAP = 3;
export const STARTING_SCRAP = 0;

export interface NodeResult {
  outcome: "cleared" | "defeat";
  scrap?: number;
  setHull?: number;
  kills?: number;
  deepScan?: boolean;
}

export const autosaveRun = (): void => {
  try {
    saveRunSnapshot(captureRunSnapshot() as unknown as RunSnapshot);
  } catch (error) {
    console.error("flow: autosave failed", error);
  }
};

const startBattleNode = (node: MapNode): void => {
  const s = useRunStore.getState();
  const streams = createStreams(deriveSeed(s.seed, `node:${node.id}`));
  const encStream = createStream(deriveSeed(s.seed, `enc:${node.id}`));
  const enemyIds = buildEncounterIds(node.type, encStream);
  useBattleStore.getState().startBattle(
    {
      enemyIds,
      tide: s.tide,
      perks: s.perks,
      hull: s.hull,
      hullMax: s.hullMax,
      chargeCap: perkChargeCap(s.perks),
    },
    s.deck.map((d) => d.defId),
    streams,
  );
  useAppStore.getState().go("battle");
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
    case "event":
    case "anomaly":
    case "beacon":
      go("event");
      return;
    case "start":
      go("map");
      return;
  }
};

export const startRun = (seed = Date.now() >>> 0): void => {
  const rootSeed = seed >>> 0;
  const streams = createStreams(rootSeed);
  const map = generateSectorMap(streams.map, 1);
  const hullMax = shipHullMax("wanderer");
  const values: RunValues = {
    ...createInitialRunValues(),
    active: true,
    seed: rootSeed,
    mode: "slice",
    sector: 1,
    depthRow: 0,
    position: START_NODE_ID,
    map,
    visited: [START_NODE_ID],
    hull: hullMax,
    hullMax,
    scrap: STARTING_SCRAP,
    deck: STARTER_DECK.map((defId, index) => ({
      uid: `d${String(index)}`,
      defId,
    })),
    deckSeq: STARTER_DECK.length,
  };
  useRunStore.getState().hydrate(values);
  useBattleStore.getState().reset();
  useAppStore.getState().go("map");
  autosaveRun();
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
  let tide = s.tide;
  let jumpsSinceTide = jumps;
  if (jumps >= JUMPS_PER_TIDE) {
    tide = Math.min(TIDE_CAP, tide + 1);
    jumpsSinceTide = 0;
  }

  useRunStore.setState({
    position: toNodeId,
    depthRow: node.row,
    jumpsSinceTide,
    tide,
    pendingDeepScan: false,
  });
  routeToNode(node);
  autosaveRun();
  return true;
};

const finalizeNode = (
  node: MapNode,
  result: NodeResult,
  pendingRewards: { dieDrop: string | null; perkChoices: string[] } | null,
): void => {
  const run = useRunStore.getState();

  if (result.scrap !== undefined && result.scrap > 0) run.addScrap(result.scrap);
  if (result.setHull !== undefined) run.setHull(result.setHull);
  if (result.deepScan === true) run.setPendingDeepScan(true);
  run.bumpStats({ nodesCleared: 1, kills: result.kills ?? 0 });
  if (!run.visited.includes(node.id)) {
    useRunStore.setState({ visited: [...run.visited, node.id] });
  }

  const hasRewards =
    pendingRewards !== null &&
    (pendingRewards.dieDrop !== null || pendingRewards.perkChoices.length > 0);
  run.setPendingRewards(hasRewards ? pendingRewards : null);

  if (hasRewards) {
    useAppStore.getState().go("rewards");
  } else if (node.type === "boss") {
    useRunStore.setState({ active: false });
    useAppStore.getState().go("summary");
  } else {
    useAppStore.getState().go("map");
  }
  autosaveRun();
  pushRunCloud();
};

export const completeNode = (result: NodeResult): void => {
  const run = useRunStore.getState();
  if (run.map === null || run.position === null) return;
  const node = nodeById(run.map).get(run.position);
  if (node === undefined) return;

  if (result.outcome === "defeat") {
    useRunStore.setState({ active: false });
    useAppStore.getState().go("summary");
    autosaveRun();
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
    useRunStore.setState({ active: false });
    useAppStore.getState().go("summary");
  } else {
    useAppStore.getState().go("map");
  }
  autosaveRun();
  pushRunCloud();
};

export const resolveRunBattle = (): void => {
  const b = useBattleStore.getState();
  if (b.outcome === undefined) return;
  const run = useRunStore.getState();
  if (run.map === null || run.position === null) return;
  const node = nodeById(run.map).get(run.position);
  if (node === undefined) return;

  if (b.outcome === "defeat") {
    useRunStore.setState({ active: false });
    useBattleStore.getState().reset();
    useAppStore.getState().go("summary");
    autosaveRun();
    return;
  }

  const kills = b.enemies.length;
  const battleScrap = b.scrap;
  const battleHull = b.hull;
  useBattleStore.getState().reset();

  const lootStream = createStream(deriveSeed(run.seed, `loot:${node.id}`));
  const mods = computePerkMods(run.perks);
  const reward = computeNodeReward(node.type, lootStream);
  const rewardScrap = Math.round(reward.scrap * (1 + mods.scrapMultPct / 100));
  const perkChoices = isDraftNode(node.type)
    ? rollPerkChoices(lootStream, run.perks)
    : [];

  finalizeNode(
    node,
    {
      outcome: "cleared",
      scrap: rewardScrap + battleScrap,
      setHull: Math.min(run.hullMax, battleHull + mods.battleEndHeal),
      kills,
    },
    { dieDrop: reward.dieDrop, perkChoices },
  );
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
    .setPendingRewards({ dieDrop: null, perkChoices: pending.perkChoices });
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
  useRunStore
    .getState()
    .setPendingRewards({ dieDrop: pending.dieDrop, perkChoices: [] });
  autosaveRun();
};

export const abandonRun = (): void => {
  useRunStore.getState().reset();
  useBattleStore.getState().reset();
  clearRun();
  useAppStore.getState().go("menu");
};
