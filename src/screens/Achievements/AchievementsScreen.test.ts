import { describe, expect, it } from "vitest";
import { ACHIEVEMENT_ROWS } from "@/data/achievements";
import { rowIsFresh } from "./AchievementsScreen";

const familyRow = ACHIEVEMENT_ROWS.find((row) => row.kind === "family");
const singleRow = ACHIEVEMENT_ROWS.find((row) => row.kind === "single");

describe("fresh achievement rows", () => {
  it("marks a family row fresh when any of its tiers is unseen", () => {
    expect(familyRow?.kind).toBe("family");
    if (familyRow?.kind !== "family") return;
    const top = familyRow.tiers[familyRow.tiers.length - 1];
    expect(top).toBeDefined();
    if (top === undefined) return;
    expect(rowIsFresh(familyRow, new Set([top.id]))).toBe(true);
    expect(rowIsFresh(familyRow, new Set([familyRow.id]))).toBe(false);
    expect(rowIsFresh(familyRow, new Set())).toBe(false);
  });

  it("marks a single row fresh by its own id", () => {
    expect(singleRow?.kind).toBe("single");
    if (singleRow?.kind !== "single") return;
    expect(rowIsFresh(singleRow, new Set([singleRow.def.id]))).toBe(true);
    expect(rowIsFresh(singleRow, new Set(["someoneElse"]))).toBe(false);
  });

  it("never lets one family's tiers light another row", () => {
    expect(familyRow?.kind).toBe("family");
    if (familyRow?.kind !== "family") return;
    const tierIds = new Set(familyRow.tiers.map((tier) => tier.id));
    const others = ACHIEVEMENT_ROWS.filter(
      (row) => row !== familyRow && rowIsFresh(row, tierIds),
    );
    expect(others).toEqual([]);
  });
});
