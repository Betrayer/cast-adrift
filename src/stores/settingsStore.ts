import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { EchoVerbosity, Locale, ReducedMotionSetting } from '@/types';

export interface SettingsValues {
  locale: Locale;
  sfxVol: number;
  musicVol: number;
  reducedMotion: ReducedMotionSetting;
  echoVerbosity: EchoVerbosity;
  screenShake: boolean;
}

export interface SettingsState extends SettingsValues {
  setLocale: (locale: Locale) => void;
  setSfxVol: (sfxVol: number) => void;
  setMusicVol: (musicVol: number) => void;
  setReducedMotion: (reducedMotion: ReducedMotionSetting) => void;
  setEchoVerbosity: (echoVerbosity: EchoVerbosity) => void;
  setScreenShake: (screenShake: boolean) => void;
}

export const SETTINGS_VERSION = 1;

export const migrateSettings = (
  persisted: unknown,
  fromVersion: number,
): SettingsValues => {
  if (import.meta.env.DEV) {
    console.info(
      `settingsStore: migrating v${String(fromVersion)} -> v${String(SETTINGS_VERSION)}`,
    );
  }
  return persisted as SettingsValues;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      locale: 'en',
      sfxVol: 0.8,
      musicVol: 0.6,
      reducedMotion: 'auto',
      echoVerbosity: 'normal',
      screenShake: true,
      setLocale: (locale) => set({ locale }),
      setSfxVol: (sfxVol) => set({ sfxVol }),
      setMusicVol: (musicVol) => set({ musicVol }),
      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
      setEchoVerbosity: (echoVerbosity) => set({ echoVerbosity }),
      setScreenShake: (screenShake) => set({ screenShake }),
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
