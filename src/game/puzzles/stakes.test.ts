import { beforeEach, describe, expect, it } from "vitest";
import { PUZZLES, type PuzzleDef, type PuzzleTier } from "@/data/puzzles";
import {
  DEDUCTION_SUBMISSIONS,
  PUZZLE_CODEX,
  TIER_STAKES,
  attemptCost,
  attemptsLeft,
  maxAttempts,
  rewardFor,
} from "@/game/puzzles/stakes";
import { abandonRun, startRun } from "@/game/run/flow";
import { captureRunSnapshot, restoreRunSnapshot } from "@/game/run/snapshot";
import { createStream } from "@/services/rng";
import { useAppStore } from "@/stores/appStore";
import { useRunStore } from "@/stores/runStore";

const atTier = (tier: PuzzleTier): PuzzleDef => {
  const base = PUZZLES[0];
  if (base === undefined) throw new Error("no puzzles");
  return { ...base, tier, uniqueDie: tier === 5 ? "eclipse" : undefined };
};

const deductionAt = (tier: PuzzleTier): PuzzleDef => {
  const base = PUZZLES.find((p) => p.goal.g === "deduction");
  if (base === undefined) throw new Error("no deduction puzzle");
  return { ...base, tier, uniqueDie: tier === 5 ? "eclipse" : undefined };
};

describe("attempt budgets", () => {
  it("gives every tier a finite ladder", () => {
    expect(maxAttempts(atTier(1))).toBe(2);
    expect(maxAttempts(atTier(2))).toBe(2);
    expect(maxAttempts(atTier(3))).toBe(4);
    expect(maxAttempts(atTier(4))).toBe(3);
    expect(maxAttempts(atTier(5))).toBe(3);
    for (const stakes of Object.values(TIER_STAKES)) {
      expect(Number.isFinite(stakes.paidCosts.length)).toBe(true);
    }
  });

  it("charges nothing for the free attempts and escalates after them", () => {
    const t3 = atTier(3);
    expect(attemptCost(t3, 0)).toBe(0);
    expect(attemptCost(t3, 1)).toBe(0);
    expect(attemptCost(t3, 2)).toBe(8);
    expect(attemptCost(t3, 3)).toBe(8);

    const t4 = atTier(4);
    expect(attemptCost(t4, 0)).toBe(0);
    expect(attemptCost(t4, 1)).toBe(10);
    expect(attemptCost(t4, 2)).toBe(15);

    const t5 = atTier(5);
    expect(attemptCost(t5, 1)).toBe(15);
    expect(attemptCost(t5, 2)).toBe(25);
  });

  it("stops counting past the end of the ladder", () => {
    const t4 = atTier(4);
    expect(attemptsLeft(t4, 3)).toBe(0);
    expect(attemptsLeft(t4, 9)).toBe(0);
    expect(attemptCost(t4, 3)).toBe(0);
  });

  it("swaps attempts for submissions on a deduction, at any tier", () => {
    for (const tier of [1, 3, 5] as const) {
      const puzzle = deductionAt(tier);
      expect(maxAttempts(puzzle)).toBe(DEDUCTION_SUBMISSIONS);
      expect(attemptCost(puzzle, 2)).toBe(0);
    }
  });
});

describe("rewards follow the tier", () => {
  const stream = () => createStream(7);

  it("pays more the harder the puzzle is", () => {
    const scraps = [1, 2, 3, 5].map(
      (tier) => rewardFor(atTier(tier as PuzzleTier), stream()).scrap,
    );
    expect(scraps).toEqual([...scraps].sort((a, b) => a - b));
  });

  it("keeps codex, choice and unique die on the tiers that own them", () => {
    expect(rewardFor(atTier(1), stream()).codex).toBeUndefined();
    expect(rewardFor(atTier(3), stream()).codex).toBe(PUZZLE_CODEX);
    const t4 = rewardFor(atTier(4), stream());
    expect(t4.choice?.die).toBeDefined();
    expect(t4.choice?.vouchers).toBeGreaterThan(0);
    expect(rewardFor(atTier(5), stream()).die).toBe("eclipse");
  });

  it("draws the same T4 die for the same node seed", () => {
    expect(rewardFor(atTier(4), createStream(11)).choice?.die).toBe(
      rewardFor(atTier(4), createStream(11)).choice?.die,
    );
  });
});

describe("run bookkeeping", () => {
  beforeEach(() => {
    abandonRun();
    useAppStore.setState({ screen: "menu" });
  });

  it("binds a puzzle to its node once and counts attempts against it", () => {
    startRun(1);
    const run = useRunStore.getState();
    const first = run.beginPuzzle("r3l1", "oreVein");
    expect(first.attempts).toBe(0);
    expect(run.spendPuzzleAttempt("r3l1")).toBe(1);
    expect(run.spendPuzzleAttempt("r3l1")).toBe(2);
    expect(useRunStore.getState().beginPuzzle("r3l1", "oreVein").attempts).toBe(2);
    expect(useRunStore.getState().puzzleRuns["r3l1"]?.puzzleId).toBe("oreVein");
  });

  it("keeps each node's attempts separate", () => {
    startRun(1);
    const run = useRunStore.getState();
    run.beginPuzzle("r3l1", "oreVein");
    run.beginPuzzle("r7l2", "ignite");
    run.spendPuzzleAttempt("r3l1");
    expect(useRunStore.getState().puzzleRuns["r7l2"]?.attempts).toBe(0);
  });

  it("restores attempts after a save and resume mid-puzzle", () => {
    startRun(1);
    useRunStore.getState().beginPuzzle("r3l1", "oreVein");
    useRunStore.getState().spendPuzzleAttempt("r3l1");
    const snapshot = captureRunSnapshot();

    useRunStore.getState().reset();
    expect(useRunStore.getState().puzzleRuns["r3l1"]).toBeUndefined();

    expect(restoreRunSnapshot(snapshot)).toBe(true);
    expect(useRunStore.getState().puzzleRuns["r3l1"]).toEqual({
      puzzleId: "oreVein",
      attempts: 1,
    });
  });

  it("charges scrap for a paid attempt and refuses when the hold is empty", () => {
    startRun(1);
    useRunStore.setState({ scrap: 12 });
    expect(useRunStore.getState().spendScrap(8)).toBe(true);
    expect(useRunStore.getState().scrap).toBe(4);
    expect(useRunStore.getState().spendScrap(8)).toBe(false);
    expect(useRunStore.getState().scrap).toBe(4);
  });

  it("advances interference on a miss and clears every stack on a solve", () => {
    startRun(1);
    const run = () => useRunStore.getState();
    run().recordAnomalyUnsolved();
    run().recordAnomalyUnsolved();
    run().recordAnomalyUnsolved();
    expect(run().anomalyStreak).toBe(3);
    expect(run().interferenceStacks).toBeGreaterThan(0);
    run().recordAnomalySolved();
    expect(run().anomalyStreak).toBe(0);
    expect(run().interferenceStacks).toBe(0);
  });
});
