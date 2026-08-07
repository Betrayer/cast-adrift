import { DIE_BY_ID } from "@/data/dice";
import type { DieInstance } from "@/stores/runStore";
import type { School } from "@/types/content";

export const AXIS_MIN = -10;
export const AXIS_MAX = 10;
export const AXIS_DECK_THRESHOLD = 2;
export const DRIFT_RUN_CAP = 2;
export const AXIS_NOTCHES = 7;

// Negative = Resonance, positive = Stability (DESIGN §2). Deck usage is a
// tiebreaker, not the driver: it is settled once per sector and may contribute
// at most DRIFT_RUN_CAP points across the whole run.
export type AxisDelta = -1 | 0 | 1;

export const sectorDriftDelta = (
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

export const driftAllowed = (delta: AxisDelta, spent: number): AxisDelta =>
  spent >= DRIFT_RUN_CAP ? 0 : delta;

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

export const clampAxis = (axis: number): number =>
  Math.max(AXIS_MIN, Math.min(AXIS_MAX, axis));

// Seven notches over the full −10..+10 span: the middle notch is the neutral
// band, and the two outermost ones are the ending thresholds and beyond.
const NOTCH_BOUNDS: readonly number[] = [-5, -3, -1, 2, 4, 6];

export const axisNotch = (axis: number): number => {
  const value = clampAxis(axis);
  let notch = 0;
  for (const bound of NOTCH_BOUNDS) {
    if (value >= bound) notch += 1;
  }
  return notch;
};

export interface AxisRange {
  min: number;
  max: number;
}
