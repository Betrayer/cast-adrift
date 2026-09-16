import { describe, expect, it } from 'vitest';
import { officerDef } from '@/data/officers';
import type { ConsoleShape } from '@/game/battle/view';
import { growShape } from './shape';

const scrapper = officerDef('scrapper');

const shapeOf = (
  cabins: ConsoleShape['cabins'],
  echo: ConsoleShape['echo'] = null,
): ConsoleShape => ({
  fate: false,
  bloodReactor: false,
  sacrifice: false,
  passive: null,
  actives: [],
  cabins,
  echo,
});

describe('the console shape memo', () => {
  it('keeps the previous shape when an officer-less console repeats itself', () => {
    const prev = shapeOf([null, null]);
    expect(growShape(prev, shapeOf([null, null]))).toBe(prev);
  });

  it('keeps the previous shape when a crewed console repeats itself', () => {
    expect(scrapper).toBeDefined();
    if (scrapper === undefined) return;
    const prev = shapeOf([scrapper, null]);
    expect(growShape(prev, shapeOf([scrapper, null]))).toBe(prev);
  });

  it('adopts the cabins the moment an officer arrives', () => {
    expect(scrapper).toBeDefined();
    if (scrapper === undefined) return;
    const prev = shapeOf([null, null]);
    const next = shapeOf([scrapper, null]);
    const grown = growShape(prev, next);
    expect(grown).not.toBe(prev);
    expect(grown.cabins).toBe(next.cabins);
  });

  it('never drops a cabin an earlier shape already carried', () => {
    expect(scrapper).toBeDefined();
    if (scrapper === undefined) return;
    const prev = shapeOf([scrapper, null]);
    const grown = growShape(prev, shapeOf([null, null]));
    expect(grown).toBe(prev);
    expect(grown.cabins[0]).toBe(scrapper);
  });

  it('still grows every other field it is given', () => {
    const prev = shapeOf([null, null]);
    const next: ConsoleShape = {
      ...shapeOf([null, null]),
      fate: true,
      actives: ['flip'],
    };
    const grown = growShape(prev, next);
    expect(grown).not.toBe(prev);
    expect(grown.fate).toBe(true);
    expect(grown.actives).toEqual(['flip']);
    expect(grown.cabins).toBe(prev.cabins);
  });
});
