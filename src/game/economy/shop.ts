import { MODULE_BY_ID, MODULE_POOL } from "@/data/modules";
import {
  applyDiscount,
  diePrice,
  ptsForDie,
} from "@/game/economy/prices";
import { rollDrop, type RarityWeights } from "@/game/economy/rewards";
import { createStream, deriveSeed } from "@/services/rng";
import type { Rarity } from "@/types/content";
import type { FlagValue } from "@/types/events";

export interface ShopItem {
  defId: string;
  price: number;
  sold: boolean;
}

export interface ShopModuleItem {
  moduleId: string;
  price: number;
  sold: boolean;
}

export interface ShopState {
  nodeId: string;
  rerolls: number;
  items: ShopItem[];
  modules: ShopModuleItem[];
}

export const SHOP_SIZE = 3;
export const SHOP_MODULE_WEIGHTS: readonly (readonly [Rarity, number])[] = [
  ["common", 50],
  ["uncommon", 35],
  ["rare", 12],
  ["legendary", 3],
];

export const SHOP_WEIGHTS: RarityWeights = {
  common: 45,
  uncommon: 38,
  rare: 14,
  legendary: 3,
};

// Callback consumer (DESIGN §3): Mara remembers what you did at the Rim, and a
// freed courier's route pays off. Positive = cheaper stock.
export const flagShopDiscount = (
  flags: Record<string, FlagValue>,
): number => {
  let pct = 0;
  if (flags.maraFriend !== undefined) pct += 15;
  if (flags.maraGrudge !== undefined) pct -= 20;
  const courier = flags.courierDiscount;
  if (typeof courier === "number" && courier > 0) pct += 20;
  return pct;
};

export const flagShopConsequence = (
  flags: Record<string, FlagValue>,
): string | null => {
  if (flags.maraFriend !== undefined) return "content:consequence.maraFriend";
  if (flags.maraGrudge !== undefined) return "content:consequence.maraGrudge";
  const courier = flags.courierDiscount;
  if (typeof courier === "number" && courier > 0)
    return "content:consequence.courierFreed";
  return null;
};

export const generateShopStock = (
  seed: number,
  nodeId: string,
  rerolls: number,
  discountPct: number,
): ShopItem[] => {
  const rng = createStream(
    deriveSeed(seed, `shop:${nodeId}:${String(rerolls)}`),
  );
  const items: ShopItem[] = [];
  for (let i = 0; i < SHOP_SIZE; i += 1) {
    const defId = rollDrop(rng, SHOP_WEIGHTS);
    const jitter = rng.int(0, 8) - 4;
    const price = applyDiscount(diePrice(ptsForDie(defId), jitter), discountPct);
    items.push({ defId, price, sold: false });
  }
  return items;
};

// Every shop carries one or two modules (DESIGN §9.4) on its own stream, so
// adding modules never shifts the dice a saved run already rolled.
export const generateShopModules = (
  seed: number,
  nodeId: string,
  rerolls: number,
  discountPct: number,
): ShopModuleItem[] => {
  const rng = createStream(
    deriveSeed(seed, `shopmod:${nodeId}:${String(rerolls)}`),
  );
  const count = rng.int(1, 2);
  const items: ShopModuleItem[] = [];
  const taken = new Set<string>();
  for (let i = 0; i < count; i += 1) {
    const rarity = rng.weighted(SHOP_MODULE_WEIGHTS);
    const pool = MODULE_POOL[rarity].filter((id) => !taken.has(id));
    const fallback = MODULE_POOL.common.filter((id) => !taken.has(id));
    const source = pool.length > 0 ? pool : fallback;
    if (source.length === 0) break;
    const moduleId = rng.pick(source);
    taken.add(moduleId);
    const base = MODULE_BY_ID.get(moduleId)?.price ?? 60;
    items.push({
      moduleId,
      price: applyDiscount(base + rng.int(0, 8) - 4, discountPct),
      sold: false,
    });
  }
  return items;
};
