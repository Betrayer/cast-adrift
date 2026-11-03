import { describe, expect, it } from "vitest";
import { harnessDie } from "@/game/battle/battleHarness";
import { applySpareLowest, rerollFace } from "@/game/battle/rollFloors";
import { createStream } from "@/services/rng";
import type { RolledDie } from "@/types/battle";

const rerolls = (die: RolledDie, count: number): Set<number> => {
  const rng = createStream(4242);
  const seen = new Set<number>();
  for (let i = 0; i < count; i += 1) seen.add(rerollFace(die, rng));
  return seen;
};

describe("rerollFace", () => {
  it("rerolls a custom-face die onto its own faces only", () => {
    expect([...rerolls(harnessDie("o", "obsidian", 1), 400)].sort((a, b) => a - b)).toEqual([1, 8]);
  });

  it("rerolls a forged die onto the faces the forge gave it", () => {
    const forged: RolledDie = { ...harnessDie("f", "red-d6", 1), faces: [2, 2, 5, 5, 6, 6] };
    expect([...rerolls(forged, 400)].sort((a, b) => a - b)).toEqual([2, 5, 6]);
  });

  it("rerolls a plain die across 1..tier", () => {
    expect([...rerolls(harnessDie("p", "red-d6", 1), 400)].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("adds growth on top of the face it lands", () => {
    const grown: RolledDie = { ...harnessDie("g", "obsidian", 1), growth: 2 };
    expect([...rerolls(grown, 400)].sort((a, b) => a - b)).toEqual([3, 10]);
  });
});

describe("applySpareLowest", () => {
  it("bumps the lowest tray die by one", () => {
    const dice = [harnessDie("a", "ember", 5), harnessDie("b", "grey-d4", 2)];
    applySpareLowest(dice);
    expect(dice[1]?.value).toBe(3);
  });

  it("bumps a grown die above its tier instead of shearing the growth off", () => {
    const grown: RolledDie = { ...harnessDie("g", "evergreen", 13), growth: 3 };
    applySpareLowest([grown]);
    expect(grown.value).toBe(14);
  });

  it("still stops at the ceiling the growth sets", () => {
    const grown: RolledDie = { ...harnessDie("g", "evergreen", 15), growth: 3 };
    applySpareLowest([grown]);
    expect(grown.value).toBe(15);
  });
});
