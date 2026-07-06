import { DIE_BY_ID } from "@/data/dice";
import type { MkLevel } from "@/data/slots";

export const SHOP_REROLL_COST = 10;
export const FUSION_COST = 40;
export const REPAIR_PER_HULL = 2;
export const DECK_CAP = 9;

export const MK_COST: Record<Exclude<MkLevel, 1>, number> = {
  2: 60,
  3: 130,
};

export const diePriceBase = (pts: number): number => 35 + pts * 12;

export const diePrice = (pts: number, jitter: number): number =>
  Math.max(1, diePriceBase(pts) + jitter);

export const applyDiscount = (price: number, discountPct: number): number =>
  Math.max(1, Math.round(price * (1 - discountPct / 100)));

export const sellValue = (pts: number): number => pts * 8;

export const ptsForDie = (defId: string): number =>
  DIE_BY_ID.get(defId)?.pts ?? 0;

export const repairCost = (hullPoints: number): number =>
  Math.max(0, hullPoints) * REPAIR_PER_HULL;

export const mkUpgradeCost = (target: Exclude<MkLevel, 1>): number =>
  MK_COST[target];
