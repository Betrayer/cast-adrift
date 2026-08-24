import { useCallback, useEffect, useRef, type CSSProperties } from 'react';

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

export type MotionFlag = 'data-pop' | 'data-sweep';

export const fireMotionFlag = (
  element: Element | null,
  attribute: MotionFlag,
  ms: number,
): void => {
  if (element === null) return;
  element.removeAttribute(attribute);
  void (element as HTMLElement).offsetWidth;
  element.setAttribute(attribute, '1');
  window.setTimeout(() => {
    element.removeAttribute(attribute);
  }, ms);
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
  const timer = useRef(0);

  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
    },
    [],
  );

  const attach = useCallback((next: T | null) => {
    node.current = next;
  }, []);

  const fire = useCallback(() => {
    const element = node.current;
    if (element === null) return;
    element.removeAttribute(attribute);
    void element.offsetWidth;
    element.setAttribute(attribute, '1');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      element.removeAttribute(attribute);
    }, ms);
  }, [attribute, ms]);

  return { attach, fire };
};
