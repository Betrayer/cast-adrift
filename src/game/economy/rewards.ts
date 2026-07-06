import { DIE_ITEMS } from "@/data/dice";
import type { NodeType } from "@/game/map/types";
import type { RngStream } from "@/services/rng";
import type { Rarity } from "@/types/content";

export interface NodeReward {
  scrap: number;
  dieDrop: string | null;
}

export type RarityWeights = Record<Rarity, number>;

export const DROP_WEIGHTS: Record<"battle" | "elite" | "boss", RarityWeights> = {
  battle: { common: 60, uncommon: 28, rare: 10, legendary: 2 },
  elite: { common: 30, uncommon: 42, rare: 24, legendary: 4 },
  boss: { common: 0, uncommon: 0, rare: 80, legendary: 20 },
};

export const BATTLE_DROP_CHANCE = 0.35;

const RARITY_ORDER: readonly Rarity[] = [
  "legendary",
  "rare",
  "uncommon",
  "common",
];

export const LOOT_POOL: Record<Rarity, readonly string[]> = {
  common: DIE_ITEMS.filter((d) => d.rarity === "common").map((d) => d.id),
  uncommon: DIE_ITEMS.filter((d) => d.rarity === "uncommon").map((d) => d.id),
  rare: DIE_ITEMS.filter((d) => d.rarity === "rare").map((d) => d.id),
  legendary: DIE_ITEMS.filter((d) => d.rarity === "legendary").map((d) => d.id),
};

const poolForRarity = (rarity: Rarity): readonly string[] => {
  if (LOOT_POOL[rarity].length > 0) return LOOT_POOL[rarity];
  const start = RARITY_ORDER.indexOf(rarity);
  for (let i = start + 1; i < RARITY_ORDER.length; i += 1) {
    const fallback = RARITY_ORDER[i];
    if (fallback !== undefined && LOOT_POOL[fallback].length > 0) {
      return LOOT_POOL[fallback];
    }
  }
  return LOOT_POOL.common;
};

export const rollDrop = (rng: RngStream, weights: RarityWeights): string => {
  const rarity = rng.weighted([
    ["common", weights.common],
    ["uncommon", weights.uncommon],
    ["rare", weights.rare],
    ["legendary", weights.legendary],
  ] as const);
  return rng.pick(poolForRarity(rarity));
};

export const computeNodeReward = (
  type: NodeType,
  rng: RngStream,
): NodeReward => {
  switch (type) {
    case "battle":
      return {
        scrap: rng.int(12, 20),
        dieDrop:
          rng.next() < BATTLE_DROP_CHANCE
            ? rollDrop(rng, DROP_WEIGHTS.battle)
            : null,
      };
    case "elite":
    case "miniboss":
      return {
        scrap: rng.int(45, 60),
        dieDrop: rollDrop(rng, DROP_WEIGHTS.elite),
      };
    case "boss":
      return { scrap: 80, dieDrop: rollDrop(rng, DROP_WEIGHTS.boss) };
    default:
      return { scrap: 0, dieDrop: null };
  }
};

export const isDraftNode = (type: NodeType): boolean =>
  type === "elite" || type === "miniboss" || type === "boss";
