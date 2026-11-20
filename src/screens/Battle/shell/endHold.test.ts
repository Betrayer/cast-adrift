import { describe, expect, it } from 'vitest';
import { MOTION_MS } from '@/app/motion';
import { DEATH_MS, HEAVY_HIT_STOP_MS } from '@/pixi/battle/timing';
import { DEFEAT_CLOSE_MS, endHoldMs, VICTORY_HOLD_MS } from './endHold';

describe('battle end hold', () => {
  it('builds the victory hold from the scene fall and the headline hit-stop', () => {
    expect(VICTORY_HOLD_MS).toBe(
      Math.max(MOTION_MS.xl, DEATH_MS + HEAVY_HIT_STOP_MS),
    );
  });

  it('holds a victory until a headline fall started at the end has played', () => {
    expect(endHoldMs('victory', false)).toBe(VICTORY_HOLD_MS);
    expect(VICTORY_HOLD_MS).toBeGreaterThanOrEqual(MOTION_MS.xl);
    expect(VICTORY_HOLD_MS).toBeGreaterThanOrEqual(
      DEATH_MS + HEAVY_HIT_STOP_MS,
    );
  });

  it('holds a defeat for the vignette close', () => {
    expect(endHoldMs('defeat', false)).toBe(DEFEAT_CLOSE_MS);
    expect(DEFEAT_CLOSE_MS).toBe(MOTION_MS.xl);
  });

  it('resolves at once under reduced motion or without an outcome', () => {
    expect(endHoldMs('victory', true)).toBe(0);
    expect(endHoldMs('defeat', true)).toBe(0);
    expect(endHoldMs(undefined, false)).toBe(0);
  });
});
