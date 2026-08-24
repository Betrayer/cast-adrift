import { describe, expect, it } from "vitest";
import { harnessEnemy, harnessSnap } from "@/game/battle/battleHarness";
import { resolveEnemyPhase } from "@/game/battle/resolver";
import { spawnEnemy } from "@/game/battle/setup";
import { scaleEnemyHp, sectorHpPct } from "@/game/run/encounter";
import { createStream } from "@/services/rng";

describe("interference tide", () => {
  it("scales enemy hp by +10% per level (rounded)", () => {
    expect(scaleEnemyHp(32, { tide: 0 })).toBe(32);
    expect(scaleEnemyHp(32, { tide: 2 })).toBe(38);
    expect(scaleEnemyHp(32, { tide: 3 })).toBe(42);
  });

  it("multiplies the sector curve with the tide instead of adding it", () => {
    const pct = sectorHpPct({ sector: 5 });
    expect(scaleEnemyHp(20, { tide: 0, sectorHpPct: pct })).toBe(
      Math.round(20 * (1 + pct / 100)),
    );
    expect(
      scaleEnemyHp(20, { tide: 3, sectorHpPct: pct, hpBonusPct: 20 }),
    ).toBe(Math.round(20 * 1.3 * (1 + pct / 100) * 1.2));
    expect(
      scaleEnemyHp(20, { tide: 3, sectorHpPct: pct, hpBonusPct: 20 }),
    ).toBeGreaterThan(
      Math.round(20 * (1 + (30 + pct + 20) / 100)),
    );
  });

  it("spawns enemies with tide-scaled hp", () => {
    const base = spawnEnemy("raider", "e", createStream(1), { tide: 0 }).hp;
    const scaled = spawnEnemy("raider", "e", createStream(1), { tide: 3 }).hp;
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
        evasion: null,
        enemies: [harnessEnemy({ nextIntent: { t: "attack", n: 5 } })],
      });
      return resolveEnemyPhase(snap, createStream(9)).next.hull;
    };
    expect(40 - attackAt(0)).toBe(5);
    expect(40 - attackAt(2)).toBe(7);
    expect(40 - attackAt(3)).toBe(8);
  });
});
