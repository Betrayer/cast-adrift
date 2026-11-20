import type { ShipId } from "@/data/ships";

export const MASTERY_RANK_XP = [0, 60, 160, 320, 560, 900] as const;

export const MASTERY_MAX_RANK = MASTERY_RANK_XP.length - 1;

export const MASTERY_PASSIVE_RANK = 5;

export const MASTERY_XP = {
  sectorCleared: 20,
  eliteOrMiniboss: 6,
  boss: 25,
  campaignWon: 60,
  runEnded: 5,
} as const;

export interface ShipMasteryTable {
  hull: number;
  reserve: number;
  firstMkDiscountPct: number;
  firstHitReducePct: number;
}

export type MasteredShipId = Exclude<ShipId, "ram-proto">;

export const SHIP_MASTERY: Readonly<Record<MasteredShipId, ShipMasteryTable>> = {
  wanderer: { hull: 1, reserve: 1, firstMkDiscountPct: 20, firstHitReducePct: 25 },
  ram: { hull: 1, reserve: 1, firstMkDiscountPct: 20, firstHitReducePct: 30 },
  ark: { hull: 1, reserve: 1, firstMkDiscountPct: 24, firstHitReducePct: 30 },
  corsair: { hull: 1, reserve: 1, firstMkDiscountPct: 16, firstHitReducePct: 20 },
  foundry: { hull: 1, reserve: 1, firstMkDiscountPct: 24, firstHitReducePct: 30 },
  prism: { hull: 1, reserve: 1, firstMkDiscountPct: 20, firstHitReducePct: 25 },
};

export const masteryTableOf = (shipId: ShipId): ShipMasteryTable | undefined =>
  shipId === "ram-proto" ? undefined : SHIP_MASTERY[shipId];

export const masteryRankOf = (xp: number): number => {
  let rank = 0;
  for (let next = 1; next <= MASTERY_MAX_RANK; next += 1) {
    if (xp < (MASTERY_RANK_XP[next] ?? Infinity)) break;
    rank = next;
  }
  return rank;
};

export const nextMasteryRankXp = (xp: number): number | null =>
  MASTERY_RANK_XP[masteryRankOf(xp) + 1] ?? null;
