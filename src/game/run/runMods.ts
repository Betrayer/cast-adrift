import { CHART_NODE_BY_ID } from "@/data/chart";
import { MODULE_BY_ID } from "@/data/modules";
import { OFFICER_BY_ID } from "@/data/officers";
import {
  ZERO_PERK_MODS,
  type PerkMods,
  type PerkTrait,
} from "@/data/perks/types";
import {
  anyTrait,
  BASE_CHARGE_CAP,
  computePerkMods,
  hasTrait,
  sumMods,
} from "@/game/run/perkMods";

export const computeChartMods = (picks: readonly string[]): PerkMods =>
  sumMods(picks, (id) => CHART_NODE_BY_ID.get(id)?.mods);

export const computeModuleMods = (modules: readonly string[]): PerkMods =>
  sumMods(modules, (id) => MODULE_BY_ID.get(id)?.mods);

export const computeOfficerMods = (officers: readonly string[]): PerkMods =>
  sumMods(officers, (id) => OFFICER_BY_ID.get(id)?.passive);

export const computeRunMods = (
  perks: readonly string[],
  chartPicks: readonly string[] = [],
  modules: readonly string[] = [],
  officers: readonly string[] = [],
): PerkMods => {
  const perkMods = computePerkMods(perks);
  const chartMods = computeChartMods(chartPicks);
  const moduleMods = computeModuleMods(modules);
  const officerMods = computeOfficerMods(officers);
  const out: PerkMods = { ...ZERO_PERK_MODS };
  for (const key of Object.keys(out) as (keyof PerkMods)[]) {
    out[key] =
      perkMods[key] + chartMods[key] + moduleMods[key] + officerMods[key];
  }
  return out;
};

export const chartHasTrait = (
  chartPicks: readonly string[],
  trait: PerkTrait,
): boolean =>
  anyTrait(chartPicks, (id) => CHART_NODE_BY_ID.get(id)?.traits, trait);

export const moduleHasTrait = (
  modules: readonly string[],
  trait: PerkTrait,
): boolean => anyTrait(modules, (id) => MODULE_BY_ID.get(id)?.traits, trait);

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
  officers: readonly string[] = [],
): number =>
  BASE_CHARGE_CAP +
  computeRunMods(perks, chartPicks, modules, officers).chargeCapDelta;

export interface RunModSource {
  perks: readonly string[];
  chartPicks?: readonly string[];
  modules?: readonly string[];
  officers?: readonly string[];
}

export const sourceMods = (s: RunModSource): PerkMods =>
  computeRunMods(s.perks, s.chartPicks ?? [], s.modules ?? [], s.officers ?? []);

export const sourceTrait = (s: RunModSource, trait: PerkTrait): boolean =>
  runHasTrait(s.perks, s.chartPicks ?? [], trait, s.modules ?? []);
