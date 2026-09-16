import { CHART_NODE_BY_ID } from "@/data/chart";
import { MODULE_BY_ID } from "@/data/modules";
import { PERK_BY_ID } from "@/data/perks";
import { RESONANCE_BONUSES } from "@/data/resonance";
import { applyDefs } from "@/game/effects/evaluate";
import type { EffectSource } from "@/game/effects/pipeline";
import type { EffectDef } from "@/game/effects/types";
import type { ResonanceCensus } from "@/types/battle";

const collect = (
  ids: readonly string[],
  lookup: (id: string) => readonly EffectDef[] | undefined,
): EffectDef[] => {
  const effects: EffectDef[] = [];
  for (const id of ids) {
    const defs = lookup(id);
    if (defs !== undefined) effects.push(...defs);
  }
  return effects;
};

const source = (key: string, effects: readonly EffectDef[]): EffectSource => ({
  key,
  run: (hook, ctx, subject) => {
    applyDefs(effects, hook, ctx, subject);
  },
});

export const activePerkEffects = (perks: readonly string[]): EffectDef[] =>
  collect(perks, (id) => PERK_BY_ID.get(id)?.effects);

export const activeChartEffects = (picks: readonly string[]): EffectDef[] =>
  collect(picks, (id) => CHART_NODE_BY_ID.get(id)?.effects);

export const activeModuleEffects = (modules: readonly string[]): EffectDef[] =>
  collect(modules, (id) => MODULE_BY_ID.get(id)?.effects);

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

export const buildPerkSource = (perks: readonly string[]): EffectSource =>
  source("perks", activePerkEffects(perks));

export const buildChartSource = (picks: readonly string[]): EffectSource =>
  source("chart", activeChartEffects(picks));

export const buildModuleSource = (modules: readonly string[]): EffectSource =>
  source("modules", activeModuleEffects(modules));

export const buildResonanceSource = (census: ResonanceCensus): EffectSource =>
  source("resonance", activeResonanceEffects(census));
