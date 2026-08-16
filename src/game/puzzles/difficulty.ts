import { DIE_BY_ID } from "@/data/dice";
import type {
  PuzzleDef,
  PuzzleGoal,
  PuzzleTier,
  SingleTurnGoal,
} from "@/data/puzzles";
import {
  applyTurn,
  emptyCarry,
  enumeratePlacements,
  evalOrderStep,
  lockedCountForTurn,
  resolveFaces,
  scorePlacement,
  singleTurnSatisfied,
  type CarryState,
  type Placement,
} from "@/game/puzzles/evaluate";
import { maxAttemptsForTier } from "@/game/puzzles/stakes";
import { createStream } from "@/services/rng";

export const CALIBRATION_SPACE_CAP = 1300;
export const CALIBRATION_WORK_CAP = 30000;
export const DEDUCTION_PLACEMENT_CAP = 200;
export const DEFAULT_REROLL_SIZE = 2;

const MULTI_TURN_SAMPLES = 40;
const MULTI_TURN_FRONTIER = 5;
const MULTI_TURN_RESERVES = 2;
const MULTI_TURN_SEED = 0x9e37;

export interface TierBand {
  tier: PuzzleTier;
  minShare: number;
  solveFloor: number;
}

export const TIER_BANDS: readonly TierBand[] = [
  { tier: 1, minShare: 0.55, solveFloor: 0.55 },
  { tier: 2, minShare: 0.35, solveFloor: 0.55 },
  { tier: 3, minShare: 0.18, solveFloor: 0.55 },
  { tier: 4, minShare: 0.08, solveFloor: 0.4 },
  { tier: 5, minShare: 0, solveFloor: 0.3 },
];

export const DEDUCTION_BANDS: readonly { tier: PuzzleTier; maxSearch: number }[] =
  [
    { tier: 1, maxSearch: 8 },
    { tier: 2, maxSearch: 16 },
    { tier: 3, maxSearch: 32 },
    { tier: 4, maxSearch: 72 },
    { tier: 5, maxSearch: Number.POSITIVE_INFINITY },
  ];

export const bandFor = (tier: PuzzleTier): TierBand => {
  const band = TIER_BANDS.find((b) => b.tier === tier);
  if (band === undefined) throw new Error(`no tier band for T${String(tier)}`);
  return band;
};

export const tierForShare = (share: number): PuzzleTier =>
  (TIER_BANDS.find((b) => share >= b.minShare) ?? TIER_BANDS[4] ?? {
    tier: 5 as PuzzleTier,
  }).tier;

export const tierForSearch = (search: number): PuzzleTier =>
  (DEDUCTION_BANDS.find((b) => search <= b.maxSearch) ?? { tier: 5 as PuzzleTier })
    .tier;

const facePools = (puzzle: PuzzleDef): number[][] =>
  puzzle.deck.map((defId) =>
    resolveFaces(defId, DIE_BY_ID.get(defId)?.tier ?? 6),
  );

export const boardSpaceSize = (puzzle: PuzzleDef): number =>
  puzzle.fixedRoll === undefined
    ? facePools(puzzle).reduce((n, faces) => n * faces.length, 1)
    : 1;

export const boardSpace = (puzzle: PuzzleDef): number[][] => {
  if (puzzle.fixedRoll !== undefined) return [[...puzzle.fixedRoll]];
  const size = boardSpaceSize(puzzle);
  if (size > CALIBRATION_SPACE_CAP) {
    throw new Error(
      `puzzle "${puzzle.id}" has ${String(size)} boards, over the calibration cap of ${String(CALIBRATION_SPACE_CAP)}`,
    );
  }
  let boards: number[][] = [[]];
  for (const faces of facePools(puzzle)) {
    const next: number[][] = [];
    for (const board of boards) {
      for (const face of faces) next.push([...board, face]);
    }
    boards = next;
  }
  return boards;
};

const extremeBoard = (puzzle: PuzzleDef, high: boolean): number[] =>
  puzzle.fixedRoll !== undefined
    ? [...puzzle.fixedRoll]
    : facePools(puzzle).map((faces) =>
        high ? Math.max(...faces) : Math.min(...faces),
      );

export const floorBoard = (puzzle: PuzzleDef): number[] =>
  extremeBoard(puzzle, false);

export const midBoard = (puzzle: PuzzleDef): number[] =>
  puzzle.fixedRoll !== undefined
    ? [...puzzle.fixedRoll]
    : facePools(puzzle).map(
        (faces) => faces[Math.floor((faces.length - 1) / 2)] ?? 1,
      );

const targetGoal = (goal: PuzzleGoal): SingleTurnGoal | null =>
  goal.g === "deduction" ? goal.inner : goal.g === "multiTurn" ? null : goal;

