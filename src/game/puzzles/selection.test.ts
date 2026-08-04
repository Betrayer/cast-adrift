import { describe, expect, it } from "vitest";
import { PUZZLES, PUZZLE_TIERS, type PuzzleTier } from "@/data/puzzles";
import { generateSectorMap } from "@/game/map/generator";
import {
  pickPuzzle,
  pickTier,
  puzzlesAtTier,
  tierForNode,
  tierWeights,
} from "@/game/puzzles/selection";
import { createStream } from "@/services/rng";

const SECTOR_WINDOWS: Record<number, readonly [number, number]> = {
  1: [1, 2],
  2: [1, 3],
  3: [2, 4],
  4: [2, 4],
  5: [3, 5],
};

describe("tier windows", () => {
  it("weighs the middle of a window double its edges", () => {
    expect(tierWeights([2, 4])).toEqual([
      [2, 1],
      [3, 2],
      [4, 1],
    ]);
    expect(tierWeights([1, 2])).toEqual([
      [1, 1],
      [2, 1],
    ]);
  });

  it("refuses a window that is not a tier range", () => {
    expect(() => tierWeights([4, 2])).toThrow();
    expect(() => tierWeights([0, 3])).toThrow();
    expect(() => tierWeights([3, 6])).toThrow();
  });

  it("draws 1000 tiers in the declared proportions and never outside the window", () => {
    const stream = createStream(4242);
    const counts = new Map<PuzzleTier, number>();
    for (let i = 0; i < 1000; i += 1) {
      const tier = pickTier([2, 4], stream);
      counts.set(tier, (counts.get(tier) ?? 0) + 1);
    }
    expect(counts.get(1)).toBeUndefined();
    expect(counts.get(5)).toBeUndefined();
    const t3 = counts.get(3) ?? 0;
    expect(t3).toBeGreaterThan(counts.get(2) ?? 0);
    expect(t3).toBeGreaterThan(counts.get(4) ?? 0);
    expect(t3 / 1000).toBeGreaterThan(0.42);
    expect(t3 / 1000).toBeLessThan(0.58);
  });
});

describe("puzzle draw", () => {
  const anyTier = (): PuzzleTier => {
    const tier = PUZZLE_TIERS.find((t) => puzzlesAtTier(t).length >= 2);
    if (tier === undefined) throw new Error("no tier has two puzzles");
    return tier;
  };

  it("throws rather than reaching outside the tier for a puzzle", () => {
    const empty = PUZZLE_TIERS.find((t) => puzzlesAtTier(t).length === 0);
    if (empty === undefined) {
      expect(PUZZLE_TIERS.every((t) => puzzlesAtTier(t).length > 0)).toBe(true);
      return;
    }
    expect(() => pickPuzzle(empty, [], [], createStream(1))).toThrow();
  });

  it("stays inside its tier over many draws", () => {
    const tier = anyTier();
    const stream = createStream(9);
    for (let i = 0; i < 200; i += 1) {
      expect(pickPuzzle(tier, [], [], stream).tier).toBe(tier);
    }
  });

  it("prefers a puzzle the player has never seen", () => {
    const tier = anyTier();
    const pool = puzzlesAtTier(tier);
    const seen = pool.slice(0, pool.length - 1).map((p) => p.id);
    const fresh = pool[pool.length - 1];
    expect(fresh).toBeDefined();
    const stream = createStream(3);
    for (let i = 0; i < 50; i += 1) {
      expect(pickPuzzle(tier, [], seen, stream).id).toBe(fresh?.id);
    }
  });

  it("falls back inside the tier when every puzzle in it is solved", () => {
    const tier = anyTier();
    const solved = puzzlesAtTier(tier).map((p) => p.id);
    const drawn = pickPuzzle(tier, solved, solved, createStream(5));
    expect(drawn.tier).toBe(tier);
    expect(PUZZLES.map((p) => p.id)).toContain(drawn.id);
  });

  it("never repeats inside a run while the tier still has fresh entries", () => {
    const tier = anyTier();
    const pool = puzzlesAtTier(tier);
    const stream = createStream(77);
    const drawnIds: string[] = [];
    for (let i = 0; i < pool.length; i += 1) {
      drawnIds.push(pickPuzzle(tier, drawnIds, [], stream).id);
    }
    expect(new Set(drawnIds).size).toBe(pool.length);
  });
});

describe("map nodes carry the window the tier is drawn from", () => {
  it.each([1, 2, 3, 4, 5])(
    "sector %i anomalies draw inside their declared window",
    (sector) => {
      const window = SECTOR_WINDOWS[sector];
      expect(window).toBeDefined();
      if (window === undefined) return;
      for (let seed = 1; seed <= 12; seed += 1) {
        const map = generateSectorMap(createStream(seed), sector);
        for (const node of map.nodes) {
          if (node.type !== "anomaly") continue;
          const tier = tierForNode(seed, node);
          expect(tier).not.toBeNull();
          if (tier === null) continue;
          const bump = node.pocket === true ? 1 : 0;
          expect(tier).toBeGreaterThanOrEqual(Math.min(5, window[0] + bump));
          expect(tier).toBeLessThanOrEqual(Math.min(5, window[1] + bump));
        }
      }
    },
  );

  it("gives the same node the same tier every time it is asked", () => {
    const map = generateSectorMap(createStream(31), 3);
    const anomaly = map.nodes.find((n) => n.type === "anomaly");
    expect(anomaly).toBeDefined();
    if (anomaly === undefined) return;
    expect(tierForNode(31, anomaly)).toBe(tierForNode(31, anomaly));
  });

  it("reads no tier off a node that is not an anomaly", () => {
    const map = generateSectorMap(createStream(31), 3);
    const battle = map.nodes.find((n) => n.type === "battle");
    expect(battle).toBeDefined();
    if (battle === undefined) return;
    expect(tierForNode(31, battle)).toBeNull();
  });
});
