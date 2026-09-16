import { describe, expect, it } from "vitest";
import { harnessDie } from "@/game/battle/battleHarness";
import { applySpareLowest } from "@/game/battle/rollFloors";
import type { RolledDie } from "@/types/battle";

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
