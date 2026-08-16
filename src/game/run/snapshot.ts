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
import { useNarrativeStore } from "@/stores/narrativeStore";
import type { JournalEntry } from "@/game/run/journal";
import type { ScreenId } from "@/types";

export const RUN_SNAPSHOT_V = 8;

export interface RunSnapshotV1 {
  v: number;
  screen: ScreenId;
  run: RunValues;
  journal: JournalEntry[];
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
  modules: [...s.modules],
  banishedPerks: [...s.banishedPerks],
  draftsSinceRare: s.draftsSinceRare,
  draftRerollUsed: s.draftRerollUsed,
  banishUsed: s.banishUsed,
  chartPicks: [...s.chartPicks],
  mkLevels: { ...s.mkLevels },
  tide: s.tide,
  jumpsSinceTide: s.jumpsSinceTide,
  flags: { ...s.flags },
  counters: { ...s.counters },
  axis: s.axis,
  driftBlack: s.driftBlack,
  driftBlue: s.driftBlue,
  driftSpent: s.driftSpent,
  seenEvents: [...s.seenEvents],
  solvedPuzzles: [...s.solvedPuzzles],
  puzzleRuns: Object.fromEntries(
    Object.entries(s.puzzleRuns).map(([nodeId, state]) => [nodeId, { ...state }]),
  ),
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
          ...(s.pendingRewards.dieChoices !== undefined
            ? { dieChoices: [...s.pendingRewards.dieChoices] }
            : {}),
          ...(s.pendingRewards.moduleChoices !== undefined
            ? { moduleChoices: [...s.pendingRewards.moduleChoices] }
            : {}),
          ...(s.pendingRewards.voucher !== undefined
            ? { voucher: s.pendingRewards.voucher }
            : {}),
          ...(s.pendingRewards.packageScrap !== undefined
            ? { packageScrap: s.pendingRewards.packageScrap }
            : {}),
          ...(s.pendingRewards.draftNodeId !== undefined
            ? { draftNodeId: s.pendingRewards.draftNodeId }
            : {}),
          ...(s.pendingRewards.draftFloor !== undefined
            ? { draftFloor: s.pendingRewards.draftFloor }
            : {}),
        },
  shop:
    s.shop === null
      ? null
      : {
          nodeId: s.shop.nodeId,
          rerolls: s.shop.rerolls,
          items: s.shop.items.map((item) => ({ ...item })),
          modules: s.shop.modules.map((item) => ({ ...item })),
        },
  deckSeq: s.deckSeq,
  stats: { ...s.stats },
  ascension: s.ascension,
  vouchers: s.vouchers,
  usedMinibosses: [...s.usedMinibosses],
  bossesKilled: [...s.bossesKilled],
  memoryOrders: [...s.memoryOrders],
  endingId: s.endingId,
  endingFirstTime: s.endingFirstTime,
  crossedThreshold: s.crossedThreshold,
  encounters: s.encounters.map((e) => ({ ...e })),
  startedAt: s.startedAt,
});

export const captureRunSnapshot = (): RunSnapshotV1 => ({
  v: RUN_SNAPSHOT_V,
  screen: useAppStore.getState().screen,
  run: pickRunValues(useRunStore.getState()),
  journal: useNarrativeStore.getState().journal.map((entry) => ({ ...entry })),
  battle: serializeBattle(),
});

const isRunSnapshot = (data: unknown): data is RunSnapshotV1 => {
  if (typeof data !== "object" || data === null) return false;
  const snap = data as Partial<RunSnapshotV1>;
  return (
    snap.v === RUN_SNAPSHOT_V &&
    typeof snap.screen === "string" &&
    typeof snap.run === "object" &&
    snap.run !== null &&
    Array.isArray(snap.journal)
  );
};

export const restoreRunSnapshot = (data: unknown): boolean => {
  if (!isRunSnapshot(data)) return false;
  const values = { ...createInitialRunValues(), ...data.run };
  useRunStore.getState().hydrate(values);
  useNarrativeStore.getState().reset();
  useNarrativeStore.getState().setJournal(data.journal);
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
