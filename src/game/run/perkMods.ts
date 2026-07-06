import { PERK_BY_ID } from "@/data/perks";
import {
  ZERO_PERK_MODS,
  type PerkMods,
  type PerkTrait,
} from "@/data/perks/types";

export const BASE_CHARGE_CAP = 10;

export const computePerkMods = (perks: readonly string[]): PerkMods => {
  const mods: PerkMods = { ...ZERO_PERK_MODS };
  for (const id of perks) {
    const def = PERK_BY_ID.get(id);
    if (def?.mods === undefined) continue;
    for (const key of Object.keys(mods) as (keyof PerkMods)[]) {
      mods[key] += def.mods[key] ?? 0;
    }
  }
  return mods;
};

export const perkChargeCap = (perks: readonly string[]): number =>
  BASE_CHARGE_CAP + computePerkMods(perks).chargeCapDelta;

export const hasTrait = (
  perks: readonly string[],
  trait: PerkTrait,
): boolean =>
  perks.some((id) => PERK_BY_ID.get(id)?.traits?.includes(trait) === true);
