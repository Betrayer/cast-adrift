import { describe, expect, it } from "vitest";
import { axisLabel, battleEndAxisDelta, countDeckSchool } from "@/game/run/axis";
import type { DieInstance } from "@/stores/runStore";

describe("battleEndAxisDelta", () => {
  it("leans to resonance when black dominates and the deck qualifies", () => {
    expect(battleEndAxisDelta(3, 1, 2, 0)).toBe(-1);
  });

  it("leans to stability when blue dominates and the deck qualifies", () => {
    expect(battleEndAxisDelta(1, 3, 0, 2)).toBe(1);
  });

  it("does not move without at least two of the leaning school in the deck", () => {
    expect(battleEndAxisDelta(3, 0, 1, 0)).toBe(0);
    expect(battleEndAxisDelta(0, 3, 0, 1)).toBe(0);
  });

  it("does not move when no dice of the school were used", () => {
    expect(battleEndAxisDelta(0, 0, 4, 4)).toBe(0);
  });

  it("cancels on a genuine tie with both decks qualifying", () => {
    expect(battleEndAxisDelta(2, 2, 3, 3)).toBe(0);
  });

  it("caps at a single step per battle", () => {
    expect(Math.abs(battleEndAxisDelta(9, 0, 5, 0))).toBe(1);
  });
});

describe("countDeckSchool", () => {
  it("counts dice of a school by their definition", () => {
    const deck: DieInstance[] = [
      { uid: "1", defId: "black-d6" },
      { uid: "2", defId: "obsidian" },
      { uid: "3", defId: "blue-d6" },
    ];
    expect(countDeckSchool(deck, "black")).toBe(2);
    expect(countDeckSchool(deck, "blue")).toBe(1);
  });
});

describe("axisLabel", () => {
  it("maps sign to axis pole", () => {
    expect(axisLabel(-4)).toBe("resonance");
    expect(axisLabel(6)).toBe("stability");
    expect(axisLabel(0)).toBe("neutral");
  });
});
