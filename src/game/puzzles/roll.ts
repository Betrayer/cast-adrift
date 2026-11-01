import { DIE_BY_ID, rollBaseValue } from "@/data/dice";
import type { PuzzleDef } from "@/data/puzzles";
import { createStream, deriveSeed } from "@/services/rng";

const rollAt = (
  puzzle: PuzzleDef,
  index: number,
  stream: ReturnType<typeof createStream>,
): number => {
  const defId = puzzle.deck[index] ?? "";
  return rollBaseValue(defId, DIE_BY_ID.get(defId)?.tier ?? 6, stream);
};

export const rollPuzzleDeck = (
  puzzle: PuzzleDef,
  seed: number,
  key: string,
  keep: (index: number) => number | undefined = () => undefined,
): number[] => {
  const stream = createStream(deriveSeed(seed, key));
  return puzzle.deck.map((_, index) => keep(index) ?? rollAt(puzzle, index, stream));
};

export const rerollPuzzleDice = (
  puzzle: PuzzleDef,
  values: readonly number[],
  picked: readonly number[],
  seed: number,
  key: string,
): number[] => {
  const stream = createStream(deriveSeed(seed, key));
  return values.map((value, index) =>
    picked.includes(index) ? rollAt(puzzle, index, stream) : value,
  );
};

export const bumpRolls = (
  rolls: readonly number[],
  rolled: (index: number) => boolean,
): number[] => rolls.map((gen, index) => (rolled(index) ? gen + 1 : gen));
