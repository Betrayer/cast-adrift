import { describe, expect, it } from 'vitest';
import {
  migrateSettings,
  resolveReducedMotion,
  SETTINGS_VERSION,
} from '@/stores/settingsStore';

describe('settings migrations', () => {
  it('current version is wired', () => {
    expect(SETTINGS_VERSION).toBe(2);
  });

  it('v1 blobs keep their values and gain the v2 defaults', () => {
    const persisted = {
      locale: 'uk',
      sfxVol: 0.5,
      musicVol: 0.4,
      reducedMotion: 'auto',
      echoVerbosity: 'normal',
      screenShake: false,
    };
    expect(migrateSettings(persisted, 1)).toEqual({
      ...persisted,
      theme: 'deepSpace',
      fontScale: 'm',
      battleSpeed: 'normal',
    });
  });

  it('an unknown theme id falls back to the free default', () => {
    expect(migrateSettings({ theme: 'chartreuse' }, 1).theme).toBe('deepSpace');
    expect(migrateSettings({ theme: 'terminal' }, 1).theme).toBe('terminal');
  });

  it('junk font scale and battle speed are replaced, not carried', () => {
    const values = migrateSettings({ fontScale: 'xl', battleSpeed: 'warp' }, 1);
    expect(values.fontScale).toBe('m');
    expect(values.battleSpeed).toBe('normal');
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
