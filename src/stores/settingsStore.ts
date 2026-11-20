import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  DEFAULT_BATTLE_LAYOUT,
  isBattleLayoutId,
} from '@/data/battleLayouts';
import {
  DEFAULT_BRIDGE_FRAME,
  isBridgeFrameChoice,
  type BridgeFrameChoice,
} from '@/data/bridgeFrames';
import { DEFAULT_CHART_LAYOUT, isChartLayoutId } from '@/data/chartLayouts';
import { DEFAULT_ROLL_STYLE, isRollStyle } from '@/data/rollStyles';
import { DEFAULT_THEME_ID, isThemeId, type ThemeId } from '@/data/themes';
import type {
  BattleLayoutId,
  BattleSpeed,
  ChartLayoutId,
  EchoVerbosity,
  FontScale,
  Locale,
  ReducedMotionSetting,
  RollStyle,
  VignetteIntensity,
} from '@/types';
import { pickShape, shapeKeys } from '@/stores/shape';

export interface SettingsValues {
  locale: Locale;
  sfxVol: number;
  musicVol: number;
  reducedMotion: ReducedMotionSetting;
  echoVerbosity: EchoVerbosity;
  screenShake: boolean;
  vignette: VignetteIntensity;
  theme: ThemeId;
  fontScale: FontScale;
  battleSpeed: BattleSpeed;
  battleLayout: BattleLayoutId;
  chartLayout: ChartLayoutId;
  rollStyle: RollStyle;
  bridgeFrame: BridgeFrameChoice;
  skipTally: boolean;
  voice: boolean;
  haptics: boolean;
}

export interface SettingsState extends SettingsValues {
  setLocale: (locale: Locale) => void;
  setSfxVol: (sfxVol: number) => void;
  setMusicVol: (musicVol: number) => void;
  setReducedMotion: (reducedMotion: ReducedMotionSetting) => void;
  setEchoVerbosity: (echoVerbosity: EchoVerbosity) => void;
  setScreenShake: (screenShake: boolean) => void;
  setVignette: (vignette: VignetteIntensity) => void;
  setTheme: (theme: ThemeId) => void;
  setFontScale: (fontScale: FontScale) => void;
  setBattleSpeed: (battleSpeed: BattleSpeed) => void;
  setBattleLayout: (battleLayout: BattleLayoutId) => void;
  setChartLayout: (chartLayout: ChartLayoutId) => void;
  setRollStyle: (rollStyle: RollStyle) => void;
  setBridgeFrame: (bridgeFrame: BridgeFrameChoice) => void;
  setSkipTally: (skipTally: boolean) => void;
  setVoice: (voice: boolean) => void;
  setHaptics: (haptics: boolean) => void;
}

export const SETTINGS_VERSION = 9;

const DEFAULTS: SettingsValues = {
  locale: 'en',
  sfxVol: 0.8,
  musicVol: 0.6,
  reducedMotion: 'auto',
  echoVerbosity: 'normal',
  screenShake: true,
  vignette: 'full',
  theme: DEFAULT_THEME_ID,
  fontScale: 'm',
  battleSpeed: 'normal',
  battleLayout: DEFAULT_BATTLE_LAYOUT,
  chartLayout: DEFAULT_CHART_LAYOUT,
  rollStyle: DEFAULT_ROLL_STYLE,
  bridgeFrame: DEFAULT_BRIDGE_FRAME,
  skipTally: false,
  voice: false,
  haptics: true,
};

const SETTINGS_KEYS = shapeKeys(DEFAULTS);

const isFontScale = (value: unknown): value is FontScale =>
  value === 's' || value === 'm' || value === 'l';

const isVignette = (value: unknown): value is VignetteIntensity =>
  value === 'off' || value === 'subtle' || value === 'full';

export const migrateSettings = (
  persisted: unknown,
  fromVersion: number,
): SettingsValues => {
  if (import.meta.env.DEV) {
    console.info(
      `settingsStore: migrating v${String(fromVersion)} -> v${String(SETTINGS_VERSION)}`,
    );
  }
  const prev = (persisted ?? {}) as Partial<SettingsValues>;
  return {
    ...DEFAULTS,
    ...prev,
    theme: isThemeId(prev.theme) ? prev.theme : DEFAULTS.theme,
    fontScale: isFontScale(prev.fontScale) ? prev.fontScale : DEFAULTS.fontScale,
    battleSpeed: prev.battleSpeed === 'fast' ? 'fast' : DEFAULTS.battleSpeed,
    battleLayout: isBattleLayoutId(prev.battleLayout)
      ? prev.battleLayout
      : DEFAULTS.battleLayout,
    chartLayout: isChartLayoutId(prev.chartLayout)
      ? prev.chartLayout
      : DEFAULTS.chartLayout,
    rollStyle: isRollStyle(prev.rollStyle) ? prev.rollStyle : DEFAULTS.rollStyle,
    bridgeFrame: isBridgeFrameChoice(prev.bridgeFrame)
      ? prev.bridgeFrame
      : DEFAULTS.bridgeFrame,
    skipTally: prev.skipTally === true,
    voice: prev.voice === true,
    haptics: prev.haptics !== false,
    vignette: isVignette(prev.vignette) ? prev.vignette : DEFAULTS.vignette,
  };
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setLocale: (locale) => set({ locale }),
      setSfxVol: (sfxVol) => set({ sfxVol }),
      setMusicVol: (musicVol) => set({ musicVol }),
      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
      setEchoVerbosity: (echoVerbosity) => set({ echoVerbosity }),
      setScreenShake: (screenShake) => set({ screenShake }),
      setVignette: (vignette) => set({ vignette }),
      setTheme: (theme) => set({ theme }),
      setFontScale: (fontScale) => set({ fontScale }),
      setBattleSpeed: (battleSpeed) => set({ battleSpeed }),
      setBattleLayout: (battleLayout) => set({ battleLayout }),
      setChartLayout: (chartLayout) => set({ chartLayout }),
      setRollStyle: (rollStyle) => set({ rollStyle }),
      setBridgeFrame: (bridgeFrame) => set({ bridgeFrame }),
      setSkipTally: (skipTally) => set({ skipTally }),
      setVoice: (voice) => set({ voice }),
      setHaptics: (haptics) => set({ haptics }),
    }),
    {
      name: 'ca.settings',
      version: SETTINGS_VERSION,
      migrate: migrateSettings,
      partialize: (s): SettingsValues => pickShape(SETTINGS_KEYS, s),
    },
  ),
);

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export const resolveReducedMotion = (setting: ReducedMotionSetting): boolean => {
  if (setting === 'on') return true;
  if (setting === 'off') return false;
  return (
    typeof window !== 'undefined' &&
    window.matchMedia(REDUCED_MOTION_QUERY).matches
  );
};

export const reducedMotionSnapshot = (): boolean =>
  resolveReducedMotion(useSettingsStore.getState().reducedMotion);

export const subscribeReducedMotion = (listener: () => void): (() => void) => {
  const unsubscribeSettings = useSettingsStore.subscribe(listener);
  if (typeof window === 'undefined') return unsubscribeSettings;
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener('change', listener);
  return () => {
    unsubscribeSettings();
    query.removeEventListener('change', listener);
  };
};

export const useReducedMotion = (): boolean =>
  useSyncExternalStore(
    subscribeReducedMotion,
    reducedMotionSnapshot,
    reducedMotionSnapshot,
  );
