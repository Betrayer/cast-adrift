import { describe, expect, it } from "vitest";
import { deckPoints, diePoints } from "@/data/metaShop";
import { validateDeck } from "@/game/meta/deck";

describe("deck point math", () => {
  it("uses DIE_PTS with prismatic +1", () => {
    expect(diePoints("red-d6")).toBe(2);
    expect(diePoints("grey-d4")).toBe(1);
    expect(diePoints("slug")).toBe(3);
    expect(diePoints("coreshard")).toBe(5);
    expect(deckPoints(["red-d6", "coreshard"])).toBe(7);
  });
});

describe("deck validation", () => {
  const budget = 10;

  it("accepts a legal starter deck", () => {
    const v = validateDeck(
      ["red-d6", "red-d6", "blue-d6", "grey-d4", "green-d4"],
      budget,
    );
    expect(v.valid).toBe(true);
    expect(v.pts).toBe(8);
  });

  it("rejects over-budget decks", () => {
    const v = validateDeck(
      ["coreshard", "coreshard", "coreshard"],
      budget,
    );
    expect(v.over).toBe(true);
    expect(v.valid).toBe(false);
  });

  it("rejects fewer than 3 dice", () => {
    const v = validateDeck(["red-d6", "blue-d6"], budget);
    expect(v.underMin).toBe(true);
    expect(v.valid).toBe(false);
  });

  it("rejects more than 9 dice", () => {
    const v = validateDeck(Array.from({ length: 10 }, () => "grey-d4"), budget);
    expect(v.overCap).toBe(true);
    expect(v.valid).toBe(false);
  });
});
