import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_THEME_ID, isThemeId, type ThemeId } from '@/data/themes';
import type {
  BattleSpeed,
  EchoVerbosity,
  FontScale,
  Locale,
  ReducedMotionSetting,
} from '@/types';

export interface SettingsValues {
  locale: Locale;
  sfxVol: number;
  musicVol: number;
  reducedMotion: ReducedMotionSetting;
  echoVerbosity: EchoVerbosity;
  screenShake: boolean;
  theme: ThemeId;
  fontScale: FontScale;
  battleSpeed: BattleSpeed;
}

export interface SettingsState extends SettingsValues {
  setLocale: (locale: Locale) => void;
  setSfxVol: (sfxVol: number) => void;
  setMusicVol: (musicVol: number) => void;
  setReducedMotion: (reducedMotion: ReducedMotionSetting) => void;
  setEchoVerbosity: (echoVerbosity: EchoVerbosity) => void;
  setScreenShake: (screenShake: boolean) => void;
  setTheme: (theme: ThemeId) => void;
  setFontScale: (fontScale: FontScale) => void;
  setBattleSpeed: (battleSpeed: BattleSpeed) => void;
}

export const SETTINGS_VERSION = 2;

const DEFAULTS: SettingsValues = {
  locale: 'en',
  sfxVol: 0.8,
  musicVol: 0.6,
  reducedMotion: 'auto',
  echoVerbosity: 'normal',
  screenShake: true,
  theme: DEFAULT_THEME_ID,
  fontScale: 'm',
  battleSpeed: 'normal',
};

const isFontScale = (value: unknown): value is FontScale =>
  value === 's' || value === 'm' || value === 'l';

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
      setTheme: (theme) => set({ theme }),
      setFontScale: (fontScale) => set({ fontScale }),
      setBattleSpeed: (battleSpeed) => set({ battleSpeed }),
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
        theme: s.theme,
        fontScale: s.fontScale,
        battleSpeed: s.battleSpeed,
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
