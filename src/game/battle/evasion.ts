import type { ShipId } from "@/data/ships";
import { shipProfile, type EvasionTuning } from "@/game/battle/passives";
import type { EvasionState } from "@/types/battle";

export const DODGE_PCT_PER_VALUE = 1.5;
export const GLANCING_PCT_PER_VALUE = 3.5;
export const DODGE_PCT_CAP = 10;
export const GLANCING_PCT_CAP = 25;
export const INTERCEPT_VALUE = 8;
export const INTERCEPT_WEAPONS_BONUS = 1;
export const VULNERABLE_CAP = 4;
export const VULNERABLE_DIVISOR = 2;

const clampPct = (raw: number, cap: number): number =>
  Math.max(0, Math.min(cap, Math.round(raw)));

export const BASE_EVASION: EvasionTuning = {
  delta: 0,
  dodgeCap: DODGE_PCT_CAP,
  glancingCap: GLANCING_PCT_CAP,
  dodgePerValue: DODGE_PCT_PER_VALUE,
  glancingPerValue: GLANCING_PCT_PER_VALUE,
};

export const evasionFor = (
  value: number,
  evasionDelta = 0,
  tuning: EvasionTuning = BASE_EVASION,
): EvasionState => {
  const effective = Math.max(0, value);
  const delta = evasionDelta + tuning.delta;
  return {
    dodgePct: clampPct(
      effective * tuning.dodgePerValue + delta,
      tuning.dodgeCap,
    ),
    glancingPct: clampPct(
      effective * tuning.glancingPerValue + delta / 2,
      tuning.glancingCap,
    ),
    intercept: effective >= INTERCEPT_VALUE,
  };
};

export const evasionTuningFor = (shipId: ShipId | undefined): EvasionTuning =>
  shipProfile(shipId).evasion ?? BASE_EVASION;

export const vulnerableFor = (value: number, markBonusDelta = 0): number =>
  Math.max(
    0,
    Math.min(VULNERABLE_CAP, Math.ceil(Math.max(0, value) / VULNERABLE_DIVISOR)) +
      markBonusDelta,
  );
