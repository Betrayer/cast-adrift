import { describe, expect, it } from "vitest";
import { PUZZLES, type PuzzleDef } from "@/data/puzzles";
import {
  CALIBRATION_SPACE_CAP,
  boardSpace,
  boardSpaceSize,
  calibrationIssues,
  tierForSearch,
  tierForShare,
  winsSequence,
} from "@/game/puzzles/difficulty";
import { enumeratePlacements } from "@/game/puzzles/evaluate";

const byId = (id: string): PuzzleDef => {
  const p = PUZZLES.find((x) => x.id === id);
  if (p === undefined) throw new Error(`no puzzle ${id}`);
  return p;
};

describe("tier bands", () => {
  it("cuts the share axis into five disjoint bands", () => {
    expect(tierForShare(1)).toBe(1);
    expect(tierForShare(0.55)).toBe(1);
    expect(tierForShare(0.549)).toBe(2);
    expect(tierForShare(0.35)).toBe(2);
    expect(tierForShare(0.349)).toBe(3);
    expect(tierForShare(0.18)).toBe(3);
    expect(tierForShare(0.179)).toBe(4);
    expect(tierForShare(0.08)).toBe(4);
    expect(tierForShare(0.079)).toBe(5);
    expect(tierForShare(0)).toBe(5);
  });

  it("tiers deduction by how many readings it must rule out", () => {
    expect(tierForSearch(4)).toBe(1);
    expect(tierForSearch(8)).toBe(1);
    expect(tierForSearch(9)).toBe(2);
    expect(tierForSearch(32)).toBe(3);
    expect(tierForSearch(33)).toBe(4);
    expect(tierForSearch(73)).toBe(5);
  });
});

describe("authored puzzles are calibrated", () => {
  it.each(PUZZLES.map((p) => [p.id, p] as const))(
    "%s sits in the band its solver score earns",
    (_id, puzzle) => {
      expect(calibrationIssues(puzzle)).toEqual([]);
    },
  );

  it("rejects a deliberately mis-tiered puzzle", () => {
    const honest = byId("shieldWall");
    const lie: PuzzleDef = { ...honest, tier: honest.tier === 1 ? 2 : 1 };
    const issues = calibrationIssues(lie).map((i) => i.problem);
    expect(issues.some((p) => p.includes("but the solver computes"))).toBe(true);
  });

  it("rejects a puzzle that a floor roll already wins", () => {
    const free: PuzzleDef = {
      ...byId("ignite"),
      goal: {
        g: "constraint",
        base: { metric: "damage", min: 1 },
        rules: [],
      },
      tier: 1,
    };
    const issues = calibrationIssues(free).map((i) => i.problem);
    expect(issues).toContain("is a free win on a floor roll");
  });

  it("refuses to calibrate a deck whose roll space cannot be enumerated", () => {
    const huge: PuzzleDef = {
      ...byId("oreVein"),
      deck: ["lancehead", "voidmaw", "magma", "abyss"],
    };
    expect(boardSpaceSize(huge)).toBeGreaterThan(CALIBRATION_SPACE_CAP);
    expect(() => boardSpace(huge)).toThrow(/calibration cap/);
  });
});

describe("locks are modelled, not decorative", () => {
  it("keeps a locked die out of turn 1 and lets it in on turn 2", () => {
    const puzzle = byId("shieldWall");
    const free = enumeratePlacements(puzzle, 0);
    const locked = enumeratePlacements(puzzle, 1);
    expect(locked.length).toBeLessThan(free.length);
    expect(locked.every((p) => !Object.values(p).includes(0))).toBe(true);
  });

  it("costs a multiTurn puzzle its turn-1 output", () => {
    const sprint: PuzzleDef = {
      id: "lockProbe",
      title: "content:puzzle.emberStack.title",
      goalText: "content:puzzle.emberStack.goal",
      tier: 3,
      deck: ["ember", "ember"],
      slots: ["weaponA", "weaponB"],
      rerolls: 0,
      goal: { g: "multiTurn", turns: 2, final: { metric: "damage", min: 1 } },
    };
    const sequence = [[[6, 6]], [[1, 1]]];
    const ceiling = (puzzle: PuzzleDef): number => {
      let best = 0;
      for (let target = 1; target <= 60; target += 1) {
        if (winsSequence(puzzle, sequence, "damage", target, 1)) best = target;
      }
      return best;
    };
    expect(ceiling({ ...sprint, locks: 1 })).toBeLessThan(ceiling(sprint));
  });
});

describe("multiTurn search walks the reserve axis", () => {
  const carrier: PuzzleDef = {
    id: "reserveProbe",
    title: "content:puzzle.shieldWall.title",
    goalText: "content:puzzle.shieldWall.goal",
    tier: 3,
    deck: ["bulwark"],
    slots: ["shields"],
    rerolls: 0,
    goal: { g: "multiTurn", turns: 2, final: { metric: "shield", min: 11 } },
  };

  it("wins by holding turn 1's high die for the final turn", () => {
    expect(winsSequence(carrier, [[[8]], [[1]]], "shield", 11, 1)).toBe(true);
  });

  it("loses when no turn offers a die worth reserving", () => {
    expect(winsSequence(carrier, [[[1]], [[1]]], "shield", 11, 1)).toBe(false);
  });
});
