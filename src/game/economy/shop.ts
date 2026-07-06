import {
  applyDiscount,
  diePrice,
  ptsForDie,
} from "@/game/economy/prices";
import { rollDrop, type RarityWeights } from "@/game/economy/rewards";
import { createStream, deriveSeed } from "@/services/rng";
import type { FlagValue } from "@/types/events";

export interface ShopItem {
  defId: string;
  price: number;
  sold: boolean;
}

export interface ShopState {
  nodeId: string;
  rerolls: number;
  items: ShopItem[];
}

export const SHOP_SIZE = 3;

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
