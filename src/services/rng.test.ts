import { describe, expect, it } from 'vitest';
import { createStream, createStreams, deriveSeed, fnv1a } from '@/services/rng';
import type { StreamLabel } from '@/services/rng';

const LABELS: readonly StreamLabel[] = [
  'map',
  'dice',
  'loot',
  'events',
  'shop',
  'fate',
];

const draw = (stream: { next: () => number }, count: number): number[] =>
  Array.from({ length: count }, () => stream.next());

describe('fnv1a', () => {
  it('is deterministic and label-sensitive', () => {
    expect(fnv1a('map')).toBe(fnv1a('map'));
    expect(fnv1a('map')).not.toBe(fnv1a('dice'));
    expect(fnv1a('')).toBe(0x811c9dc5);
  });
});

describe('deriveSeed', () => {
  it('depends on both root and label', () => {
    expect(deriveSeed(42, 'map')).toBe(deriveSeed(42, 'map'));
    expect(deriveSeed(42, 'map')).not.toBe(deriveSeed(43, 'map'));
    expect(deriveSeed(42, 'map')).not.toBe(deriveSeed(42, 'dice'));
  });
});

describe('createStreams', () => {
  it('same seed reproduces the same 100 values per stream', () => {
    const a = createStreams(42);
    const b = createStreams(42);
    for (const label of LABELS) {
      expect(draw(a[label], 100)).toEqual(draw(b[label], 100));
    }
  });

  it('seed 42 first 20 values per stream match the pinned snapshot', () => {
    const streams = createStreams(42);
    const perStream = Object.fromEntries(
      LABELS.map((label) => [label, draw(streams[label], 20)]),
    );
    expect(perStream).toMatchSnapshot();
  });

  it('different stream labels diverge', () => {
    const streams = createStreams(42);
    const sequences = LABELS.map((label) => draw(streams[label], 10).join(','));
    expect(new Set(sequences).size).toBe(LABELS.length);
  });

  it('streams are independent — consuming one does not shift another', () => {
    const consumed = createStreams(42);
    const fresh = createStreams(42);
    draw(consumed.map, 50);
    expect(draw(consumed.dice, 20)).toEqual(draw(fresh.dice, 20));
  });

  it('different root seeds diverge', () => {
    const a = createStreams(1);
    const b = createStreams(2);
    expect(draw(a.map, 10)).not.toEqual(draw(b.map, 10));
  });
});

describe('RngStream', () => {
  it('next stays in [0, 1)', () => {
    const stream = createStream(7);
    for (const value of draw(stream, 1000)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('int bounds are inclusive', () => {
    const stream = createStream(7);
    const values = Array.from({ length: 2000 }, () => stream.int(1, 3));
    expect(Math.min(...values)).toBe(1);
    expect(Math.max(...values)).toBe(3);
    expect(new Set(values)).toEqual(new Set([1, 2, 3]));
  });

  it('int handles a single-value range', () => {
    const stream = createStream(7);
    expect(stream.int(5, 5)).toBe(5);
  });

  it('pick returns elements from the array and throws on empty', () => {
    const stream = createStream(7);
    const arr = ['a', 'b', 'c'];
    for (let i = 0; i < 100; i += 1) {
      expect(arr).toContain(stream.pick(arr));
    }
    expect(() => stream.pick([])).toThrow();
  });

  it('weighted respects zero weights and throws on empty', () => {
    const stream = createStream(7);
    for (let i = 0; i < 100; i += 1) {
      expect(
        stream.weighted([
          ['a', 1],
          ['b', 0],
        ]),
      ).toBe('a');
    }
    expect(() => stream.weighted([])).toThrow();
    expect(() => stream.weighted([['a', 0]])).toThrow();
  });

  it('shuffle returns a permuted copy with the same members', () => {
    const stream = createStream(7);
    const arr = [1, 2, 3, 4, 5, 6, 7, 8];
    const shuffled = stream.shuffle(arr);
    expect(shuffled).not.toBe(arr);
    expect(arr).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect([...shuffled].sort((x, y) => x - y)).toEqual(arr);
  });
});
