import { CHART_NODE_BY_ID } from "@/data/chart";
import { applyDefs } from "@/game/effects/evaluate";
import type { EffectSource } from "@/game/effects/pipeline";
import type { EffectDef } from "@/game/effects/types";

export const activeChartEffects = (
  picks: readonly string[],
): EffectDef[] => {
  const effects: EffectDef[] = [];
  for (const id of picks) {
    const def = CHART_NODE_BY_ID.get(id);
    if (def?.effects !== undefined) effects.push(...def.effects);
  }
  return effects;
};

export const buildChartSource = (picks: readonly string[]): EffectSource => {
  const effects = activeChartEffects(picks);
  return {
    key: "chart",
    run: (hook, ctx, subject) => {
      applyDefs(effects, hook, ctx, subject);
    },
  };
};
