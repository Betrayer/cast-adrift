import { describe, expect, it } from "vitest";
import {
  levelFromTotalXp,
  MAX_LEVEL,
  progressWithinLevel,
  campaignShards,
  runXp,
  totalXpForLevel,
  xpToNext,
} from "@/game/xp";

describe("xp curve", () => {
  it("xpToNext follows 25 + 6l", () => {
    expect(xpToNext(1)).toBe(31);
    expect(xpToNext(10)).toBe(85);
    expect(xpToNext(49)).toBe(319);
  });

  it("total XP to reach L50 is 8575", () => {
    const summed = Array.from({ length: MAX_LEVEL - 1 }, (_, i) =>
      xpToNext(i + 1),
    ).reduce((a, b) => a + b, 0);
    expect(totalXpForLevel(MAX_LEVEL)).toBe(8575);
    expect(summed).toBe(8575);
  });

  it("levelFromTotalXp is monotonic and inverts totalXpForLevel", () => {
    expect(levelFromTotalXp(0)).toBe(1);
    for (let level = 1; level <= MAX_LEVEL; level += 1) {
      expect(levelFromTotalXp(totalXpForLevel(level))).toBe(level);
      if (level < MAX_LEVEL) {
        expect(levelFromTotalXp(totalXpForLevel(level + 1) - 1)).toBe(level);
      }
    }
  });

  it("caps at MAX_LEVEL", () => {
    expect(levelFromTotalXp(1_000_000)).toBe(MAX_LEVEL);
    expect(progressWithinLevel(1_000_000)).toEqual({
      level: MAX_LEVEL,
      into: 0,
      need: 0,
      pct: 1,
    });
  });

  it("progressWithinLevel reports position inside a level", () => {
    const base = totalXpForLevel(3);
    const p = progressWithinLevel(base + 10);
    expect(p.level).toBe(3);
    expect(p.into).toBe(10);
    expect(p.need).toBe(xpToNext(3));
    expect(p.pct).toBeCloseTo(10 / xpToNext(3));
  });
});

describe("run rewards", () => {
  it("a mixed full-campaign run yields 250-350 XP (L50 in ~25-35 runs)", () => {
    const counts = {
      nodes: 50,
      elites: 10,
      minibosses: 4,
      bosses: 4,
      contractStars: 0,
    };
    const xp = runXp(counts);
    expect(xp).toBeGreaterThanOrEqual(250);
    expect(xp).toBeLessThanOrEqual(350);
    const runsToMax = totalXpForLevel(MAX_LEVEL) / xp;
    expect(runsToMax).toBeGreaterThanOrEqual(25);
    expect(runsToMax).toBeLessThanOrEqual(35);
  });

  it("ascension multiplies XP by 1 + 0.1A", () => {
    const counts = {
      nodes: 10,
      elites: 0,
      minibosses: 0,
      bosses: 0,
      contractStars: 0,
    };
    expect(runXp(counts, 0)).toBe(20);
    expect(runXp(counts, 5)).toBe(30);
  });

  it("campaign shards follow the DESIGN 12.3 sector table", () => {
    expect(campaignShards(0)).toBe(0);
    expect(campaignShards(1)).toBe(40);
    expect(campaignShards(3)).toBe(170);
    expect(campaignShards(5)).toBe(410);
    expect(campaignShards(9)).toBe(410);
  });
});
