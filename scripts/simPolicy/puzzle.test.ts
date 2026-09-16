import { describe, expect, it } from "vitest";
import { PUZZLES, type PuzzleDef } from "@/data/puzzles";
import { attemptCost, maxAttempts } from "@/game/puzzles/stakes";
import { createStream, type RngStream } from "@/services/rng";
import { resolvePuzzle } from "./puzzle";

const missesEveryRoll = (): RngStream => ({
  next: () => 1,
  int: (min) => min,
  pick: (arr) => {
    const first = arr[0];
    if (first === undefined) throw new Error("pick on an empty pool");
    return first;
  },
  weighted: (entries) => {
    const first = entries[0];
    if (first === undefined) throw new Error("weighted on an empty pool");
    return first[0];
  },
  shuffle: (arr) => [...arr],
  state: () => 0,
});

const stakedTier5 = (): PuzzleDef => {
  const found = PUZZLES.find((p) => p.tier === 5 && p.goal.g !== "deduction");
  if (found === undefined) throw new Error("no staked T5 authored");
  return found;
};

const affordableAttempts = (puzzle: PuzzleDef, scrap: number): number => {
  let purse = scrap;
  let count = 0;
  for (let used = 0; used < maxAttempts(puzzle); used += 1) {
    const cost = attemptCost(puzzle, used);
    if (cost > purse) break;
    purse -= cost;
    count += 1;
  }
  return count;
};

describe("resolvePuzzle", () => {
  it("reports only the attempts the purse paid for", () => {
    const puzzle = stakedTier5();
    const outcome = resolvePuzzle(
      puzzle,
      25,
      0,
      missesEveryRoll(),
      createStream(12),
    );
    expect(outcome.entered).toBe(true);
    expect(outcome.solved).toBe(false);
    expect(outcome.paid).toBe(15);
    expect(outcome.attempts).toBe(2);
  });

  it("reports one attempt when the second stake is unaffordable", () => {
    const puzzle = stakedTier5();
    const outcome = resolvePuzzle(
      puzzle,
      0,
      100,
      missesEveryRoll(),
      createStream(12),
    );
    expect(outcome.entered).toBe(true);
    expect(outcome.paid).toBe(0);
    expect(outcome.attempts).toBe(1);
  });

  it("never tallies an attempt the stakes could not reach", () => {
    const puzzle = stakedTier5();
    for (let scrap = 0; scrap <= 45; scrap += 5) {
      const outcome = resolvePuzzle(
        puzzle,
        scrap,
        100,
        missesEveryRoll(),
        createStream(12),
      );
      if (!outcome.entered) continue;
      expect(outcome.attempts).toBe(affordableAttempts(puzzle, scrap));
    }
  });
});