export const solutionsOnBoard = (
  puzzle: PuzzleDef,
  values: readonly number[],
): number => {
  const goal = targetGoal(puzzle.goal);
  if (goal === null) return 0;
  let count = 0;
  for (const placement of enumeratePlacements(puzzle)) {
    if (singleTurnSatisfied(puzzle, goal, values, placement)) count += 1;
  }
  return count;
};

interface SingleTurnTable {
  boards: number[][];
  winnable: boolean[];
  share: number;
}

const singleTurnTable = (
  puzzle: PuzzleDef,
  goal: SingleTurnGoal,
): SingleTurnTable => {
  const boards = boardSpace(puzzle);
  const placements = enumeratePlacements(puzzle);
  const winnable = boards.map((values) =>
    placements.some((placement) =>
      singleTurnSatisfied(puzzle, goal, values, placement),
    ),
  );
  const wins = winnable.reduce((n, ok) => n + (ok ? 1 : 0), 0);
  return { boards, winnable, share: wins / boards.length };
};

const boardIndexOf = (
  pools: readonly number[][],
  values: readonly number[],
): number => {
  let index = 0;
  for (let i = 0; i < pools.length; i += 1) {
    const faces = pools[i] ?? [];
    index = index * faces.length + faces.indexOf(values[i] ?? 1);
  }
  return index;
};

const subsetsUpTo = (n: number, size: number): number[][] => {
  const out: number[][] = [];
  const walk = (start: number, acc: number[]): void => {
    out.push([...acc]);
    if (acc.length === size) return;
    for (let i = start; i < n; i += 1) {
      acc.push(i);
      walk(i + 1, acc);
      acc.pop();
    }
  };
  walk(0, []);
  return out;
};

const rerollWinChance = (
  puzzle: PuzzleDef,
  table: SingleTurnTable,
): number => {
  const pools = facePools(puzzle);
  const rerolls = puzzle.rerolls;
  const size = Math.min(
    puzzle.rerollSize ?? DEFAULT_REROLL_SIZE,
    puzzle.deck.length,
  );
  const subsets = subsetsUpTo(puzzle.deck.length, size);
  const total = table.boards.length;

  let current: number[] = table.winnable.map((ok) => (ok ? 1 : 0));
  for (let round = 0; round < rerolls; round += 1) {
    const next = current.map((value, index) => {
      if (table.winnable[index] === true) return 1;
      const board = table.boards[index] ?? [];
      let best = value;
      for (const subset of subsets) {
        if (subset.length === 0) continue;
        let sum = 0;
        let count = 0;
        const draw = (depth: number, candidate: number[]): void => {
          const dieIndex = subset[depth];
          if (dieIndex === undefined) {
            sum += current[boardIndexOf(pools, candidate)] ?? 0;
            count += 1;
            return;
          }
          for (const face of pools[dieIndex] ?? []) {
            candidate[dieIndex] = face;
            draw(depth + 1, candidate);
          }
          candidate[dieIndex] = board[dieIndex] ?? 1;
        };
        draw(0, [...board]);
        if (count > 0) best = Math.max(best, sum / count);
      }
      return best;
    });
    current = next;
  }

  return current.reduce((sum, value) => sum + value, 0) / total;
};

interface MultiTurnFrontierNode {
  carry: CarryState;
  cumDamage: number;
  shield: number;
  reserved: number | null;
  reservedValue: number;
}

const dominates = (
  a: MultiTurnFrontierNode,
  b: MultiTurnFrontierNode,
): boolean =>
  a.cumDamage >= b.cumDamage &&
  a.carry.charge >= b.carry.charge &&
  a.carry.burn >= b.carry.burn &&
  a.shield >= b.shield &&
  a.reservedValue >= b.reservedValue;

const prune = (
  nodes: MultiTurnFrontierNode[],
  cap: number,
): MultiTurnFrontierNode[] => {
  const kept: MultiTurnFrontierNode[] = [];
  for (const node of nodes) {
    if (kept.some((other) => dominates(other, node))) continue;
    kept.push(node);
  }
  kept.sort(
    (a, b) =>
      b.cumDamage + b.carry.charge + b.shield + b.carry.burn * 2 -
      (a.cumDamage + a.carry.charge + a.shield + a.carry.burn * 2),
  );
  return kept.slice(0, cap);
};

const reserveOptions = (
  puzzle: PuzzleDef,
  values: readonly number[],
  placement: Placement,
): (number | null)[] => {
  const placed = new Set(Object.values(placement));
  const free = puzzle.deck
    .map((_, index) => index)
    .filter((index) => !placed.has(index))
    .sort((a, b) => (values[b] ?? 0) - (values[a] ?? 0))
    .slice(0, MULTI_TURN_RESERVES - 1);
  return [null, ...free];
};

