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
  sector: s.sector,
  depthRow: s.depthRow,
  position: s.position,
  map: s.map,
  visited: [...s.visited],
  hull: s.hull,
  hullMax: s.hullMax,
  scrap: s.scrap,
  deck: s.deck.map((d) => ({ ...d })),
  perks: [...s.perks],
  mkLevels: { ...s.mkLevels },
  tide: s.tide,
  jumpsSinceTide: s.jumpsSinceTide,
  flags: { ...s.flags },
  axis: s.axis,
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
  useRunStore
    .getState()
    .hydrate({ ...createInitialRunValues(), ...data.run });
  if (data.battle !== null) hydrateBattle(data.battle);
  useAppStore.getState().go(data.screen);
  return true;
};

export const runSummaryLabel = (data: unknown): string | null => {
  if (!isRunSnapshot(data)) return null;
  return `${String(data.run.sector)}:${String(data.run.depthRow)}`;
};
