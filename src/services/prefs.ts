import { useSyncExternalStore } from "react";
import {
  DEFAULT_BATTLE_LAYOUT,
  isBattleLayoutId,
} from "@/data/battleLayouts";
import { DEFAULT_CHART_LAYOUT, isChartLayoutId } from "@/data/chartLayouts";
import { DEFAULT_ROLL_STYLE, isRollStyle } from "@/data/rollStyles";
import type { ThemeId } from "@/data/themes";
import { useMetaStore } from "@/stores/metaStore";
import { useSettingsStore } from "@/stores/settingsStore";
import type { BattleLayoutId, ChartLayoutId, RollStyle } from "@/types";

const resolveWith =
  <T extends string>(isValid: (value: unknown) => value is T, fallback: T) =>
  (accountValue: T | undefined, deviceValue: T | undefined): T =>
    isValid(accountValue)
      ? accountValue
      : isValid(deviceValue)
        ? deviceValue
        : fallback;

const subscribePrefs = (listener: () => void): (() => void) => {
  const unsubscribeMeta = useMetaStore.subscribe(listener);
  const unsubscribeSettings = useSettingsStore.subscribe(listener);
  return () => {
    unsubscribeMeta();
    unsubscribeSettings();
  };
};

export const resolveBattleLayout = resolveWith<BattleLayoutId>(
  isBattleLayoutId,
  DEFAULT_BATTLE_LAYOUT,
);

export const battleLayoutId = (): BattleLayoutId =>
  resolveBattleLayout(
    useMetaStore.getState().prefs.battleLayout,
    useSettingsStore.getState().battleLayout,
  );

export const useBattleLayoutId = (): BattleLayoutId =>
  useSyncExternalStore(subscribePrefs, battleLayoutId, battleLayoutId);

export const chooseBattleLayout = (id: BattleLayoutId): void => {
  useSettingsStore.getState().setBattleLayout(id);
  useMetaStore.getState().setPrefs({ battleLayout: id });
};

export const resolveChartLayout = resolveWith<ChartLayoutId>(
  isChartLayoutId,
  DEFAULT_CHART_LAYOUT,
);

export const chartLayoutId = (): ChartLayoutId =>
  resolveChartLayout(
    useMetaStore.getState().prefs.chartLayout,
    useSettingsStore.getState().chartLayout,
  );

export const useChartLayoutId = (): ChartLayoutId =>
  useSyncExternalStore(subscribePrefs, chartLayoutId, chartLayoutId);

export const chooseChartLayout = (id: ChartLayoutId): void => {
  useSettingsStore.getState().setChartLayout(id);
  useMetaStore.getState().setPrefs({ chartLayout: id });
};

export const resolveRollStyle = resolveWith<RollStyle>(
  isRollStyle,
  DEFAULT_ROLL_STYLE,
);

export const rollStyleId = (): RollStyle =>
  resolveRollStyle(
    useMetaStore.getState().prefs.rollStyle,
    useSettingsStore.getState().rollStyle,
  );

export const useRollStyle = (): RollStyle =>
  useSyncExternalStore(subscribePrefs, rollStyleId, rollStyleId);

export const chooseRollStyle = (id: RollStyle): void => {
  useSettingsStore.getState().setRollStyle(id);
  useMetaStore.getState().setPrefs({ rollStyle: id });
};

export const chooseTheme = (id: ThemeId): void => {
  useSettingsStore.getState().setTheme(id);
  useMetaStore.getState().setPrefs({ theme: id });
};