const boardWithReserve = (
  board: readonly number[],
  previous: MultiTurnFrontierNode,
): number[] => {
  const next = [...board];
  if (previous.reserved !== null) next[previous.reserved] = previous.reservedValue;
  return next;
};

export const winsSequence = (
  puzzle: PuzzleDef,
  sequence: readonly number[][][],
  metric: "damage" | "charge" | "shield",
  target: number,
  candidates: number,
): boolean => {
  let frontier: MultiTurnFrontierNode[] = [
    {
      carry: emptyCarry(puzzle.deck.length),
      cumDamage: 0,
      shield: 0,
      reserved: null,
      reservedValue: 0,
    },
  ];

  for (let turn = 0; turn < sequence.length; turn += 1) {
    const boards = (sequence[turn] ?? []).slice(0, candidates);
    const placements = enumeratePlacements(
      puzzle,
      lockedCountForTurn(puzzle, turn),
    );
    const isLast = turn === sequence.length - 1;
    const next: MultiTurnFrontierNode[] = [];
    for (const node of frontier) {
      for (const rawBoard of boards) {
        const board = boardWithReserve(rawBoard, node);
        for (const placement of placements) {
          const outcome = applyTurn(puzzle, board, placement, node.carry);
          const cumDamage = node.cumDamage + outcome.turnDamage;
          if (isLast) {
            const value =
              metric === "damage"
                ? cumDamage
                : metric === "charge"
                  ? outcome.carryOut.charge
                  : outcome.endShield;
            if (value >= target) return true;
            continue;
          }
          for (const reserved of reserveOptions(puzzle, board, placement)) {
            next.push({
              carry: outcome.carryOut,
              cumDamage,
              shield: outcome.endShield,
              reserved,
              reservedValue: reserved === null ? 0 : (board[reserved] ?? 0),
            });
          }
        }
      }
    }
    if (isLast) return false;
    frontier = prune(next, MULTI_TURN_FRONTIER);
  }
  return false;
};

const multiTurnSequences = (
  puzzle: PuzzleDef,
  turns: number,
): number[][][][] => {
  const pools = facePools(puzzle);
  const stream = createStream(MULTI_TURN_SEED);
  const size = Math.min(
    puzzle.rerollSize ?? DEFAULT_REROLL_SIZE,
    puzzle.deck.length,
  );
  const sequences: number[][][][] = [];
  for (let s = 0; s < MULTI_TURN_SAMPLES; s += 1) {
    const sequence: number[][][] = [];
    for (let turn = 0; turn < turns; turn += 1) {
      const dealt = pools.map((faces) => stream.pick(faces));
      const candidates = [dealt];
      for (let r = 0; r < puzzle.rerolls; r += 1) {
        const previous = candidates[candidates.length - 1] ?? dealt;
        const improved = [...previous];
        const picked = stream
          .shuffle(pools.map((_, index) => index))
          .slice(0, size);
        for (const index of picked) {
          improved[index] = stream.pick(pools[index] ?? [1]);
        }
        candidates.push(improved);
      }
      sequence.push(candidates);
    }
    sequences.push(sequence);
  }
  return sequences;
};

export interface PuzzleDifficulty {
  arch: PuzzleGoal["g"];
  boards: number;
  placements: number;
  solutions: number;
  searchSize: number;
  unguidedShare: number;
  attemptWin: number;
  budgetedSolve: number;
  computedTier: PuzzleTier;
  floorWinnable: boolean;
  stepRates: readonly number[];
}

const orderStepRates = (
  puzzle: PuzzleDef,
  goal: SingleTurnGoal,
  boards: readonly (readonly number[])[],
): number[] => {
  if (goal.g !== "order") return [];
  const placements = enumeratePlacements(puzzle);
  return goal.steps.map((step) => {
    let hits = 0;
    for (const values of boards) {
      const ok = placements.some((placement) =>
        evalOrderStep(step, scorePlacement(puzzle, values, placement)),
      );
      if (ok) hits += 1;
    }
    return hits / boards.length;
  });
};

const difficultyCache = new WeakMap<PuzzleDef, PuzzleDifficulty>();

export const difficultyOf = (puzzle: PuzzleDef): PuzzleDifficulty => {
  const cached = difficultyCache.get(puzzle);
  if (cached !== undefined) return cached;
  const computed = computeDifficulty(puzzle);
  difficultyCache.set(puzzle, computed);
  return computed;
};

