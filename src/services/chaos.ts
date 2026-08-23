import { mulberry32 } from "@/services/rng";

export interface ChaosSource {
  int: (min: number, max: number) => number;
  pick: <T>(arr: readonly T[]) => T;
}

const DRIFT = 0x6d2b79f5;

let drift = 0x9e3779b1;
let override: ChaosSource | null = null;

const entropy = (): number => {
  drift = (drift + DRIFT) | 0;
  const wall = Date.now() >>> 0;
  const fine = Math.floor(performance.now() * 1000) >>> 0;
  return (wall ^ fine ^ drift) >>> 0;
};

const liveNext = (): number => mulberry32(entropy())();

const liveInt = (min: number, max: number): number =>
  min + Math.floor(liveNext() * (max - min + 1));

const livePick = <T>(arr: readonly T[]): T => {
  if (arr.length === 0) throw new Error("chaos.pick: empty array");
  return arr[liveInt(0, arr.length - 1)] as T;
};

export const chaos: ChaosSource = {
  int: (min, max) =>
    override === null ? liveInt(min, max) : override.int(min, max),
  pick: (arr) => (override === null ? livePick(arr) : override.pick(arr)),
};

export interface ChaosScript {
  ints?: readonly number[];
  picks?: readonly number[];
}

export const scriptedChaos = (script: ChaosScript): ChaosSource => {
  const ints = [...(script.ints ?? [])];
  const picks = [...(script.picks ?? [])];
  let intAt = 0;
  let pickAt = 0;
  return {
    int: (min, max) => {
      const value = ints[intAt] ?? min;
      intAt += 1;
      return Math.max(min, Math.min(max, value));
    },
    pick: <T,>(arr: readonly T[]): T => {
      if (arr.length === 0) throw new Error("chaos.pick: empty array");
      const index = picks[pickAt] ?? 0;
      pickAt += 1;
      return arr[
        ((index % arr.length) + arr.length) % arr.length
      ] as T;
    },
  };
};

export const setChaosSource = (source: ChaosSource | null): void => {
  override = source;
};

export const chaosMocked = (): boolean => override !== null;
