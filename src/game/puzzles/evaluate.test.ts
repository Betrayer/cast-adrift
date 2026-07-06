import { describe, expect, it } from "vitest";
import { PUZZLES } from "@/data/puzzles";
import {
  difficultyReport,
  goalSatisfied,
  isAchievable,
  isTrivial,
  scorePlacement,
} from "@/game/puzzles/evaluate";

describe("trial solvability", () => {
  it.each(PUZZLES.map((p) => [p.id, p] as const))(
    "%s can be solved on a ceiling roll",
    (_id, puzzle) => {
      expect(isAchievable(puzzle)).toBe(true);
    },
  );

  it.each(PUZZLES.map((p) => [p.id, p] as const))(
    "%s is never a free win on a floor roll",
    (_id, puzzle) => {
      expect(isTrivial(puzzle)).toBe(false);
    },
  );

  it("targets sit above the floor and within reach of the ceiling", () => {
    for (const puzzle of PUZZLES) {
      if (puzzle.goal.g === "survive") continue;
      const r = difficultyReport(puzzle);
      expect(r.target).toBeGreaterThan(r.floor);
      expect(r.target).toBeLessThanOrEqual(r.ceil);
    }
  });

  it("scores nothing for an empty placement on a damage trial", () => {
    const redline = PUZZLES.find((p) => p.id === "redline");
    expect(redline).toBeDefined();
    if (redline !== undefined) {
      const score = scorePlacement(redline, [8, 6, 6, 4], {});
      expect(score.damage).toBe(0);
      expect(goalSatisfied(redline.goal, score)).toBe(false);
    }
  });
});
