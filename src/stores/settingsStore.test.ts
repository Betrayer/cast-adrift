import { describe, expect, it } from 'vitest';
import {
  migrateSettings,
  resolveReducedMotion,
  SETTINGS_VERSION,
} from '@/stores/settingsStore';

describe('settings migrations', () => {
  it('current version is wired', () => {
    expect(SETTINGS_VERSION).toBe(1);
  });

  it('migrate passes persisted state through', () => {
    const persisted = {
      locale: 'uk',
      sfxVol: 0.5,
      musicVol: 0.4,
      reducedMotion: 'auto',
      echoVerbosity: 'normal',
      screenShake: false,
    };
    expect(migrateSettings(persisted, 0)).toEqual(persisted);
  });
});

describe('resolveReducedMotion', () => {
  it('forced values win over media query', () => {
    expect(resolveReducedMotion('on')).toBe(true);
    expect(resolveReducedMotion('off')).toBe(false);
  });

  it('auto without a window resolves to false', () => {
    expect(resolveReducedMotion('auto')).toBe(false);
  });
});
