import { ALL_PERKS, PERK_BY_ID } from "../../src/data/perks";
import type { PerkDef, PerkMods } from "../../src/data/perks/types";
import { loadoutCensus, type TagCensus } from "../../src/game/effects/census";
import {
  DRAFT_REROLL_COST,
  skipScrapFor,
} from "../../src/game/run/perkDraft";
import { computePerkMods } from "../../src/game/run/perkMods";

export interface DraftLoadout {
  deckDefIds: readonly string[];
  perks: readonly string[];
  modules: readonly string[];
}

const RARITY_VALUE: Record<string, number> = {
  common: 1,
  uncommon: 2,
  rare: 3.5,
};

const SYNERGY_TAG_VALUE = 0.9;
const OWN_TAG_VALUE = 0.35;
const TAG_COUNT_CAP = 4;
const POOL_MATCH_VALUE = 0.5;
const TRAIT_VALUE = 1.2;
const EFFECT_VALUE = 0.6;

const MOD_WEIGHTS: Partial<Record<keyof PerkMods, number>> = {
  hullMaxDelta: 0.18,
  hullMaxPct: 0.09,
  battleEndHeal: 0.5,
  scrapMultPct: 0.06,
  chargeCapDelta: 0.15,
  extraRerolls: 0.7,
  reserveDelta: 0.6,
  blueReserveDelta: 0.3,
  markBonusDelta: 0.5,
  jamPowerDelta: 0.3,
  evasionDelta: 0.05,
  growthCapDelta: 0.25,
  scrapPerKill: 0.25,
  setCompleteCharge: 0.2,
  battleStartScrap: 0.1,
  tideEffectDelta: -0.9,
  nudgeCostDelta: -0.7,
  moduleSlotDelta: 1.5,
  shopDiscountPct: 0.05,
  freeShopRerolls: 0.2,
  rerollSizeDelta: 0.4,
  xpMultPct: 0,
};

const modScore = (def: PerkDef): number => {
  const mods = computePerkMods([def.id]);
  let score = 0;
  for (const [key, weight] of Object.entries(MOD_WEIGHTS)) {
    score += mods[key as keyof PerkMods] * (weight ?? 0);
  }
  return score;
};

const deckSchoolShare = (
  deckDefIds: readonly string[],
  pool: PerkDef["pool"],
  schoolOf: (defId: string) => string | undefined,
): number => {
  if (pool === "systems") return 1;
  const matches = deckDefIds.filter((defId) => {
    const school = schoolOf(defId);
    return school === pool || school === "prismatic";
  }).length;
  return matches / Math.max(1, deckDefIds.length);
};

export const perkValue = (
  def: PerkDef,
  census: TagCensus,
  loadout: DraftLoadout,
  schoolOf: (defId: string) => string | undefined,
): number => {
  const synergy = (def.synergy ?? []).reduce(
    (sum, tag) => sum + Math.min(census[tag] ?? 0, TAG_COUNT_CAP) * SYNERGY_TAG_VALUE,
    0,
  );
  const own = (def.tags ?? []).reduce(
    (sum, tag) => sum + Math.min(census[tag] ?? 0, TAG_COUNT_CAP) * OWN_TAG_VALUE,
    0,
  );
  return (
    (RARITY_VALUE[def.rarity] ?? 1) +
    synergy +
    own +
    deckSchoolShare(loadout.deckDefIds, def.pool, schoolOf) * POOL_MATCH_VALUE +
    (def.traits?.length ?? 0) * TRAIT_VALUE +
    (def.effects?.length ?? 0) * EFFECT_VALUE +
    modScore(def)
  );
};

export interface DraftVerdict {
  pick?: string;
  banish?: string;
  reroll: boolean;
  skip: boolean;
  spent: number;
  gained: number;
}

export interface DraftBudget {
  scrap: number;
  sector: number;
  banishLeft: number;
  rerollLeft: number;
}

export const REROLL_VALUE_RATIO = 0.75;
export const BANISH_VALUE_RATIO = 0.6;
export const SKIP_VALUE_RATIO = 0.55;

const medianValue = (values: readonly number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
    : (sorted[mid] ?? 0);
};

const poolBaseline = (
  census: TagCensus,
  loadout: DraftLoadout,
  schoolOf: (defId: string) => string | undefined,
): number =>
  medianValue(ALL_PERKS.map((def) => perkValue(def, census, loadout, schoolOf)));

export const rankChoices = (
  choices: readonly string[],
  census: TagCensus,
  loadout: DraftLoadout,
  schoolOf: (defId: string) => string | undefined,
): { id: string; value: number }[] =>
  choices
    .map((id) => PERK_BY_ID.get(id))
    .filter((def): def is PerkDef => def !== undefined)
    .map((def) => ({ id: def.id, value: perkValue(def, census, loadout, schoolOf) }))
    .sort((a, b) => b.value - a.value);

export const decideDraft = (
  choices: readonly string[],
  loadout: DraftLoadout,
  budget: DraftBudget,
  schoolOf: (defId: string) => string | undefined,
): DraftVerdict => {
  const census = loadoutCensus({
    deckDefIds: loadout.deckDefIds,
    perks: loadout.perks,
    modules: loadout.modules,
  });
  const ranked = rankChoices(choices, census, loadout, schoolOf);
  const best = ranked[0];
  const worst = ranked[ranked.length - 1];
  if (best === undefined) {
    return { reroll: false, skip: false, spent: 0, gained: 0 };
  }

  const baseline = poolBaseline(census, loadout, schoolOf);
  if (
    best.value < baseline * REROLL_VALUE_RATIO &&
    budget.rerollLeft > 0 &&
    budget.scrap >= DRAFT_REROLL_COST
  ) {
    return {
      reroll: true,
      skip: false,
      spent: DRAFT_REROLL_COST,
      gained: 0,
    };
  }

  if (best.value < baseline * SKIP_VALUE_RATIO) {
    return {
      reroll: false,
      skip: true,
      spent: 0,
      gained: skipScrapFor(budget.sector),
    };
  }

  const banish =
    budget.banishLeft > 0 &&
    worst !== undefined &&
    worst.id !== best.id &&
    worst.value < baseline * BANISH_VALUE_RATIO
      ? worst.id
      : undefined;

  return {
    pick: best.id,
    ...(banish === undefined ? {} : { banish }),
    reroll: false,
    skip: false,
    spent: 0,
    gained: 0,
  };
};
