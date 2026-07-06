import { PERK_BY_ID } from "@/data/perks";
import { applyDefs } from "@/game/effects/evaluate";
import type { EffectSource } from "@/game/effects/pipeline";
import type { EffectDef } from "@/game/effects/types";

export const activePerkEffects = (
  perks: readonly string[],
): EffectDef[] => {
  const effects: EffectDef[] = [];
  for (const id of perks) {
    const def = PERK_BY_ID.get(id);
    if (def?.effects !== undefined) effects.push(...def.effects);
  }
  return effects;
};

export const buildPerkSource = (perks: readonly string[]): EffectSource => {
  const effects = activePerkEffects(perks);
  return {
    key: "perks",
    run: (hook, ctx, subject) => {
      applyDefs(effects, hook, ctx, subject);
    },
  };
};
