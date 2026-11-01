import {
  useEffect,
  useLayoutEffect,
  useRef,
  type HTMLAttributes,
  type RefObject,
} from 'react';
import { MOTION_MS } from '@/app/motion';
import { useLatest } from '@/app/useLatest';
import { easeOutCubic, rafClock, Tweens, type Ease } from '@/pixi/tween';
import { useReducedMotion } from '@/stores/settingsStore';

const countClock = rafClock();

export interface CountNumberProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  value: number;
  from?: number;
  ms?: number;
  ease?: Ease;
  format?: (value: number) => string;
}

const plainNumber = (value: number): string => String(value);

const writeText = (element: HTMLElement, text: string): void => {
  element.textContent = text;
};

export interface CountedTextOptions {
  from?: number;
  ms?: number;
  ease?: Ease;
  format?: (value: number) => string;
  markValue?: boolean;
}

export const useCountedText = (
  node: RefObject<HTMLElement | null>,
  value: number,
  {
    from,
    ms = MOTION_MS.m,
    ease = easeOutCubic,
    format = plainNumber,
    markValue = false,
  }: CountedTextOptions = {},
): void => {
  const reduced = useReducedMotion();
  const shown = useRef<number | null>(null);
  const engine = useRef<Tweens | null>(null);
  const formatRef = useLatest(format);
  const target = Math.round(value);
  const label = format(target);

  useLayoutEffect(() => {
    const element = node.current;
    const current = shown.current;
    if (element === null || current === null || current === target) return;
    writeText(element, formatRef.current(current));
  }, [node, label, target, formatRef]);

  useLayoutEffect(() => {
    const element = node.current;
    if (element === null) return;
    const write = (next: number): void => {
      shown.current = next;
      writeText(element, formatRef.current(next));
      if (markValue) element.dataset.countValue = String(next);
    };
    const start = shown.current ?? from ?? target;
    const tweens = engine.current ?? new Tweens(countClock);
    engine.current = tweens;
    if (start !== target && !reduced) element.setAttribute('data-counting', '1');
    const cancel = tweens.count(start, target, ms, write, {
      reduced,
      ease,
      onComplete: () => {
        delete element.dataset.counting;
      },
    });
    return () => {
      cancel();
      delete element.dataset.counting;
    };
  }, [node, target, from, ms, ease, reduced, markValue, formatRef]);

  useEffect(
    () => () => {
      engine.current?.destroy();
      engine.current = null;
    },
    [],
  );
};

export const CountNumber = ({
  value,
  from,
  ms,
  ease,
  format = plainNumber,
  ...rest
}: CountNumberProps) => {
  const node = useRef<HTMLSpanElement | null>(null);
  useCountedText(node, value, { from, ms, ease, format, markValue: true });
  const target = Math.round(value);
  return (
    <span ref={node} data-count-target={target} {...rest}>
      {format(target)}
    </span>
  );
};
