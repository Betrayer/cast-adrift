import { MOTION_MS } from '@/app/motion';
import { DEATH_MS, HEAVY_HIT_STOP_MS } from '@/pixi/battle/timing';
import type { BattleOutcome } from '@/types/battle';

export const VICTORY_HOLD_MS = Math.max(
  MOTION_MS.xl,
  DEATH_MS + HEAVY_HIT_STOP_MS,
);

export const DEFEAT_CLOSE_MS = MOTION_MS.xl;

export const endHoldMs = (
  outcome: BattleOutcome | undefined,
  reduced: boolean,
): number => {
  if (reduced || outcome === undefined) return 0;
  return outcome === 'victory' ? VICTORY_HOLD_MS : DEFEAT_CLOSE_MS;
};
