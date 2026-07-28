import { describe, expect, it } from "vitest";
import { CONTRACTS, CONTRACT_STAR_COUNT } from "@/data/contracts";
import {
  countStars,
  goalMet,
  goalStarsMask,
  newStars,
  type GoalContext,
  type GoalSpec,
} from "@/game/run/goals";
import { createInitialRunStats, type RunStats } from "@/stores/runStore";

const ctx = (patch: Partial<GoalContext> = {}): GoalContext => ({
  win: true,
  stats: createInitialRunStats(),
  hull: 30,
  hullMax: 30,
  scrap: 0,
  deckSchools: 3,
  deckSize: 5,
  axis: 0,
  solvedPuzzles: [],
  flags: {},
  ...patch,
});

const stats = (patch: Partial<RunStats>): RunStats => ({
  ...createInitialRunStats(),
  ...patch,
});

describe("goal predicates", () => {
  it("reads the win flag", () => {
    expect(goalMet({ g: "win" }, ctx({ win: true }))).toBe(true);
    expect(goalMet({ g: "win" }, ctx({ win: false }))).toBe(false);
  });

  it("measures end-of-run hull as a percentage", () => {
    const spec: GoalSpec = { g: "hullPctAtLeast", n: 50 };
    expect(goalMet(spec, ctx({ hull: 15, hullMax: 30 }))).toBe(true);
    expect(goalMet(spec, ctx({ hull: 14, hullMax: 30 }))).toBe(false);
  });

  it("tracks the low-water mark separately from the final hull", () => {
    const spec: GoalSpec = { g: "hullNeverBelowPct", n: 50 };
    expect(
      goalMet(spec, ctx({ hull: 30, stats: stats({ hullPctMin: 51 }) })),
    ).toBe(true);
    expect(
      goalMet(spec, ctx({ hull: 30, stats: stats({ hullPctMin: 40 }) })),
    ).toBe(false);
  });

  it("treats an untouched run as never having dropped", () => {
    expect(goalMet({ g: "hullNeverBelowPct", n: 100 }, ctx())).toBe(true);
  });

  it("counts shipyard visits, rerolls and purchases as absences", () => {
    expect(goalMet({ g: "noShipyardVisits" }, ctx())).toBe(true);
    expect(
      goalMet({ g: "noShipyardVisits" }, ctx({ stats: stats({ shipyardVisits: 1 }) })),
    ).toBe(false);
    expect(goalMet({ g: "noRerolls" }, ctx())).toBe(true);
    expect(
      goalMet({ g: "noRerolls" }, ctx({ stats: stats({ rerollsUsed: 1 }) })),
    ).toBe(false);
    expect(goalMet({ g: "boughtNothing" }, ctx())).toBe(true);
    expect(
      goalMet({ g: "boughtNothing" }, ctx({ stats: stats({ scrapSpent: 1 }) })),
    ).toBe(false);
  });

  it("needs a recorded battle before a fast-win goal can pass", () => {
    const spec: GoalSpec = { g: "fastBattleTurnsAtMost", n: 2 };
    expect(goalMet(spec, ctx())).toBe(false);
    expect(
      goalMet(spec, ctx({ stats: stats({ minBattleTurns: 2 }) })),
    ).toBe(true);
    expect(
      goalMet(spec, ctx({ stats: stats({ minBattleTurns: 3 }) })),
    ).toBe(false);
  });

  it("checks depth and deck size together", () => {
    const spec: GoalSpec = { g: "depthWithDeckAtLeast", depth: 15, deck: 5 };
    expect(goalMet(spec, ctx({ stats: stats({ depth: 15 }), deckSize: 5 }))).toBe(
      true,
    );
    expect(goalMet(spec, ctx({ stats: stats({ depth: 15 }), deckSize: 4 }))).toBe(
      false,
    );
    expect(goalMet(spec, ctx({ stats: stats({ depth: 14 }), deckSize: 9 }))).toBe(
      false,
    );
  });

  it("reads beacons from flags and anomalies from solved puzzles", () => {
    expect(goalMet({ g: "beaconResolved" }, ctx())).toBe(false);
    expect(
      goalMet({ g: "beaconResolved" }, ctx({ flags: { beacon3: true } })),
    ).toBe(true);
    expect(goalMet({ g: "anomaliesSolvedAtLeast", n: 1 }, ctx())).toBe(false);
    expect(
      goalMet(
        { g: "anomaliesSolvedAtLeast", n: 1 },
        ctx({ solvedPuzzles: ["oreVein"] }),
      ),
    ).toBe(true);
  });

  it("reads the axis as a resonance-negative scale", () => {
    expect(goalMet({ g: "axisAtMost", n: -2 }, ctx({ axis: -3 }))).toBe(true);
    expect(goalMet({ g: "axisAtMost", n: -2 }, ctx({ axis: -1 }))).toBe(false);
  });

  it("denies win-only goals on a lost run even when the counter is satisfied", () => {
    const lost = ctx({ win: false, hull: 30, hullMax: 30, scrap: 500, axis: -9 });
    expect(goalMet({ g: "hullPctAtLeast", n: 50 }, lost)).toBe(false);
    expect(goalMet({ g: "scrapAtLeast", n: 100 }, lost)).toBe(false);
    expect(goalMet({ g: "axisAtMost", n: -2 }, lost)).toBe(false);
  });

  it("still awards progress goals on a lost run", () => {
    const lost = ctx({ win: false, stats: stats({ elites: 3 }) });
    expect(goalMet({ g: "elitesAtLeast", n: 2 }, lost)).toBe(true);
  });
});

describe("star masks", () => {
  it("packs the three goals into bits 0..2", () => {
    const goals: GoalSpec[] = [
      { g: "win" },
      { g: "elitesAtLeast", n: 2 },
      { g: "noRerolls" },
    ];
    const mask = goalStarsMask(goals, ctx({ stats: stats({ elites: 2 }) }));
    expect(mask).toBe(0b111);
    expect(countStars(mask)).toBe(3);
  });

  it("counts only bits the profile has never held", () => {
    expect(newStars(0b001, 0b011)).toBe(1);
    expect(newStars(0b111, 0b111)).toBe(0);
    expect(newStars(0, 0b101)).toBe(2);
  });
});

describe("contract catalogue", () => {
  it("ships fourteen contracts, each with three distinct goals", () => {
    expect(CONTRACTS).toHaveLength(14);
    for (const def of CONTRACTS) {
      expect(def.goals).toHaveLength(CONTRACT_STAR_COUNT);
      expect(new Set(def.goals.map((g) => g.g)).size).toBe(CONTRACT_STAR_COUNT);
    }
  });

  it("makes the first star of every contract the clear", () => {
    for (const def of CONTRACTS) {
      expect(def.goals[0]).toEqual({ g: "win" });
    }
  });

  it("awards no stars at all for a contract abandoned at the start", () => {
    for (const def of CONTRACTS) {
      const mask = goalStarsMask(def.goals, ctx({ win: false, hull: 0 }));
      expect(mask & 1).toBe(0);
    }
  });
});
