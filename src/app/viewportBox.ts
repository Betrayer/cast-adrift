import { useSyncExternalStore } from 'react';
import { HEIGHTS } from '@/app/breakpoints';

const listeners = new Set<() => void>();

let probe: HTMLDivElement | null = null;
let observer: ResizeObserver | null = null;
let height = 0;

export const isCompactBox = (px: number): boolean =>
  px > 0 && px <= HEIGHTS.compact;

export const boxHeight = (): number => height;

const apply = (px: number): void => {
  const next = Math.round(px);
  if (next === height) return;
  height = next;
  document.documentElement.dataset.caCompact = isCompactBox(next) ? '1' : '0';
  for (const listener of [...listeners]) listener();
};

export const measureViewportBox = (): void => {
  if (typeof document === 'undefined') return;
  if (probe === null) {
    probe = document.createElement('div');
    probe.dataset.viewportProbe = '';
    probe.style.cssText =
      'position:fixed;top:0;left:0;width:0;height:var(--ca-vh);visibility:hidden;pointer-events:none';
    document.body.appendChild(probe);
    observer = new ResizeObserver(() => {
      if (probe !== null) apply(probe.getBoundingClientRect().height);
    });
    observer.observe(probe);
    window.addEventListener('resize', measureViewportBox);
    window.addEventListener('orientationchange', measureViewportBox);
  }
  apply(probe.getBoundingClientRect().height);
};

export const stopViewportBox = (): void => {
  observer?.disconnect();
  observer = null;
  probe?.remove();
  probe = null;
  window.removeEventListener('resize', measureViewportBox);
  window.removeEventListener('orientationchange', measureViewportBox);
};

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = (): boolean => isCompactBox(height);

const getServerSnapshot = (): boolean => false;

export const useCompactBox = (): boolean =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
