import { useSyncExternalStore } from "react";
import {
  DEFAULT_BATTLE_LAYOUT,
  isBattleLayoutId,
} from "@/data/battleLayouts";
import type { ThemeId } from "@/data/themes";
import { useMetaStore } from "@/stores/metaStore";
import { useSettingsStore } from "@/stores/settingsStore";
import type { BattleLayoutId } from "@/types";

export const resolveBattleLayout = (
  accountValue: BattleLayoutId | undefined,
  deviceValue: BattleLayoutId | undefined,
): BattleLayoutId =>
  isBattleLayoutId(accountValue)
    ? accountValue
    : isBattleLayoutId(deviceValue)
      ? deviceValue
      : DEFAULT_BATTLE_LAYOUT;

export const battleLayoutId = (): BattleLayoutId =>
  resolveBattleLayout(
    useMetaStore.getState().prefs.battleLayout,
    useSettingsStore.getState().battleLayout,
  );

const listeners = new Set<() => void>();
let current: BattleLayoutId = battleLayoutId();
let unsubscribeMeta: (() => void) | null = null;
let unsubscribeSettings: (() => void) | null = null;

const sync = (): void => {
  const next = battleLayoutId();
  if (next === current) return;
  current = next;
  for (const listener of [...listeners]) listener();
};

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  if (listeners.size === 1) {
    unsubscribeMeta = useMetaStore.subscribe(sync);
    unsubscribeSettings = useSettingsStore.subscribe(sync);
  }
  sync();
  return () => {
    listeners.delete(listener);
    if (listeners.size > 0) return;
    unsubscribeMeta?.();
    unsubscribeSettings?.();
    unsubscribeMeta = null;
    unsubscribeSettings = null;
  };
};

const snapshot = (): BattleLayoutId => current;

export const useBattleLayoutId = (): BattleLayoutId =>
  useSyncExternalStore(subscribe, snapshot, snapshot);

export const chooseBattleLayout = (id: BattleLayoutId): void => {
  useSettingsStore.getState().setBattleLayout(id);
  useMetaStore.getState().setPrefs({ battleLayout: id });
  sync();
};

export const chooseTheme = (id: ThemeId): void => {
  useSettingsStore.getState().setTheme(id);
  useMetaStore.getState().setPrefs({ theme: id });
};
