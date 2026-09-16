import { describe, expect, it } from "vitest";
import { puzzlesAtTier } from "@/game/puzzles/selection";
import { rewardFor } from "@/game/puzzles/stakes";
import { createStream, deriveSeed } from "@/services/rng";
import { choiceAlreadySettled } from "./PuzzleScreen";

const rewardOfTier = (tier: 1 | 4) => {
  const puzzle = puzzlesAtTier(tier)[0];
  if (puzzle === undefined) throw new Error(`no puzzle at T${String(tier)}`);
  return {
    puzzle,
    reward: rewardFor(puzzle, createStream(deriveSeed(7, `reward:${puzzle.id}`))),
  };
};

describe("choiceAlreadySettled", () => {
  it("offers the tier-4 choice on the pass that solves the puzzle", () => {
    const { puzzle, reward } = rewardOfTier(4);
    expect(reward.choice).toBeDefined();
    expect(choiceAlreadySettled(reward, [], puzzle.id)).toBe(false);
  });

  it("closes the tier-4 choice once the run has the puzzle solved", () => {
    const { puzzle, reward } = rewardOfTier(4);
    expect(choiceAlreadySettled(reward, [puzzle.id], puzzle.id)).toBe(true);
  });

  it("ignores other solved puzzles", () => {
    const { puzzle, reward } = rewardOfTier(4);
    expect(choiceAlreadySettled(reward, ["someOtherPuzzle"], puzzle.id)).toBe(
      false,
    );
  });

  it("has nothing to claim when the reward carries no choice", () => {
    const { puzzle, reward } = rewardOfTier(1);
    expect(reward.choice).toBeUndefined();
    expect(choiceAlreadySettled(reward, [], puzzle.id)).toBe(true);
  });
});
