import { PERK_BY_ID } from "@/data/perks";
import {
  ZERO_PERK_MODS,
  type PerkMods,
  type PerkTrait,
} from "@/data/perks/types";

export const BASE_CHARGE_CAP = 10;

export const sumMods = (
  ids: readonly string[],
  modsOf: (id: string) => Partial<PerkMods> | undefined,
): PerkMods => {
  const mods: PerkMods = { ...ZERO_PERK_MODS };
  for (const id of ids) {
    const source = modsOf(id);
    if (source === undefined) continue;
    for (const key of Object.keys(mods) as (keyof PerkMods)[]) {
      mods[key] += source[key] ?? 0;
    }
  }
  return mods;
};

export const anyTrait = (
  ids: readonly string[],
  traitsOf: (id: string) => readonly PerkTrait[] | undefined,
  trait: PerkTrait,
): boolean => ids.some((id) => traitsOf(id)?.includes(trait) === true);

export const computePerkMods = (perks: readonly string[]): PerkMods =>
  sumMods(perks, (id) => PERK_BY_ID.get(id)?.mods);

export const perkChargeCap = (perks: readonly string[]): number =>
  BASE_CHARGE_CAP + computePerkMods(perks).chargeCapDelta;

export const hasTrait = (
  perks: readonly string[],
  trait: PerkTrait,
): boolean => anyTrait(perks, (id) => PERK_BY_ID.get(id)?.traits, trait);
