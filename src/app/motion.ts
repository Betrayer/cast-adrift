import { useCallback, useEffect, useRef, type CSSProperties } from 'react';
import { spring } from '@/pixi/tween';

export const MOTION_MS = { xs: 120, s: 180, m: 260, l: 420, xl: 620 } as const;

export const STAGGER_MS = { list: 45, card: 70 } as const;

export const REDUCED_MS = 160;

export const reducedFade = (ms: number, reduced: boolean): number =>
  reduced ? Math.min(ms, REDUCED_MS) : ms;

export const MOTION_EASE_CSS = {
  out: 'cubic-bezier(0.33, 1, 0.68, 1)',
  back: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  linear: 'linear',
} as const;

export const SPRING_SAMPLES = 24;

export const springLinearCss = (): string => {
  const points: string[] = [];
  for (let index = 0; index <= SPRING_SAMPLES; index += 1) {
    points.push(spring(index / SPRING_SAMPLES).toFixed(3));
  }
  return `linear(${points.join(', ')})`;
};

export const reducedNow = (): boolean =>
  typeof document !== 'undefined' &&
  document.documentElement.dataset.caMotion === 'reduced';

export const scrollIntoFocus = (element: Element | null | undefined): void => {
  element?.scrollIntoView({
    block: 'center',
    behavior: reducedNow() ? 'auto' : 'smooth',
  });
};

export const RISE_STEPS = 3;

export const POP_MS = 340;

export const SWEEP_MS = 520;

export const riseStyle = (index: number): CSSProperties =>
  ({
    '--ca-rise-index': String(Math.min(Math.max(0, index), RISE_STEPS)),
  }) as CSSProperties;

export const flourishStyle = (color: string, ms: number): CSSProperties =>
  ({
    '--ca-flourish-color': color,
    '--ca-flourish-ms': `${String(ms)}ms`,
  }) as CSSProperties;

export const staggerStyle = (ms: number): CSSProperties =>
  ({ '--ca-stagger-ms': `${String(ms)}ms` }) as CSSProperties;

export type MotionFlag = 'data-pop' | 'data-sweep' | 'data-armed' | 'data-pulse';

const firedFlags = new WeakMap<Element, Map<MotionFlag, number>>();

export const fireMotionFlag = (
  element: Element | null,
  attribute: MotionFlag,
  ms: number,
): void => {
  if (element === null) return;
  const timers = firedFlags.get(element) ?? new Map<MotionFlag, number>();
  window.clearTimeout(timers.get(attribute));
  element.removeAttribute(attribute);
  void (element as HTMLElement).offsetWidth;
  element.setAttribute(attribute, '1');
  timers.set(
    attribute,
    window.setTimeout(() => {
      timers.delete(attribute);
      element.removeAttribute(attribute);
    }, ms),
  );
  firedFlags.set(element, timers);
};

export interface MotionFlagHandle<T extends HTMLElement> {
  attach: (node: T | null) => void;
  fire: () => void;
}

export const useMotionFlag = <T extends HTMLElement>(
  attribute: MotionFlag,
  ms: number,
): MotionFlagHandle<T> => {
  const node = useRef<T | null>(null);

  const attach = useCallback((next: T | null) => {
    node.current = next;
  }, []);

  const fire = useCallback(() => {
    fireMotionFlag(node.current, attribute, ms);
  }, [attribute, ms]);

  return { attach, fire };
};

export const useSweepWhen = <T extends HTMLElement>(
  active: boolean,
): ((node: T | null) => void) => {
  const { attach, fire } = useMotionFlag<T>('data-sweep', SWEEP_MS);

  useEffect(() => {
    if (active) fire();
  }, [active, fire]);

  return attach;
};
