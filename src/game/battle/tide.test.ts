import { describe, expect, it } from "vitest";
import { harnessEnemy, harnessSnap } from "@/game/battle/battleHarness";
import { resolveEnemyPhase } from "@/game/battle/resolver";
import { spawnEnemy } from "@/game/battle/setup";
import { scaleHpForTide } from "@/game/run/encounter";
import { createStream } from "@/services/rng";

describe("interference tide", () => {
  it("scales enemy hp by +10% per level (rounded)", () => {
    expect(scaleHpForTide(32, 0)).toBe(32);
    expect(scaleHpForTide(32, 2)).toBe(38);
    expect(scaleHpForTide(32, 3)).toBe(42);
  });

  it("spawns enemies with tide-scaled hp", () => {
    const base = spawnEnemy("raider", "e", createStream(1), 0).hp;
    const scaled = spawnEnemy("raider", "e", createStream(1), 3).hp;
    expect(base).toBe(32);
    expect(scaled).toBe(42);
    expect(scaled).toBeGreaterThan(base);
  });

  it("adds +tide flat damage per hit", () => {
    const attackAt = (tide: number): number => {
      const snap = harnessSnap([], {
        tide,
        hull: 40,
        hullMax: 40,
        shield: 0,
        engineState: null,
        enemies: [harnessEnemy({ nextIntent: { t: "attack", n: 5 } })],
      });
      return resolveEnemyPhase(snap, createStream(9)).next.hull;
    };
    expect(40 - attackAt(0)).toBe(5);
    expect(40 - attackAt(2)).toBe(7);
    expect(40 - attackAt(3)).toBe(8);
  });
});
