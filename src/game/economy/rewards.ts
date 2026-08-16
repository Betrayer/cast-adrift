import { LOOT_DICE } from "@/data/dice";
import { MODULE_POOL } from "@/data/modules";
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

export const BATTLE_DROP_CHANCE = 0.45;

const RARITY_ORDER: readonly Rarity[] = [
  "legendary",
  "rare",
  "uncommon",
  "common",
];

export const LOOT_POOL: Record<Rarity, readonly string[]> = {
  common: LOOT_DICE.filter((d) => d.rarity === "common").map((d) => d.id),
  uncommon: LOOT_DICE.filter((d) => d.rarity === "uncommon").map((d) => d.id),
  rare: LOOT_DICE.filter((d) => d.rarity === "rare").map((d) => d.id),
  legendary: LOOT_DICE.filter((d) => d.rarity === "legendary").map((d) => d.id),
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

const RARITY_LADDER: readonly Rarity[] = [
  "common",
  "uncommon",
  "rare",
  "legendary",
];

export const shiftWeights = (
  weights: RarityWeights,
  step: number,
): RarityWeights => {
  if (step <= 0) return weights;
  const out: RarityWeights = {
    common: 0,
    uncommon: 0,
    rare: 0,
    legendary: 0,
  };
  for (let i = 0; i < RARITY_LADDER.length; i += 1) {
    const from = RARITY_LADDER[i];
    if (from === undefined) continue;
    const target =
      RARITY_LADDER[Math.min(RARITY_LADDER.length - 1, i + step)] ?? "legendary";
    out[target] += weights[from];
  }
  return out;
};

export const bumpRarity = (rarity: Rarity, step: number): Rarity => {
  const index = RARITY_LADDER.indexOf(rarity);
  if (index < 0) return rarity;
  return (
    RARITY_LADDER[
      Math.min(RARITY_LADDER.length - 1, index + Math.max(0, step))
    ] ?? rarity
  );
};

export const rollDrop = (
  rng: RngStream,
  weights: RarityWeights,
  rarityStep = 0,
): string => {
  const table = shiftWeights(weights, rarityStep);
  const rarity = rng.weighted([
    ["common", table.common],
    ["uncommon", table.uncommon],
    ["rare", table.rare],
    ["legendary", table.legendary],
  ] as const);
  return rng.pick(poolForRarity(rarity));
};

export const dieForRarity = (
  rng: RngStream,
  rarity: Rarity,
  rarityStep = 0,
): string => rng.pick(poolForRarity(bumpRarity(rarity, rarityStep)));

export const POCKET_SCRAP_MULT = 1.5;
export const POCKET_RARITY_STEP = 1;

export const computeNodeReward = (
  type: NodeType,
  rng: RngStream,
  rarityStep = 0,
  pocket = false,
): NodeReward => {
  const step = rarityStep + (pocket ? POCKET_RARITY_STEP : 0);
  const scrap = (n: number): number =>
    pocket ? Math.round(n * POCKET_SCRAP_MULT) : n;
  switch (type) {
    case "battle":
      return {
        scrap: scrap(rng.int(12, 20)),
        dieDrop:
          rng.next() < BATTLE_DROP_CHANCE
            ? rollDrop(rng, DROP_WEIGHTS.battle, step)
            : null,
      };
    case "elite":
    case "miniboss":
      return {
        scrap: scrap(rng.int(45, 60)),
        dieDrop: rollDrop(rng, DROP_WEIGHTS.elite, step),
      };
    case "boss":
      return {
        scrap: 80,
        dieDrop: rollDrop(rng, DROP_WEIGHTS.boss, step),
      };
    default:
      return { scrap: 0, dieDrop: null };
  }
};

const MODULE_LADDER: readonly Rarity[] = [
  "common",
  "uncommon",
  "rare",
  "legendary",
];

export const rollModule = (
  rng: RngStream,
  owned: readonly string[],
  floor: Rarity = "common",
): string => {
  const start = Math.max(0, MODULE_LADDER.indexOf(floor));
  const tiers = MODULE_LADDER.slice(start);
  const weights: [Rarity, number][] = tiers.map((r, i) => [
    r,
    [55, 33, 10, 2][i + start] ?? 2,
  ]);
  const rarity = rng.weighted(weights);
  const available = (r: Rarity): string[] =>
    MODULE_POOL[r].filter((id) => !owned.includes(id));
  const pool = available(rarity);
  if (pool.length > 0) return rng.pick(pool);
  for (const r of MODULE_LADDER) {
    const fallback = available(r);
    if (fallback.length > 0) return rng.pick(fallback);
  }
  return rng.pick(MODULE_POOL.common);
};

export const isDraftNode = (type: NodeType): boolean =>
  type === "elite" || type === "miniboss" || type === "boss";
