import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLatest } from '@/app/useLatest';
import { schools } from '@/data/schools';
import { partsEndMs, rollParts, visibleFace, type RollableDie } from '@/dice3d/dieRoll';
import { paintParts } from '@/dice3d/paintCanvas';
import type { RollStyle } from '@/dice3d/spin';
import type { School } from '@/types/content';
import styles from './DiceRollOverlay.module.css';

export interface OverlayDie extends RollableDie {
  key: string;
  school: School;
}

interface Props {
  dice: readonly OverlayDie[];
  seed: number;
  style: RollStyle;
  durationMs: number;
  reduced: boolean;
  size?: number;
  idle?: boolean;
  skip?: boolean;
  onSettled?: () => void;
  wrapDie?: (die: OverlayDie, index: number, canvas: ReactNode) => ReactNode;
  children?: ReactNode;
  testId?: string;
}

const MAX_DPR = 2;
const RADIUS_SHARE = 0.46;

const diceSignature = (dice: readonly OverlayDie[]): string =>
  dice
    .map((die) =>
      [die.key, die.defId, die.school, die.tier, die.value ?? '', (die.faces ?? []).join(',')].join(':'),
    )
    .join('|');

const partsFor = (
  dice: readonly OverlayDie[],
  seed: number,
  style: RollStyle,
  durationMs: number,
  reduced: boolean,
  size: number,
) =>
  dice.map((die, index) =>
    rollParts(die, {
      style,
      durationMs,
      reduced,
      radius: size * RADIUS_SHARE,
      seed: (seed + index * 7919) >>> 0,
    }),
  );

export const DiceRollOverlay = ({
  dice,
  seed,
  style,
  durationMs,
  reduced,
  size = 64,
  idle = false,
  skip = false,
  onSettled,
  wrapDie,
  children,
  testId,
}: Props) => {
  const signature = diceSignature(dice);
  const [held, setHeld] = useState({ signature, dice });
  if (held.signature !== signature) setHeld({ signature, dice });
  const canvases = useRef<(HTMLCanvasElement | null)[]>([]);
  const [settled, setSettled] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<string | null>(null);
  const parts = useMemo(
    () => partsFor(held.dice, seed, style, durationMs, reduced, size),
    [held, seed, style, durationMs, reduced, size],
  );
  const endMs = Math.max(0, ...parts.map(partsEndMs));
  const runKey = `${held.signature}#${String(seed)}#${style}#${String(durationMs)}#${reduced ? 'r' : 'm'}`;
  const isSettled = !idle && settled === runKey;
  const showsValue = idle || isSettled;
  const settledRef = useLatest(onSettled);
  const drawRef = useRef<((ms: number) => void) | null>(null);
  const notifiedRun = useRef<string | null>(null);
  const lastMsRef = useRef(0);

  useEffect(() => {
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const draw = (ms: number): void => {
      lastMsRef.current = ms;
      parts.forEach((dieParts, index) => {
        const canvas = canvases.current[index];
        const ctx = canvas?.getContext('2d');
        const die = held.dice[index];
        if (canvas === undefined || canvas === null || ctx === null || ctx === undefined || die === undefined) {
          return;
        }
        const pixels = Math.round(size * dpr);
        if (canvas.width !== pixels) canvas.width = pixels;
        if (canvas.height !== pixels) canvas.height = pixels;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, size, size);
        paintParts(
          ctx,
          dieParts.map((part) => ({ ...part, frame: part.plan.at(ms) })),
          size / 2,
          size / 2,
          schools[die.school],
        );
      });
    };
    drawRef.current = draw;
    if (idle) {
      draw(endMs + 1);
      return;
    }
    let handle = 0;
    let started = 0;
    let done = false;
    const finish = (): void => {
      if (done) return;
      done = true;
      draw(endMs + 1);
      setSettled(runKey);
      if (notifiedRun.current === runKey) return;
      notifiedRun.current = runKey;
      settledRef.current?.();
    };
    if (skip || skipped === runKey) {
      finish();
      return;
    }
    const tick = (now: number): void => {
      if (started === 0) started = now;
      const ms = now - started;
      draw(ms);
      if (ms >= endMs) {
        finish();
        return;
      }
      handle = window.requestAnimationFrame(tick);
    };
    handle = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(handle);
    };
  }, [parts, held, endMs, size, idle, skip, skipped, runKey, settledRef]);

  return (
    <div
      className={styles.overlay}
      data-dice-roll
      data-testid={testId}
      data-roll-idle={idle ? '1' : undefined}
      data-roll-settled={isSettled ? '1' : undefined}
      data-roll-style={reduced ? 'reduced' : style}
      onClick={() => {
        if (!idle && !isSettled) setSkipped(runKey);
      }}
    >
      <div className={styles.row}>
        {held.dice.map((die, index) => {
          const canvas = (
            <canvas
              key={die.key}
              ref={(node) => {
                canvases.current[index] = node;
                if (node !== null) drawRef.current?.(lastMsRef.current);
              }}
              className={styles.die}
              style={{ width: size, height: size }}
              data-roll-die={die.key}
              data-roll-face={showsValue && die.value !== null ? visibleFace(parts[index] ?? [], endMs + 1) : undefined}
              aria-label={showsValue && die.value !== null ? String(die.value) : '?'}
              role="img"
            />
          );
          return wrapDie === undefined ? canvas : <span key={die.key}>{wrapDie(die, index, canvas)}</span>;
        })}
      </div>
      {isSettled ? children : null}
    </div>
  );
};
