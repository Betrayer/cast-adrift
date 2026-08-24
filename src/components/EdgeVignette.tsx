import { useEffect, useRef } from 'react';
import {
  subscribeVignette,
  vignetteRims,
  type VignetteFlash,
  type VignetteFlashKind,
  type VignetteRims,
} from '@/services/vignette';
import { useSettingsStore } from '@/stores/settingsStore';
import type { VignetteIntensity } from '@/types';
import styles from './EdgeVignette.module.css';

const FLASH_POOL = 4;

interface FlashStyle {
  color: string;
  alpha: number;
  ms: number;
}

const FLASH_STYLE: Record<VignetteFlashKind, FlashStyle> = {
  shieldGain: { color: 'var(--ca-school-blue-stroke)', alpha: 0.3, ms: 400 },
  shieldBreak: { color: 'var(--ca-school-blue-stroke)', alpha: 0.38, ms: 520 },
  hullHit: { color: 'var(--ca-danger)', alpha: 0.42, ms: 360 },
  dodge: { color: 'var(--ca-school-green-stroke)', alpha: 0.3, ms: 240 },
  glancing: { color: 'var(--ca-school-green-stroke)', alpha: 0.15, ms: 240 },
  surge: { color: 'var(--ca-school-black-stroke)', alpha: 0.32, ms: 460 },
  toll: { color: 'var(--ca-danger)', alpha: 0.34, ms: 320 },
};

const RIM_ALPHA: Record<keyof VignetteRims, number> = {
  shield: 0.16,
  lowHull: 0.24,
};

const INTENSITY_SCALE: Record<VignetteIntensity, number> = {
  off: 0,
  subtle: 0.5,
  full: 1,
};

const motionReduced = (): boolean =>
  document.documentElement.dataset.caMotion === 'reduced';

export const EdgeVignette = () => {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (root === null) return;
    const flashes = [...root.querySelectorAll<HTMLDivElement>('[data-vignette-pool]')];
    const rimNodes = new Map<keyof VignetteRims, HTMLDivElement>();
    for (const node of root.querySelectorAll<HTMLDivElement>('[data-vignette-rim]')) {
      const kind = node.dataset.vignetteRim as keyof VignetteRims | undefined;
      if (kind !== undefined) rimNodes.set(kind, node);
    }
    let cursor = 0;

    const paintRims = (rims: VignetteRims): void => {
      for (const [kind, node] of rimNodes) {
        node.dataset.on = rims[kind] ? '1' : '0';
        root.dataset[kind === 'shield' ? 'vignetteShield' : 'vignetteLow'] =
          rims[kind] ? '1' : '0';
      }
    };

    const paintFlash = (flash: VignetteFlash): void => {
      const node = flashes[cursor % flashes.length];
      cursor += 1;
      if (node === undefined) return;
      const style = FLASH_STYLE[flash.kind];
      node.removeAttribute('data-vignette-flash');
      void node.offsetWidth;
      node.dataset.vignetteSide = flash.side;
      node.style.setProperty('--vg-color', style.color);
      node.style.setProperty('--vg-alpha', String(style.alpha * flash.strength));
      node.style.setProperty('--vg-ms', `${String(style.ms)}ms`);
      node.dataset.vignetteFlash = flash.kind;
      root.dataset.vignetteLast = flash.kind;
      root.dataset.vignetteSeq = String(flash.seq);
      window.setTimeout(() => {
        if (node.dataset.vignetteFlash === flash.kind) {
          node.removeAttribute('data-vignette-flash');
        }
      }, style.ms);
    };

    const applyIntensity = (value: VignetteIntensity): void => {
      root.dataset.vignetteIntensity = value;
      root.style.setProperty('--vg-scale', String(INTENSITY_SCALE[value]));
      if (value !== 'off') paintRims(vignetteRims());
    };

    for (const [kind, node] of rimNodes) {
      node.style.setProperty('--vg-rim-alpha', String(RIM_ALPHA[kind]));
    }
    applyIntensity(useSettingsStore.getState().vignette);

    const stopSettings = useSettingsStore.subscribe((state, prev) => {
      if (state.vignette !== prev.vignette) applyIntensity(state.vignette);
    });
    const stop = subscribeVignette((event) => {
      if (motionReduced()) return;
      if (useSettingsStore.getState().vignette === 'off') return;
      if (event.k === 'rims') paintRims(event.rims);
      else paintFlash(event.flash);
    });
    return () => {
      stop();
      stopSettings();
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.layer} data-vignette aria-hidden="true">
      <div className={styles.rim} data-vignette-rim="shield" data-on="0" />
      <div className={styles.rim} data-vignette-rim="lowHull" data-on="0" />
      {Array.from({ length: FLASH_POOL }, (_, index) => (
        <div key={index} className={styles.flash} data-vignette-pool={index} />
      ))}
    </div>
  );
};
