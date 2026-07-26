import { describe, expect, it } from "vitest";
import {
  BASE_HANGAR_BUDGET,
  hangarBudget,
  MAX_HANGAR_BUDGET,
  milestonesAt,
  milestonesReached,
} from "@/data/milestones";

describe("milestones", () => {
  it("hangar budget rises +1 at 5/15/25/35/45 from 10 to 15", () => {
    expect(hangarBudget(1)).toBe(BASE_HANGAR_BUDGET);
    expect(hangarBudget(4)).toBe(10);
    expect(hangarBudget(5)).toBe(11);
    expect(hangarBudget(15)).toBe(12);
    expect(hangarBudget(25)).toBe(13);
    expect(hangarBudget(45)).toBe(15);
    expect(hangarBudget(50)).toBe(15);
  });

  it("hub budget notable adds +1, capped at 16", () => {
    expect(hangarBudget(45, 1)).toBe(16);
    expect(hangarBudget(50, 5)).toBe(MAX_HANGAR_BUDGET);
  });

  it("L10 unlocks Ram, L25 unlocks Ark + budget", () => {
    expect(milestonesReached(10).some((m) => m.kind === "shipRam")).toBe(true);
    expect(milestonesReached(9).some((m) => m.kind === "shipRam")).toBe(false);
    const at25 = milestonesAt(25).map((m) => m.kind);
    expect(at25).toContain("shipArk");
    expect(at25).toContain("budget");
  });
});
