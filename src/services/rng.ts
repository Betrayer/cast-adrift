export interface RngStream {
  next: () => number;
  int: (min: number, max: number) => number;
  pick: <T>(arr: readonly T[]) => T;
  weighted: <T>(entries: readonly (readonly [T, number])[]) => T;
  shuffle: <T>(arr: readonly T[]) => T[];
}

export type StreamLabel = 'map' | 'dice' | 'loot' | 'events' | 'shop' | 'fate';

export type RngStreams = Record<StreamLabel, RngStream>;

const STREAM_LABELS: readonly StreamLabel[] = [
  'map',
  'dice',
  'loot',
  'events',
  'shop',
  'fate',
];

export const fnv1a = (str: string): number => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

export const mulberry32 = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const deriveSeed = (root: number, label: string): number => {
  const step = mulberry32((fnv1a(label) ^ root) >>> 0);
  return Math.floor(step() * 4294967296) >>> 0;
};

export const createStream = (seed: number): RngStream => {
  const next = mulberry32(seed);

  const int = (min: number, max: number): number =>
    min + Math.floor(next() * (max - min + 1));

  const pick = <T>(arr: readonly T[]): T => {
    if (arr.length === 0) throw new Error('rng.pick: empty array');
    return arr[int(0, arr.length - 1)] as T;
  };

  const weighted = <T>(entries: readonly (readonly [T, number])[]): T => {
    const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
    if (entries.length === 0 || total <= 0) {
      throw new Error('rng.weighted: no entries with positive weight');
    }
    let roll = next() * total;
    for (const [value, weight] of entries) {
      roll -= weight;
      if (roll < 0) return value;
    }
    return entries[entries.length - 1]?.[0] as T;
  };

  const shuffle = <T>(arr: readonly T[]): T[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = int(0, i);
      const a = copy[i] as T;
      copy[i] = copy[j] as T;
      copy[j] = a;
    }
    return copy;
  };

  return { next, int, pick, weighted, shuffle };
};

export const createStreams = (rootSeed: number): RngStreams => {
  const streams = {} as RngStreams;
  for (const label of STREAM_LABELS) {
    streams[label] = createStream(deriveSeed(rootSeed, label));
  }
  return streams;
};
