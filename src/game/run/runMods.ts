import { CHART_NODE_BY_ID } from "@/data/chart";
import { MODULE_BY_ID } from "@/data/modules";
import {
  ZERO_PERK_MODS,
  type PerkMods,
  type PerkTrait,
} from "@/data/perks/types";
import {
  BASE_CHARGE_CAP,
  computePerkMods,
  hasTrait,
} from "@/game/run/perkMods";

export const computeChartMods = (picks: readonly string[]): PerkMods => {
  const mods: PerkMods = { ...ZERO_PERK_MODS };
  for (const id of picks) {
    const def = CHART_NODE_BY_ID.get(id);
    if (def?.mods === undefined) continue;
    for (const key of Object.keys(mods) as (keyof PerkMods)[]) {
      mods[key] += def.mods[key] ?? 0;
    }
  }
  return mods;
};

export const computeModuleMods = (modules: readonly string[]): PerkMods => {
  const mods: PerkMods = { ...ZERO_PERK_MODS };
  for (const id of modules) {
    const def = MODULE_BY_ID.get(id);
    if (def?.mods === undefined) continue;
    for (const key of Object.keys(mods) as (keyof PerkMods)[]) {
      mods[key] += def.mods[key] ?? 0;
    }
  }
  return mods;
};

export const computeRunMods = (
  perks: readonly string[],
  chartPicks: readonly string[] = [],
  modules: readonly string[] = [],
): PerkMods => {
  const perkMods = computePerkMods(perks);
  const chartMods = computeChartMods(chartPicks);
  const moduleMods = computeModuleMods(modules);
  const out: PerkMods = { ...ZERO_PERK_MODS };
  for (const key of Object.keys(out) as (keyof PerkMods)[]) {
    out[key] = perkMods[key] + chartMods[key] + moduleMods[key];
  }
  return out;
};

export const chartHasTrait = (
  chartPicks: readonly string[],
  trait: PerkTrait,
): boolean =>
  chartPicks.some(
    (id) => CHART_NODE_BY_ID.get(id)?.traits?.includes(trait) === true,
  );

export const moduleHasTrait = (
  modules: readonly string[],
  trait: PerkTrait,
): boolean =>
  modules.some((id) => MODULE_BY_ID.get(id)?.traits?.includes(trait) === true);

export const runHasTrait = (
  perks: readonly string[],
  chartPicks: readonly string[],
  trait: PerkTrait,
  modules: readonly string[] = [],
): boolean =>
  hasTrait(perks, trait) ||
  chartHasTrait(chartPicks, trait) ||
  moduleHasTrait(modules, trait);

export const runChargeCap = (
  perks: readonly string[],
  chartPicks: readonly string[] = [],
  modules: readonly string[] = [],
): number =>
  BASE_CHARGE_CAP + computeRunMods(perks, chartPicks, modules).chargeCapDelta;

export interface RunModSource {
  perks: readonly string[];
  chartPicks?: readonly string[];
  modules?: readonly string[];
}

export const sourceMods = (s: RunModSource): PerkMods =>
  computeRunMods(s.perks, s.chartPicks ?? [], s.modules ?? []);

export const sourceTrait = (s: RunModSource, trait: PerkTrait): boolean =>
  runHasTrait(s.perks, s.chartPicks ?? [], trait, s.modules ?? []);
