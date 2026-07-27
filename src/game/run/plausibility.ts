import { SCORE_PER_DEPTH, SCORE_PER_KILL } from "@/game/run/modes";

// Deterrence, not prevention (DESIGN §15). Without server functions the client
// signs nothing, so the board only rejects submissions that could not have come
// from a legal run: too much score, too many kills or too much scrap per row.
export const MAX_KILLS_PER_DEPTH = 4;
export const MAX_SCRAP_PER_DEPTH = 80;
export const MAX_SCORE_PER_DEPTH =
  SCORE_PER_DEPTH + MAX_KILLS_PER_DEPTH * SCORE_PER_KILL + MAX_SCRAP_PER_DEPTH;
export const MAX_BOARD_SCORE = 500_000;

export interface PlausibilityInput {
  score: number;
  depth: number;
  kills: number;
  scrap: number;
  hash?: number;
  requiresHash?: boolean;
}

export type PlausibilityReason =
  | "negative"
  | "scoreOverCap"
  | "scorePerDepth"
  | "killsPerDepth"
  | "scrapPerDepth"
  | "missingHash";

export interface PlausibilityResult {
  ok: boolean;
  reasons: PlausibilityReason[];
}

export const plausibility = (
  input: PlausibilityInput,
): PlausibilityResult => {
  const reasons: PlausibilityReason[] = [];
  const depth = Math.max(0, Math.floor(input.depth));

  if (
    input.score < 0 ||
    input.depth < 0 ||
    input.kills < 0 ||
    input.scrap < 0
  ) {
    reasons.push("negative");
  }
  if (input.score > MAX_BOARD_SCORE) reasons.push("scoreOverCap");
  if (input.score > depth * MAX_SCORE_PER_DEPTH) reasons.push("scorePerDepth");
  if (input.kills > depth * MAX_KILLS_PER_DEPTH) reasons.push("killsPerDepth");
  if (input.scrap > depth * MAX_SCRAP_PER_DEPTH) reasons.push("scrapPerDepth");
  if (
    input.requiresHash === true &&
    (input.hash === undefined || input.hash === 0)
  ) {
    reasons.push("missingHash");
  }

  return { ok: reasons.length === 0, reasons };
};
