import { describe, expect, it } from 'vitest';
import type { CoachMarkDef, CoachRect } from '@/game/tutorial';
import { nextCoachTarget } from './CoachMarks';

const markDef = (id: string): CoachMarkDef => ({
  id,
  screen: 'battle',
  title: `run:tutorial.${id}.title`,
  body: `run:tutorial.${id}.body`,
  anchor: () => null,
  ready: () => true,
});

const rect = (x: number, y: number, w: number, h: number): CoachRect => ({
  x,
  y,
  w,
  h,
});

describe('nextCoachTarget', () => {
  it('keeps the target when the mark and the anchor are unchanged', () => {
    const place = markDef('place');
    const prev = { mark: place, rect: rect(0, 300, 360, 200) };
    expect(nextCoachTarget(prev, place, rect(0, 300, 360, 200))).toBe(prev);
  });

  it('refreshes the target when the anchor moves vertically', () => {
    const place = markDef('place');
    const prev = { mark: place, rect: rect(0, 300, 360, 200) };
    const next = nextCoachTarget(prev, place, rect(0, 240, 360, 200));
    expect(next).not.toBe(prev);
    expect(next.rect.y).toBe(240);
  });

  it('refreshes the target when the anchor changes height', () => {
    const place = markDef('place');
    const prev = { mark: place, rect: rect(0, 300, 360, 200) };
    const next = nextCoachTarget(prev, place, rect(0, 300, 360, 160));
    expect(next).not.toBe(prev);
    expect(next.rect.h).toBe(160);
  });

  it('refreshes the target when the anchor changes width', () => {
    const place = markDef('place');
    const prev = { mark: place, rect: rect(0, 300, 360, 200) };
    const next = nextCoachTarget(prev, place, rect(0, 300, 320, 200));
    expect(next).not.toBe(prev);
    expect(next.rect.w).toBe(320);
  });

  it('replaces the target when the mark changes', () => {
    const prev = { mark: markDef('place'), rect: rect(0, 300, 360, 200) };
    const next = nextCoachTarget(prev, markDef('endTurn'), rect(0, 300, 360, 200));
    expect(next).not.toBe(prev);
    expect(next.mark.id).toBe('endTurn');
  });

  it('creates a target when there is none', () => {
    const place = markDef('place');
    expect(nextCoachTarget(null, place, rect(1, 2, 3, 4)).mark).toBe(place);
  });
});
