import { DIE_BY_ID } from "@/data/dice";
import type { DieInstance } from "@/stores/runStore";
import type { School } from "@/types/content";

export const AXIS_MIN = -10;
export const AXIS_MAX = 10;
export const AXIS_DECK_THRESHOLD = 2;

// Negative = Resonance, positive = Stability (DESIGN §2). At battle end the
// black/blue usage ratio nudges the axis by at most ±1.
export type AxisDelta = -1 | 0 | 1;

export const battleEndAxisDelta = (
  blackUsed: number,
  blueUsed: number,
  deckBlack: number,
  deckBlue: number,
): AxisDelta => {
  const blackLean =
    blackUsed > 0 && blackUsed >= blueUsed && deckBlack >= AXIS_DECK_THRESHOLD;
  const blueLean =
    blueUsed > 0 && blueUsed >= blackUsed && deckBlue >= AXIS_DECK_THRESHOLD;
  if (blackLean && !blueLean) return -1;
  if (blueLean && !blackLean) return 1;
  return 0;
};

export const countDeckSchool = (
  deck: readonly DieInstance[],
  school: School,
): number =>
  deck.filter((d) => DIE_BY_ID.get(d.defId)?.school === school).length;

export const axisLabel = (axis: number): "resonance" | "stability" | "neutral" => {
  if (axis < 0) return "resonance";
  if (axis > 0) return "stability";
  return "neutral";
};
