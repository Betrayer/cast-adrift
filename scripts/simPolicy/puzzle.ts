import type { PuzzleDef, PuzzleTier } from "../../src/data/puzzles";
import { difficultyOf } from "../../src/game/puzzles/difficulty";
import {
  attemptCost,
  isDeduction,
  maxAttempts,
  rewardFor,
} from "../../src/game/puzzles/stakes";
import { ptsForDie, sellValue } from "../../src/game/economy/prices";
import type { RngStream } from "../../src/services/rng";

export const CODEX_SCRAP_VALUE = 6;
export const VOUCHER_SCRAP_VALUE = 12;
export const INTERFERENCE_SCRAP_VALUE = 22;

export interface PuzzleOutcome {
  entered: boolean;
  solved: boolean;
  attempts: number;
  paid: number;
  scrap: number;
  dieDrop: string | null;
}

export const rewardScrapValue = (
  puzzle: PuzzleDef,
  stream: RngStream,
): { scrap: number; dieDrop: string | null } => {
  const reward = rewardFor(puzzle, stream);
  let scrap = reward.scrap;
  if (reward.codex !== undefined) scrap += CODEX_SCRAP_VALUE;
  if (reward.choice !== undefined) {
    scrap += reward.choice.vouchers * VOUCHER_SCRAP_VALUE;
    return { scrap, dieDrop: reward.choice.die };
  }
  if (reward.die !== undefined) return { scrap, dieDrop: reward.die };
  return { scrap, dieDrop: null };
};

const dieWorth = (dieId: string | null): number =>
  dieId === null ? 0 : sellValue(ptsForDie(dieId));

export const expectedValue = (
  puzzle: PuzzleDef,
  stream: RngStream,
  streakPressure: number,
): number => {
  const perAttempt = difficultyOf(puzzle).attemptWin;
  const attempts = maxAttempts(puzzle);
  const solveChance = 1 - (1 - perAttempt) ** attempts;
  const reward = rewardScrapValue(puzzle, stream);
  const payoff = reward.scrap + dieWorth(reward.dieDrop);
  let expectedCost = 0;
  let reached = 1;
  for (let used = 0; used < attempts; used += 1) {
    expectedCost += reached * attemptCost(puzzle, used);
    reached *= 1 - perAttempt;
  }
  return solveChance * (payoff + streakPressure) - expectedCost;
};

export const decideEnter = (
  puzzle: PuzzleDef,
  scrap: number,
  streakPressure: number,
  stream: RngStream,
): boolean => {
  if (isDeduction(puzzle)) return true;
  const worstPaid = attemptCost(puzzle, maxAttempts(puzzle) - 1);
  if (scrap < worstPaid) return streakPressure > 0;
  return expectedValue(puzzle, stream, streakPressure) > 0;
};

export const resolvePuzzle = (
  puzzle: PuzzleDef,
  scrap: number,
  streakPressure: number,
  roll: RngStream,
  rewardStream: RngStream,
): PuzzleOutcome => {
  const skipped: PuzzleOutcome = {
    entered: false,
    solved: false,
    attempts: 0,
    paid: 0,
    scrap: 0,
    dieDrop: null,
  };
  if (!decideEnter(puzzle, scrap, streakPressure, rewardStream)) return skipped;

  const perAttempt = difficultyOf(puzzle).attemptWin;
  const attempts = maxAttempts(puzzle);
  let purse = scrap;
  let paid = 0;
  for (let used = 0; used < attempts; used += 1) {
    const cost = attemptCost(puzzle, used);
    if (cost > purse) break;
    purse -= cost;
    paid += cost;
    if (roll.next() < perAttempt) {
      const reward = rewardScrapValue(puzzle, rewardStream);
      return {
        entered: true,
        solved: true,
        attempts: used + 1,
        paid,
        scrap: reward.scrap,
        dieDrop: reward.dieDrop,
      };
    }
  }
  return {
    entered: true,
    solved: false,
    attempts,
    paid,
    scrap: 0,
    dieDrop: null,
  };
};

export const tierOf = (puzzle: PuzzleDef): PuzzleTier => puzzle.tier;
