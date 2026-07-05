import { RESONANCE_BONUSES } from "@/data/resonance";
import { applyDefs } from "@/game/effects/evaluate";
import type { EffectSource } from "@/game/effects/pipeline";
import type { EffectDef } from "@/game/effects/types";
import type { ResonanceCensus } from "@/types/battle";

export const activeResonanceEffects = (
  census: ResonanceCensus,
): EffectDef[] => {
  const effects: EffectDef[] = [];
  for (const bonus of RESONANCE_BONUSES) {
    if (bonus.effects === undefined) continue;
    if (census.counts[bonus.school] >= bonus.threshold) {
      effects.push(...bonus.effects);
    }
  }
  return effects;
};

export const buildResonanceSource = (census: ResonanceCensus): EffectSource => {
  const effects = activeResonanceEffects(census);
  return {
    key: "resonance",
    run: (hook, ctx, subject) => {
      applyDefs(effects, hook, ctx, subject);
    },
  };
};
