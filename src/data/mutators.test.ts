import { describe, expect, it } from "vitest";
import {
  computeMutatorMods,
  DAILY_MUTATOR_COUNT,
  MUTATORS,
  MUTATOR_BY_ID,
  pickDailyMutators,
  ZERO_MUTATOR_MODS,
} from "@/data/mutators";
import { dailyMutators, dailySeed } from "@/game/run/modes";

describe("mutators", () => {
  it("ships the twelve DESIGN §13 mutators with unique ids", () => {
    expect(MUTATORS).toHaveLength(12);
    expect(new Set(MUTATORS.map((m) => m.id)).size).toBe(12);
  });

  it("returns zero mods for no mutators and ignores unknown ids", () => {
    expect(computeMutatorMods([])).toEqual(ZERO_MUTATOR_MODS);
    expect(computeMutatorMods(["nope"])).toEqual(ZERO_MUTATOR_MODS);
  });

  it("adds numeric mods and ORs boolean ones", () => {
    const mods = computeMutatorMods(["richVein", "fatLoot", "wilds"]);
    expect(mods.scrapMultPct).toBe(50);
    expect(mods.enemyHpPct).toBe(15);
    expect(mods.lootRarityStep).toBe(1);
    expect(mods.noShops).toBe(true);
    expect(mods.barksOff).toBe(false);
  });

  it("clamps stacked shield decay to 100%", () => {
    const mods = computeMutatorMods([
      "brittleShields",
      "brittleShields",
      "brittleShields",
    ]);
    expect(mods.shieldDecayPct).toBe(100);
  });

  it("holds the exact knobs DESIGN §13 asks each mutator for", () => {
    expect(MUTATOR_BY_ID.get("overheat")?.mods.chargeCapDelta).toBe(-2);
    expect(MUTATOR_BY_ID.get("heavyDice")?.mods.nudgeCostDelta).toBe(2);
    expect(MUTATOR_BY_ID.get("risingTide")?.mods.jumpsPerTideDelta).toBe(-1);
    expect(MUTATOR_BY_ID.get("glassFleet")?.mods.damageMultPct).toBe(50);
    expect(MUTATOR_BY_ID.get("resonantStorm")?.mods.resonanceBonus).toBe(2);
    expect(MUTATOR_BY_ID.get("fog")?.mods.fogRowDelta).toBe(-1);
    expect(MUTATOR_BY_ID.get("radioSilence")?.mods.sensorsTierDelta).toBe(-1);
    expect(MUTATOR_BY_ID.get("radioSilence")?.mods.barksOff).toBe(true);
    expect(MUTATOR_BY_ID.get("doubles")?.mods.enemyCopies).toBe(1);
    expect(MUTATOR_BY_ID.get("doubles")?.mods.copyHpPct).toBe(-30);
  });

  it("picks two distinct mutators", () => {
    let call = 0;
    const chosen = pickDailyMutators(() => {
      call += 1;
      return 0;
    });
    expect(chosen).toHaveLength(DAILY_MUTATOR_COUNT);
    expect(new Set(chosen).size).toBe(DAILY_MUTATOR_COUNT);
    expect(call).toBe(DAILY_MUTATOR_COUNT);
  });
});

describe("daily seed", () => {
  it("derives the same seed and mutators for a given UTC date", () => {
    expect(dailySeed("2026-07-27")).toBe(dailySeed("2026-07-27"));
    expect(dailyMutators("2026-07-27")).toEqual(dailyMutators("2026-07-27"));
  });

  it("gives different days different seeds", () => {
    expect(dailySeed("2026-07-27")).not.toBe(dailySeed("2026-07-28"));
  });

  it("always draws two distinct, real mutators", () => {
    for (let day = 1; day <= 28; day += 1) {
      const date = `2026-03-${String(day).padStart(2, "0")}`;
      const picked = dailyMutators(date);
      expect(picked).toHaveLength(2);
      expect(new Set(picked).size).toBe(2);
      for (const id of picked) expect(MUTATOR_BY_ID.has(id)).toBe(true);
    }
  });
});
