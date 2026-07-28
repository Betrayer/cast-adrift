import { describe, expect, it } from "vitest";
import { CONTRACTS, type ContractDef } from "@/data/contracts";
import {
  goalStarsMask,
  type GoalContext,
  type GoalSpec,
} from "@/game/run/goals";
import { createInitialRunStats, type RunStats } from "@/stores/runStore";

// A "scripted run": the run tally a perfect attempt at each contract would leave
// behind. Building it from the goal specs themselves proves every star is
// reachable and that no two stars in one contract contradict each other.
const scriptRun = (goals: readonly GoalSpec[]): GoalContext => {
  const stats: RunStats = { ...createInitialRunStats() };
  const ctx: GoalContext = {
    win: true,
    stats,
    hull: 30,
    hullMax: 30,
    scrap: 0,
    deckSize: 5,
    axis: 0,
    solvedPuzzles: [],
    flags: {},
  };
  for (const spec of goals) {
    switch (spec.g) {
      case "win":
        break;
      case "hullPctAtLeast":
        ctx.hull = Math.ceil((spec.n / 100) * ctx.hullMax);
        break;
      case "hullNeverBelowPct":
        stats.hullPctMin = spec.n;
        break;
      case "noShipyardVisits":
      case "boughtNothing":
      case "noRerolls":
        break;
      case "burnKillElite":
        stats.burnKillElites = 1;
        break;
      case "jumpsAtMost":
        stats.jumps = spec.n;
        break;
      case "shieldAbsorbedAtLeast":
        stats.shieldAbsorbed = spec.n;
        break;
      case "scrapAtLeast":
        ctx.scrap = spec.n;
        break;
      case "spinalHitAtLeast":
        stats.spinalMaxHit = spec.n;
        break;
      case "fastBattleTurnsAtMost":
        stats.minBattleTurns = spec.n;
        break;
      case "repairBayHealAtLeast":
        stats.repairBayHealed = spec.n;
        break;
      case "fullHullBattleEndsAtLeast":
        stats.fullHullBattleEnds = spec.n;
        break;
      case "minibossKilled":
        stats.minibosses = 1;
        break;
      case "elitesAtLeast":
        stats.elites = spec.n;
        break;
      case "depthWithDeckAtLeast":
        stats.depth = spec.depth;
        ctx.deckSize = spec.deck;
        break;
      case "beaconResolved":
        ctx.flags = { ...ctx.flags, beacon1: true };
        break;
      case "anomaliesSolvedAtLeast":
        ctx.solvedPuzzles = Array.from({ length: spec.n }, (_, i) =>
          `puzzle-${String(i)}`,
        );
        break;
      case "blackPlacedInWinAtLeast":
        stats.maxBlackPlacedWin = spec.n;
        break;
      case "axisAtMost":
        ctx.axis = spec.n;
        break;
    }
  }
  return ctx;
};

const ALL_STARS = 0b111;

describe("contract stars are reachable", () => {
  for (const def of CONTRACTS) {
    it(`awards all three stars for a perfect «${def.id}» run`, () => {
      expect(goalStarsMask(def.goals, scriptRun(def.goals))).toBe(ALL_STARS);
    });
  }

  it("awards only the clear for a bare win", () => {
    const bare = (def: ContractDef): number =>
      goalStarsMask(def.goals, {
        win: true,
        stats: {
          ...createInitialRunStats(),
          jumps: 99,
          hullPctMin: 1,
          shipyardVisits: 3,
          rerollsUsed: 9,
          scrapSpent: 300,
        },
        hull: 1,
        hullMax: 30,
        scrap: 0,
        deckSize: 1,
        axis: 5,
        solvedPuzzles: [],
        flags: {},
      });
    for (const def of CONTRACTS) {
      expect(bare(def) & 1).toBe(1);
      expect(bare(def)).toBe(1);
    }
  });
});
