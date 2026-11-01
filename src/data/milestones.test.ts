import { describe, expect, it } from "vitest";
import {
  BASE_HANGAR_BUDGET,
  bonusChartPoints,
  hangarBudget,
  MAX_HANGAR_BUDGET,
  MILESTONES,
  milestoneCard,
  milestonesAt,
  milestonesBetween,
  milestonesReached,
  RESET_DISCOUNT_LEVEL,
  RESET_DISCOUNT_PCT,
} from "@/data/milestones";
import { UNLOCK_BY_ID } from "@/data/unlocks";
import { levelUpPoints, pointsTotal } from "@/game/chart/engine";

describe("milestones", () => {
  it("hangar budget rises +2 at 5/25/45 from 10 to 16", () => {
    expect(hangarBudget(1)).toBe(BASE_HANGAR_BUDGET);
    expect(hangarBudget(4)).toBe(10);
    expect(hangarBudget(5)).toBe(12);
    expect(hangarBudget(24)).toBe(12);
    expect(hangarBudget(25)).toBe(14);
    expect(hangarBudget(45)).toBe(16);
    expect(hangarBudget(50)).toBe(16);
  });

  it("a negative hub delta bites, because the card says it does", () => {
    expect(hangarBudget(1, -2)).toBe(BASE_HANGAR_BUDGET - 2);
    expect(hangarBudget(45, -2)).toBe(14);
    expect(hangarBudget(45, 1)).toBe(MAX_HANGAR_BUDGET);
    expect(hangarBudget(1, -99)).toBe(1);
  });

  it("hub budget notable cannot push past the cap", () => {
    expect(hangarBudget(45, 1)).toBe(MAX_HANGAR_BUDGET);
    expect(hangarBudget(24, 1)).toBe(13);
  });

  it("L10 unlocks Ram, L25 unlocks Ark + budget", () => {
    expect(milestonesReached(10).some((m) => m.kind === "shipRam")).toBe(true);
    expect(milestonesReached(9).some((m) => m.kind === "shipRam")).toBe(false);
    const at25 = milestonesAt(25).map((m) => m.kind);
    expect(at25).toContain("shipArk");
    expect(at25).toContain("budget");
  });

  it("hands out chart points at ten, twenty, thirty-five and fifty", () => {
    expect(bonusChartPoints(9)).toBe(0);
    expect(bonusChartPoints(10)).toBe(2);
    expect(bonusChartPoints(19)).toBe(2);
    expect(bonusChartPoints(20)).toBe(5);
    expect(bonusChartPoints(34)).toBe(5);
    expect(bonusChartPoints(35)).toBe(9);
    expect(bonusChartPoints(49)).toBe(9);
    expect(bonusChartPoints(50)).toBe(15);
  });

  it("never announces a reward that does not exist", () => {
    for (const milestone of MILESTONES) {
      const payload =
        (milestone.budget ?? 0) > 0 || (milestone.chartPoints ?? 0) > 0;
      const unlock =
        milestone.unlockId !== undefined &&
        UNLOCK_BY_ID.has(milestone.unlockId);
      expect(
        payload || unlock,
        `milestone at L${String(milestone.level)} (${milestone.kind})`,
      ).toBe(true);
    }
  });

  it("backs the L50 card with the half-price reset and a real prestige skin", () => {
    const card = MILESTONES.find((m) => m.kind === "respecPrestige");
    expect(card?.level).toBe(RESET_DISCOUNT_LEVEL);
    expect(RESET_DISCOUNT_PCT).toBe(50);
    const unlock =
      card?.unlockId === undefined ? undefined : UNLOCK_BY_ID.get(card.unlockId);
    expect(unlock?.kind).toBe("cosmetic");
    expect(unlock?.source.level).toBe(card?.level);
  });

  it("prints each chart-point milestone's own amount on its card", () => {
    for (const milestone of MILESTONES) {
      const card = milestoneCard(milestone);
      expect(card.key).toBe(`meta:milestone.${milestone.kind}`);
      expect(card.values?.n).toBe(milestone.chartPoints);
    }
  });

  it("adds the badge and the cards up to the points the chart grants", () => {
    const jumps: readonly (readonly [number, number])[] = [
      [1, 2],
      [9, 10],
      [19, 20],
      [34, 35],
      [49, 50],
      [8, 11],
      [1, 50],
    ];
    for (const [from, to] of jumps) {
      const carded = milestonesBetween(from, to)
        .map(milestoneCard)
        .reduce((sum, card) => sum + (card.values?.n ?? 0), 0);
      expect(
        levelUpPoints(from, to) + carded,
        `L${String(from)} to L${String(to)}`,
      ).toBe(pointsTotal(to) - pointsTotal(from));
    }
  });

  it("reports only the milestones a level-up crossed", () => {
    expect(milestonesBetween(4, 5).map((m) => m.kind)).toEqual(["budget"]);
    expect(milestonesBetween(5, 5)).toHaveLength(0);
    expect(milestonesBetween(24, 25).map((m) => m.kind)).toEqual([
      "budget",
      "shipArk",
    ]);
  });
});
