import { DIE_BY_ID } from "@/data/dice";
import type { Rarity } from "@/types/content";

export const META_DIE_PRICE: Record<Rarity, number> = {
  common: 100,
  uncommon: 180,
  rare: 280,
  legendary: 420,
};

export const metaDiePrice = (defId: string): number => {
  const rarity = DIE_BY_ID.get(defId)?.rarity ?? "common";
  return META_DIE_PRICE[rarity];
};

export const diePoints = (defId: string): number => {
  const def = DIE_BY_ID.get(defId);
  if (def === undefined) return 0;
  return def.pts + (def.school === "prismatic" ? 1 : 0);
};

export const deckPoints = (deck: readonly string[]): number =>
  deck.reduce((sum, id) => sum + diePoints(id), 0);

export const FATE_TIER = 100;
export const DECK_MIN = 3;

export const FIRST_FIND_SHARDS: Record<Rarity, number> = {
  common: 8,
  uncommon: 14,
  rare: 22,
  legendary: 34,
};

export const ENCOUNTER_DISCOUNT_PCT = 30;

export const encounteredDiePrice = (defId: string): number =>
  Math.round((metaDiePrice(defId) * (100 - ENCOUNTER_DISCOUNT_PCT)) / 100);
