import { PUZZLES, type PuzzleDef, type PuzzleTier } from "@/data/puzzles";
import type { MapNode } from "@/game/map/types";
import { createStream, deriveSeed, type RngStream } from "@/services/rng";

export type TierWindow = readonly [number, number];

export const WINDOW_EDGE_WEIGHT = 1;
export const WINDOW_INTERIOR_WEIGHT = 2;

const isTier = (value: number): value is PuzzleTier =>
  value >= 1 && value <= 5 && Number.isInteger(value);

export const tierWeights = (
  window: TierWindow,
): [PuzzleTier, number][] => {
  const [low, high] = window;
  if (!isTier(low) || !isTier(high) || low > high) {
    throw new Error(`puzzle tier window [${String(low)},${String(high)}] is not a tier range`);
  }
  const weights: [PuzzleTier, number][] = [];
  for (let tier = low; tier <= high; tier += 1) {
    if (!isTier(tier)) continue;
    const edge = tier === low || tier === high;
    weights.push([tier, edge ? WINDOW_EDGE_WEIGHT : WINDOW_INTERIOR_WEIGHT]);
  }
  return weights;
};

export const pickTier = (window: TierWindow, stream: RngStream): PuzzleTier =>
  stream.weighted(tierWeights(window));

export const puzzlesAtTier = (tier: PuzzleTier): PuzzleDef[] =>
  PUZZLES.filter((puzzle) => puzzle.tier === tier);

export const pickPuzzle = (
  tier: PuzzleTier,
  solvedThisRun: readonly string[],
  seenAcrossRuns: readonly string[],
  stream: RngStream,
): PuzzleDef => {
  const pool = puzzlesAtTier(tier);
  if (pool.length === 0) {
    throw new Error(`no puzzle is authored at T${String(tier)}`);
  }
  const unsolved = pool.filter((p) => !solvedThisRun.includes(p.id));
  const candidates = unsolved.length > 0 ? unsolved : pool;
  const unseen = candidates.filter((p) => !seenAcrossRuns.includes(p.id));
  return stream.pick(unseen.length > 0 ? unseen : candidates);
};

export const anomalyWindow = (node: MapNode): TierWindow | null =>
  node.type === "anomaly" ? (node.tierWindow ?? null) : null;

export const tierForNode = (
  seed: number,
  node: MapNode,
): PuzzleTier | null => {
  const window = anomalyWindow(node);
  if (window === null) return null;
  return pickTier(window, createStream(deriveSeed(seed, `tier:${node.id}`)));
};

export const puzzleForNode = (
  seed: number,
  node: MapNode,
  solvedThisRun: readonly string[],
  seenAcrossRuns: readonly string[],
): PuzzleDef | null => {
  const tier = tierForNode(seed, node);
  if (tier === null) return null;
  return pickPuzzle(
    tier,
    solvedThisRun,
    seenAcrossRuns,
    createStream(deriveSeed(seed, `puzzle:${node.id}`)),
  );
};
