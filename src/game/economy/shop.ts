import { MODULE_BY_ID, MODULE_POOL } from "@/data/modules";
import {
  applyDiscount,
  diePrice,
  ptsForDie,
} from "@/game/economy/prices";
import { rollDrop, type RarityWeights } from "@/game/economy/rewards";
import { createStream, deriveSeed } from "@/services/rng";
import type { LocKey, Rarity } from "@/types/content";
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

export interface ShopFlagRule {
  key: string;
  pct: number;
  consequence?: LocKey;
}

export const SHOP_FLAG_RULES: readonly ShopFlagRule[] = [
  { key: "maraFriend", pct: 15, consequence: "content:consequence.maraFriend" },
  { key: "maraGrudge", pct: -20, consequence: "content:consequence.maraGrudge" },
  { key: "maraDebt", pct: -12, consequence: "content:consequence.maraDebtShop" },
  { key: "courtFair", pct: 10, consequence: "content:consequence.courtFairShop" },
  { key: "vaultKept", pct: 12, consequence: "content:consequence.vaultKeptShop" },
  { key: "ledgerSolved", pct: 8, consequence: "content:consequence.ledgerShop" },
  { key: "beaconRebuilt", pct: 10, consequence: "content:consequence.beaconRebuiltShop" },
];

export const COURIER_DISCOUNT_PCT = 20;

export const flagShopDiscount = (
  flags: Record<string, FlagValue>,
): number => {
  let pct = SHOP_FLAG_RULES.reduce(
    (sum, rule) => (flags[rule.key] === undefined ? sum : sum + rule.pct),
    0,
  );
  const courier = flags.courierDiscount;
  if (typeof courier === "number" && courier > 0) pct += COURIER_DISCOUNT_PCT;
  return pct;
};

export const flagShopConsequence = (
  flags: Record<string, FlagValue>,
): string | null => {
  const rule = SHOP_FLAG_RULES.find(
    (r) => flags[r.key] !== undefined && r.consequence !== undefined,
  );
  if (rule?.consequence !== undefined) return rule.consequence;
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
