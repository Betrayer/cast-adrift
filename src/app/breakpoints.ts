import { useSyncExternalStore } from 'react';

export const BREAKPOINTS = {
  xs: 360,
  sm: 480,
  md: 768,
  lg: 900,
  xl: 1280,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

export const BREAKPOINT_ORDER: readonly Breakpoint[] = [
  'xs',
  'sm',
  'md',
  'lg',
  'xl',
];

export const breakpointFor = (width: number): Breakpoint => {
  let match: Breakpoint = 'xs';
  for (const name of BREAKPOINT_ORDER) {
    if (width >= BREAKPOINTS[name]) match = name;
  }
  return match;
};

export const atLeast = (width: number, bp: Breakpoint): boolean =>
  width >= BREAKPOINTS[bp];

export const HEIGHTS = {
  compact: 780,
} as const;

export const HEIGHT_ORDER: readonly (keyof typeof HEIGHTS)[] = ['compact'];

export const ROTATE_GATE_MAX_HEIGHT = 520;

export const needsRotateGate = (width: number, height: number): boolean =>
  width > height && width < BREAKPOINTS.lg && height < ROTATE_GATE_MAX_HEIGHT;

export interface Viewport {
  width: number;
  height: number;
}

const FALLBACK: Viewport = { width: BREAKPOINTS.md, height: 1024 };

const read = (): Viewport =>
  typeof window === 'undefined'
    ? FALLBACK
    : { width: window.innerWidth, height: window.innerHeight };

let current: Viewport = read();
const listeners = new Set<() => void>();

const sync = (): void => {
  const next = read();
  if (next.width === current.width && next.height === current.height) return;
  current = next;
  for (const listener of [...listeners]) listener();
};

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  if (listeners.size === 1 && typeof window !== 'undefined') {
    window.addEventListener('resize', sync);
    window.addEventListener('orientationchange', sync);
  }
  sync();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof window !== 'undefined') {
      window.removeEventListener('resize', sync);
      window.removeEventListener('orientationchange', sync);
    }
  };
};

const getSnapshot = (): Viewport => current;
const getServerSnapshot = (): Viewport => FALLBACK;

export const useViewport = (): Viewport =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

export const useAtLeast = (bp: Breakpoint): boolean =>
  atLeast(useViewport().width, bp);

export const useRotateGate = (): boolean => {
  const { width, height } = useViewport();
  return needsRotateGate(width, height);
};
