import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  migrateSettings,
  reducedMotionSnapshot,
  resolveReducedMotion,
  SETTINGS_VERSION,
  subscribeReducedMotion,
  useReducedMotion,
  useSettingsStore,
} from '@/stores/settingsStore';

describe('settings migrations', () => {
  it('current version is wired', () => {
    expect(SETTINGS_VERSION).toBe(9);
  });

  it('v1 blobs keep their values and gain the later defaults', () => {
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
      battleLayout: 'console',
      chartLayout: 'spiral',
      rollStyle: 'flip',
      bridgeFrame: 'hull',
      skipTally: false,
      vignette: 'full',
      voice: false,
      haptics: true,
    });
  });

  it('a fresh device starts with the voice off and the haptics on', () => {
    expect(useSettingsStore.getInitialState()).toMatchObject({ voice: false, haptics: true });
  });

  it('a v8 blob gains the voice off and the haptics on, and keeps a choice it had', () => {
    const v8 = migrateSettings({ skipTally: true }, 8);
    expect(v8.voice).toBe(false);
    expect(v8.haptics).toBe(true);
    expect(v8.skipTally).toBe(true);
    expect(migrateSettings({ voice: true, haptics: false }, 9)).toMatchObject({ voice: true, haptics: false });
    expect(migrateSettings({ voice: 'yes', haptics: 0 }, 9)).toMatchObject({ voice: false, haptics: true });
  });

  it('a v5 blob gains the spiral chart and keeps everything it had', () => {
    const v5 = migrateSettings(
      { battleLayout: 'tablet', theme: 'terminal', skipTally: true },
      5,
    );
    expect(v5.chartLayout).toBe('spiral');
    expect(v5.battleLayout).toBe('tablet');
    expect(v5.theme).toBe('terminal');
    expect(v5.skipTally).toBe(true);
  });

  it('a v6 blob gains the flip roll and keeps its chart layout', () => {
    const v6 = migrateSettings({ chartLayout: 'rings', battleSpeed: 'fast' }, 6);
    expect(v6.rollStyle).toBe('flip');
    expect(v6.chartLayout).toBe('rings');
    expect(v6.battleSpeed).toBe('fast');
  });

  it('a v7 blob gains the hull frame and keeps everything it had', () => {
    const v7 = migrateSettings({ rollStyle: 'reel', chartLayout: 'rings' }, 7);
    expect(v7.bridgeFrame).toBe('hull');
    expect(v7.rollStyle).toBe('reel');
    expect(v7.chartLayout).toBe('rings');
  });

  it('keeps a known bridge frame and drops an unknown one', () => {
    expect(migrateSettings({ bridgeFrame: 'obsidian' }, 8).bridgeFrame).toBe(
      'obsidian',
    );
    expect(migrateSettings({ bridgeFrame: 'marble' }, 8).bridgeFrame).toBe(
      'hull',
    );
  });

  it('keeps a known roll style and drops an unknown one', () => {
    expect(migrateSettings({ rollStyle: 'reel' }, 7).rollStyle).toBe('reel');
    expect(migrateSettings({ rollStyle: 'spin' }, 7).rollStyle).toBe('flip');
  });

  it('keeps a known chart layout and drops an unknown one', () => {
    expect(migrateSettings({ chartLayout: 'nebulae' }, 6).chartLayout).toBe(
      'nebulae',
    );
    expect(migrateSettings({ chartLayout: 'radial' }, 6).chartLayout).toBe(
      'spiral',
    );
  });

  it('carries a v3 skip-tally choice forward', () => {
    expect(migrateSettings({ skipTally: true }, 3).skipTally).toBe(true);
    expect(migrateSettings({ skipTally: 'yes' }, 3).skipTally).toBe(false);
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

  it('keeps a known vignette intensity and drops an unknown one', () => {
    expect(migrateSettings({ vignette: 'subtle' }, 4).vignette).toBe('subtle');
    expect(migrateSettings({ vignette: 'blinding' }, 4).vignette).toBe('full');
  });

  it('keeps a known battle layout and drops an unknown one', () => {
    expect(migrateSettings({ battleLayout: 'orbit' }, 2).battleLayout).toBe(
      'orbit',
    );
    expect(migrateSettings({ battleLayout: 'holodeck' }, 2).battleLayout).toBe(
      'console',
    );
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

describe('useReducedMotion', () => {
  const stubOsReducedMotion = (
    initial: boolean,
  ): { listeners: Set<() => void>; flip: (matches: boolean) => void } => {
    const listeners = new Set<() => void>();
    let matches = initial;
    vi.stubGlobal('window', {
      matchMedia: (query: string) => ({
        get matches(): boolean {
          return query === '(prefers-reduced-motion: reduce)' && matches;
        },
        addEventListener: (_type: string, listener: () => void): void => {
          listeners.add(listener);
        },
        removeEventListener: (_type: string, listener: () => void): void => {
          listeners.delete(listener);
        },
      }),
    });
    return {
      listeners,
      flip: (next: boolean): void => {
        matches = next;
        for (const listener of [...listeners]) listener();
      },
    };
  };

  const ReducedMotionProbe = () => String(useReducedMotion());

  afterEach(() => {
    vi.unstubAllGlobals();
    useSettingsStore.setState({ reducedMotion: 'auto' });
  });

  it('follows an OS reduce-motion toggle while the setting is auto', () => {
    useSettingsStore.setState({ reducedMotion: 'auto' });
    const os = stubOsReducedMotion(false);
    const seen: boolean[] = [];
    const unsubscribe = subscribeReducedMotion(() => {
      seen.push(reducedMotionSnapshot());
    });

    os.flip(true);
    os.flip(false);
    expect(seen).toEqual([true, false]);

    unsubscribe();
    expect(os.listeners.size).toBe(0);
    os.flip(true);
    expect(seen).toEqual([true, false]);
  });

  it('a forced setting wins over the OS and still notifies when it changes', () => {
    useSettingsStore.setState({ reducedMotion: 'auto' });
    const os = stubOsReducedMotion(true);
    const seen: boolean[] = [];
    const unsubscribe = subscribeReducedMotion(() => {
      seen.push(reducedMotionSnapshot());
    });

    useSettingsStore.setState({ reducedMotion: 'off' });
    os.flip(true);
    useSettingsStore.setState({ reducedMotion: 'on' });
    os.flip(false);
    expect(seen).toEqual([false, false, true, true]);

    unsubscribe();
    useSettingsStore.setState({ reducedMotion: 'off' });
    expect(seen).toHaveLength(4);
  });

  it('renders the resolved value on the first render', () => {
    stubOsReducedMotion(true);
    useSettingsStore.setState({ reducedMotion: 'auto' });
    expect(renderToString(createElement(ReducedMotionProbe))).toBe('true');
    useSettingsStore.setState({ reducedMotion: 'off' });
    expect(renderToString(createElement(ReducedMotionProbe))).toBe('false');
  });

  it('subscribes to the setting alone when there is no window', () => {
    useSettingsStore.setState({ reducedMotion: 'auto' });
    const seen: boolean[] = [];
    const unsubscribe = subscribeReducedMotion(() => {
      seen.push(reducedMotionSnapshot());
    });
    useSettingsStore.setState({ reducedMotion: 'on' });
    unsubscribe();
    useSettingsStore.setState({ reducedMotion: 'auto' });
    expect(seen).toEqual([true]);
  });
});
