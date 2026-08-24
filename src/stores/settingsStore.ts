import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  DEFAULT_BATTLE_LAYOUT,
  isBattleLayoutId,
} from '@/data/battleLayouts';
import { DEFAULT_THEME_ID, isThemeId, type ThemeId } from '@/data/themes';
import type {
  BattleLayoutId,
  BattleSpeed,
  EchoVerbosity,
  FontScale,
  Locale,
  ReducedMotionSetting,
  VignetteIntensity,
} from '@/types';

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
  skipTally: boolean;
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
  setSkipTally: (skipTally: boolean) => void;
}

export const SETTINGS_VERSION = 5;

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
  skipTally: false,
};

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
    skipTally: prev.skipTally === true,
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
      setSkipTally: (skipTally) => set({ skipTally }),
    }),
    {
      name: 'ca.settings',
      version: SETTINGS_VERSION,
      migrate: migrateSettings,
      partialize: (s): SettingsValues => ({
        locale: s.locale,
        sfxVol: s.sfxVol,
        musicVol: s.musicVol,
        reducedMotion: s.reducedMotion,
        echoVerbosity: s.echoVerbosity,
        screenShake: s.screenShake,
        vignette: s.vignette,
        theme: s.theme,
        fontScale: s.fontScale,
        battleSpeed: s.battleSpeed,
        battleLayout: s.battleLayout,
        skipTally: s.skipTally,
      }),
    },
  ),
);

export const resolveReducedMotion = (setting: ReducedMotionSetting): boolean => {
  if (setting === 'on') return true;
  if (setting === 'off') return false;
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
};
