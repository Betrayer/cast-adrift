import type { PuzzleDef, PuzzleTier } from "@/data/puzzles";
import { LOOT_POOL } from "@/game/economy/rewards";
import type { RngStream } from "@/services/rng";

export interface TierStakes {
  freeAttempts: number;
  paidCosts: readonly number[];
}

export const TIER_STAKES: Record<PuzzleTier, TierStakes> = {
  1: { freeAttempts: 2, paidCosts: [] },
  2: { freeAttempts: 2, paidCosts: [] },
  3: { freeAttempts: 2, paidCosts: [8, 8] },
  4: { freeAttempts: 1, paidCosts: [10, 15] },
  5: { freeAttempts: 1, paidCosts: [15, 25] },
};

export const DEDUCTION_SUBMISSIONS = 3;

export const isDeduction = (puzzle: PuzzleDef): boolean =>
  puzzle.goal.g === "deduction";

export const maxAttemptsForTier = (
  tier: PuzzleTier,
  deduction: boolean,
): number => {
  if (deduction) return DEDUCTION_SUBMISSIONS;
  const stakes = TIER_STAKES[tier];
  return stakes.freeAttempts + stakes.paidCosts.length;
};

export const maxAttempts = (puzzle: PuzzleDef): number =>
  maxAttemptsForTier(puzzle.tier, isDeduction(puzzle));

export const attemptCost = (puzzle: PuzzleDef, used: number): number => {
  if (isDeduction(puzzle)) return 0;
  const stakes = TIER_STAKES[puzzle.tier];
  return stakes.paidCosts[used - stakes.freeAttempts] ?? 0;
};

export const attemptsLeft = (puzzle: PuzzleDef, used: number): number =>
  Math.max(0, maxAttempts(puzzle) - used);

export interface PuzzleReward {
  scrap: number;
  codex?: string;
  die?: string;
  choice?: { die: string; vouchers: number };
}

const TIER_SCRAP: Record<PuzzleTier, number> = {
  1: 15,
  2: 22,
  3: 30,
  4: 20,
  5: 40,
};

export const PUZZLE_CODEX = "riddleWard";
export const T4_VOUCHERS = 1;

export const rewardFor = (
  puzzle: PuzzleDef,
  stream: RngStream,
): PuzzleReward => {
  const scrap = TIER_SCRAP[puzzle.tier];
  switch (puzzle.tier) {
    case 1:
    case 2:
      return { scrap };
    case 3:
      return { scrap, codex: PUZZLE_CODEX };
    case 4:
      return {
        scrap,
        choice: {
          die: stream.pick([...LOOT_POOL.uncommon]),
          vouchers: T4_VOUCHERS,
        },
      };
    case 5:
      return { scrap, codex: PUZZLE_CODEX, die: puzzle.uniqueDie };
  }
};
