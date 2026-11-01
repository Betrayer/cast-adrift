import { useLayoutEffect, useRef, useState } from 'react';
import { useLatest } from '@/app/useLatest';
import { linear, rafTweens } from '@/pixi/tween';
import { useReducedMotion } from '@/stores/settingsStore';

export const TYPEWRITER_MS_PER_CHAR = 40;

export const TYPEWRITER_CAP_MS = 1200;

export const typewriterMs = (
  text: string,
  msPerChar = TYPEWRITER_MS_PER_CHAR,
  capMs = TYPEWRITER_CAP_MS,
): number =>
  Math.max(
    0,
    Math.min(capMs, Array.from(text).length * Math.max(0, msPerChar)),
  );

export const typewriterLineDelays = (
  texts: readonly string[],
  leadMs: number,
  gapMs: number,
): number[] => {
  const delays: number[] = [];
  let at = leadMs;
  for (const text of texts) {
    delays.push(at);
    at += typewriterMs(text) + gapMs;
  }
  return delays;
};

export interface TypewriterProps {
  text: string;
  msPerChar?: number;
  capMs?: number;
  delayMs?: number;
  instant?: boolean;
  onDone?: () => void;
  onSkip?: () => void;
}

const HIDDEN_REST = { opacity: 0 } as const;

const TypewriterRun = ({
  text,
  msPerChar = TYPEWRITER_MS_PER_CHAR,
  capMs = TYPEWRITER_CAP_MS,
  delayMs = 0,
  instant = false,
  onDone,
  onSkip,
}: TypewriterProps) => {
  const reduced = useReducedMotion();
  const duration = typewriterMs(text, msPerChar, capMs);
  const skip = instant || reduced || duration <= 0;
  const typedRef = useRef<HTMLSpanElement>(null);
  const restRef = useRef<HTMLSpanElement>(null);
  const finishRef = useRef<(() => void) | null>(null);
  const settledRef = useRef(false);
  const onDoneRef = useLatest(onDone);
  const [finished, setFinished] = useState(false);
  const done = skip || finished;

  useLayoutEffect(() => {
    const typed = typedRef.current;
    const rest = restRef.current;
    if (typed === null || rest === null) return;
    const chars = Array.from(text);
    const write = (count: number): void => {
      typed.textContent = chars.slice(0, count).join('');
      rest.textContent = chars.slice(count).join('');
    };
    const complete = (): void => {
      write(chars.length);
      finishRef.current = null;
      if (settledRef.current) return;
      settledRef.current = true;
      onDoneRef.current?.();
    };
    if (skip || settledRef.current) {
      complete();
      return;
    }
    const { tweens, destroy } = rafTweens();
    const cancel = tweens.count(0, chars.length, duration, write, {
      ease: linear,
      delay: Math.max(0, delayMs),
      onComplete: () => {
        complete();
        setFinished(true);
      },
    });
    finishRef.current = () => {
      cancel();
      complete();
      setFinished(true);
    };
    return () => {
      finishRef.current = null;
      destroy();
    };
  }, [text, skip, duration, delayMs, onDoneRef]);

  const finish = (): void => {
    finishRef.current?.();
    onSkip?.();
  };

  return (
    <span
      data-typewriter
      data-typed={done ? '1' : '0'}
      data-press={done ? undefined : ''}
      onClick={done ? undefined : finish}
    >
      <span ref={typedRef} />
      <span ref={restRef} style={HIDDEN_REST} />
    </span>
  );
};

export const Typewriter = (props: TypewriterProps) => (
  <TypewriterRun key={props.text} {...props} />
);
