import {
  applyDiscount,
  diePrice,
  ptsForDie,
} from "@/game/economy/prices";
import { rollDrop, type RarityWeights } from "@/game/economy/rewards";
import { createStream, deriveSeed } from "@/services/rng";

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
