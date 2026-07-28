import {
  hydrateBattle,
  serializeBattle,
  type BattleSaveState,
} from "@/stores/battleStore";
import {
  createInitialRunValues,
  useRunStore,
  type RunState,
  type RunValues,
} from "@/stores/runStore";
import { emitBark, resetBarkMemory } from "@/game/narrative";
import { restoreActionLog } from "@/game/run/actionLog";
import { useAppStore } from "@/stores/appStore";
import type { ScreenId } from "@/types";

export const RUN_SNAPSHOT_V = 1;

export interface RunSnapshotV1 {
  v: number;
  screen: ScreenId;
  run: RunValues;
  battle: BattleSaveState | null;
}

const pickRunValues = (s: RunState): RunValues => ({
  active: s.active,
  seed: s.seed,
  mode: s.mode,
  mutators: [...s.mutators],
  contractId: s.contractId,
  dailyDate: s.dailyDate,
  sector: s.sector,
  sectorIndex: s.sectorIndex,
  depthRow: s.depthRow,
  position: s.position,
  map: s.map,
  visited: [...s.visited],
  hull: s.hull,
  hullMax: s.hullMax,
  scrap: s.scrap,
  shipId: s.shipId,
  deck: s.deck.map((d) => ({ ...d })),
  perks: [...s.perks],
  chartPicks: [...s.chartPicks],
  mkLevels: { ...s.mkLevels },
  tide: s.tide,
  jumpsSinceTide: s.jumpsSinceTide,
  flags: { ...s.flags },
  axis: s.axis,
  seenEvents: [...s.seenEvents],
  solvedPuzzles: [...s.solvedPuzzles],
  anomalyStreak: s.anomalyStreak,
  interferenceStacks: s.interferenceStacks,
  killedTypes: [...s.killedTypes],
  battleMods: s.battleMods.map((m) => ({ ...m })),
  battleEndHealRun: s.battleEndHealRun,
  rerollSizeRun: s.rerollSizeRun,
  bonusReveal: s.bonusReveal,
  shipyardDiscount: s.shipyardDiscount,
  pendingBattle:
    s.pendingBattle === null
      ? null
      : {
          enemyIds: [...s.pendingBattle.enemyIds],
          originNodeId: s.pendingBattle.originNodeId,
          scrap: s.pendingBattle.scrap,
          lootDie: s.pendingBattle.lootDie,
          lootRarity: s.pendingBattle.lootRarity,
          setFlags: s.pendingBattle.setFlags.map((f) => [...f] as [string, typeof f[1]]),
          clearFlags: [...s.pendingBattle.clearFlags],
        },
  pendingDeepScan: s.pendingDeepScan,
  pendingRewards:
    s.pendingRewards === null
      ? null
      : {
          dieDrop: s.pendingRewards.dieDrop,
          perkChoices: [...s.pendingRewards.perkChoices],
        },
  shop:
    s.shop === null
      ? null
      : {
          nodeId: s.shop.nodeId,
          rerolls: s.shop.rerolls,
          items: s.shop.items.map((item) => ({ ...item })),
        },
  deckSeq: s.deckSeq,
  stats: { ...s.stats },
  ascension: s.ascension,
  vouchers: s.vouchers,
  usedMinibosses: [...s.usedMinibosses],
  bossesKilled: [...s.bossesKilled],
  memoriesUnlocked: s.memoriesUnlocked,
  endingId: s.endingId,
  startedAt: s.startedAt,
});

export const captureRunSnapshot = (): RunSnapshotV1 => ({
  v: RUN_SNAPSHOT_V,
  screen: useAppStore.getState().screen,
  run: pickRunValues(useRunStore.getState()),
  battle: serializeBattle(),
});

const isRunSnapshot = (data: unknown): data is RunSnapshotV1 => {
  if (typeof data !== "object" || data === null) return false;
  const snap = data as Partial<RunSnapshotV1>;
  return (
    snap.v === RUN_SNAPSHOT_V &&
    typeof snap.screen === "string" &&
    typeof snap.run === "object" &&
    snap.run !== null
  );
};

export const restoreRunSnapshot = (data: unknown): boolean => {
  if (!isRunSnapshot(data)) return false;
  const values = { ...createInitialRunValues(), ...data.run };
  useRunStore.getState().hydrate(values);
  restoreActionLog({
    hash: values.stats.actionHash,
    count: values.stats.actionCount,
  });
  if (data.battle !== null) hydrateBattle(data.battle);
  useAppStore.getState().go(data.screen);
  resetBarkMemory();
  if (data.run.active) emitBark("resume");
  return true;
};

export const runSummaryLabel = (data: unknown): string | null => {
  if (!isRunSnapshot(data)) return null;
  return `${String(data.run.sector)}:${String(data.run.depthRow)}`;
};