const computeDifficulty = (puzzle: PuzzleDef): PuzzleDifficulty => {
  const goal = puzzle.goal;
  const placements = enumeratePlacements(puzzle).length;

  if (goal.g === "multiTurn") {
    const sequences = multiTurnSequences(puzzle, goal.turns);
    const metric = goal.final.metric;
    const target = goal.final.min;
    let unguided = 0;
    let withRerolls = 0;
    for (const sequence of sequences) {
      if (winsSequence(puzzle, sequence, metric, target, 1)) unguided += 1;
      if (winsSequence(puzzle, sequence, metric, target, 1 + puzzle.rerolls)) {
        withRerolls += 1;
      }
    }
    const unguidedShare = unguided / sequences.length;
    const attemptWin = withRerolls / sequences.length;
    const computedTier = tierForShare(unguidedShare);
    const floorSequence = Array.from({ length: goal.turns }, () => [
      floorBoard(puzzle),
    ]);
    return {
      arch: goal.g,
      boards: sequences.length,
      placements,
      solutions: unguided,
      searchSize: 0,
      unguidedShare,
      attemptWin,
      budgetedSolve:
        1 - (1 - attemptWin) ** maxAttemptsForTier(computedTier, false),
      computedTier,
      floorWinnable: winsSequence(puzzle, floorSequence, metric, target, 1),
      stepRates: [],
    };
  }

  const target = targetGoal(goal);
  if (target === null) throw new Error(`puzzle "${puzzle.id}" has no goal`);

  if (goal.g === "deduction") {
    const values = puzzle.fixedRoll ?? [];
    const solutions = solutionsOnBoard(puzzle, values);
    const searchSize = solutions === 0 ? placements : placements / solutions;
    const computedTier = tierForSearch(searchSize);
    return {
      arch: goal.g,
      boards: 1,
      placements,
      solutions,
      searchSize,
      unguidedShare: solutions / placements,
      attemptWin: solutions / placements,
      budgetedSolve: 1 - (1 - solutions / placements) ** maxAttemptsForTier(
        computedTier,
        true,
      ),
      computedTier,
      floorWinnable: false,
      stepRates: orderStepRates(puzzle, target, [values]),
    };
  }

  const table = singleTurnTable(puzzle, target);
  const attemptWin = rerollWinChance(puzzle, table);
  const computedTier = tierForShare(table.share);
  const floorIndex = boardIndexOf(facePools(puzzle), floorBoard(puzzle));
  return {
    arch: goal.g,
    boards: table.boards.length,
    placements,
    solutions: solutionsOnBoard(puzzle, midBoard(puzzle)),
    searchSize: 0,
    unguidedShare: table.share,
    attemptWin,
    budgetedSolve:
      1 - (1 - attemptWin) ** maxAttemptsForTier(computedTier, false),
    computedTier,
    floorWinnable: table.winnable[floorIndex] === true,
    stepRates: orderStepRates(puzzle, target, table.boards),
  };
};

export interface CalibrationIssue {
  id: string;
  problem: string;
}

export const calibrationIssues = (
  puzzle: PuzzleDef,
  difficulty = difficultyOf(puzzle),
): CalibrationIssue[] => {
  const issues: CalibrationIssue[] = [];
  const push = (problem: string): void => {
    issues.push({ id: puzzle.id, problem });
  };

  if (difficulty.unguidedShare <= 0 && difficulty.arch !== "deduction") {
    push("no board in its roll space can be won");
  }
  if (difficulty.arch === "deduction" && difficulty.solutions < 1) {
    push("deduction has no solution on its fixed reading");
  }
  if (difficulty.arch === "deduction" && difficulty.solutions > 3) {
    push(
      `deduction has ${String(difficulty.solutions)} solutions, more than the 3 allowed`,
    );
  }
  if (
    difficulty.arch === "deduction" &&
    difficulty.placements > DEDUCTION_PLACEMENT_CAP
  ) {
    push(
      `deduction offers ${String(difficulty.placements)} legal readings, past the ${String(DEDUCTION_PLACEMENT_CAP)} a player can hold`,
    );
  }
  const work = difficulty.boards * difficulty.placements;
  if (difficulty.arch !== "multiTurn" && work > CALIBRATION_WORK_CAP) {
    push(
      `costs ${String(work)} board-placements to calibrate, over the ${String(CALIBRATION_WORK_CAP)} budget — shrink the deck or the slot list`,
    );
  }
  if (difficulty.floorWinnable) push("is a free win on a floor roll");
  if (difficulty.computedTier !== puzzle.tier) {
    push(
      `is authored T${String(puzzle.tier)} but the solver computes T${String(difficulty.computedTier)} (${(difficulty.unguidedShare * 100).toFixed(1)}% unguided${difficulty.arch === "deduction" ? `, search ${difficulty.searchSize.toFixed(1)}` : ""})`,
    );
  }
  if (difficulty.arch !== "deduction") {
    const floor = bandFor(puzzle.tier).solveFloor;
    if (difficulty.budgetedSolve < floor) {
      push(
        `solves ${(difficulty.budgetedSolve * 100).toFixed(1)}% of the time inside its budget, under the T${String(puzzle.tier)} floor of ${(floor * 100).toFixed(0)}%`,
      );
    }
  }
  return issues;
};
