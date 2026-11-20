import { ROLL_MS } from "@/dice3d/spin";
import { useRollStyle, rollStyleId } from "@/services/prefs";
import { resolveReducedMotion, useReducedMotion, useSettingsStore } from "@/stores/settingsStore";
import type { BattleSpeed, RollStyle } from "@/types";

export interface RollSettings {
  style: RollStyle;
  durationMs: number;
  reduced: boolean;
}

export const rollDurationFor = (speed: BattleSpeed): number =>
  speed === "fast" ? ROLL_MS.fast : ROLL_MS.normal;

export const rollSettingsNow = (): RollSettings => {
  const settings = useSettingsStore.getState();
  return {
    style: rollStyleId(),
    durationMs: rollDurationFor(settings.battleSpeed),
    reduced: resolveReducedMotion(settings.reducedMotion),
  };
};

export const useRollSettings = (): RollSettings => {
  const style = useRollStyle();
  const speed = useSettingsStore((s) => s.battleSpeed);
  const reduced = useReducedMotion();
  return { style, durationMs: rollDurationFor(speed), reduced };
};
