import { MODULE_BY_ID } from "@/data/modules";
import { applyDefs } from "@/game/effects/evaluate";
import type { EffectSource } from "@/game/effects/pipeline";
import type { EffectDef } from "@/game/effects/types";

export const activeModuleEffects = (
  modules: readonly string[],
): EffectDef[] => {
  const effects: EffectDef[] = [];
  for (const id of modules) {
    const def = MODULE_BY_ID.get(id);
    if (def?.effects !== undefined) effects.push(...def.effects);
  }
  return effects;
};

export const buildModuleSource = (
  modules: readonly string[],
): EffectSource => {
  const effects = activeModuleEffects(modules);
  return {
    key: "modules",
    run: (hook, ctx, subject) => {
      applyDefs(effects, hook, ctx, subject);
    },
  };
};
