import { DIE_BY_ID } from "@/data/dice";
import { DIE_PTS } from "@/data/tiers";
import { dieTier, forgeLevel, type HandDie } from "@/game/dice/tier";
import { ascensionMods } from "@/data/ascension";
import { nextMkLevel, type MkLevel } from "@/data/slots";
import type { SlotId } from "@/types/battle";

export const SHOP_REROLL_COST = 10;
export const FUSION_COST = 40;
export const REPAIR_PER_HULL = 2;
export const HAND_CAP = 15;
export const TABLE_SIZE = 7;

export const MK_TOP: MkLevel = 3;

export const mkTopFor = (slotId: SlotId, ascension: number): MkLevel => {
  const delta = slotId === "sensors" ? ascensionMods(ascension).sensorsMkCapDelta : 0;
  const top = Math.max(1, Math.min(MK_TOP, MK_TOP + delta));
  return top === 1 ? 1 : top === 2 ? 2 : 3;
};

export const nextMkFor = (
  slotId: SlotId,
  mk: MkLevel,
  ascension: number,
): Exclude<MkLevel, 1> | null =>
  mk >= mkTopFor(slotId, ascension) ? null : nextMkLevel(mk);

export const MK_COST: Record<Exclude<MkLevel, 1>, number> = {
  2: 60,
  3: 130,
};

export const diePriceBase = (pts: number): number => 35 + pts * 12;

export const diePrice = (pts: number, jitter: number): number =>
  Math.max(1, diePriceBase(pts) + jitter);

export const MAX_SHOP_DISCOUNT_PCT = 40;

export const MAX_SHOP_MARKUP_PCT = 100;

export const clampDiscount = (discountPct: number): number =>
  Math.max(-MAX_SHOP_MARKUP_PCT, Math.min(MAX_SHOP_DISCOUNT_PCT, discountPct));

export const applyDiscount = (price: number, discountPct: number): number =>
  Math.max(1, Math.round(price * (1 - clampDiscount(discountPct) / 100)));

export const sellValue = (pts: number): number => pts * 8;

export const moduleSellValue = (price: number): number =>
  Math.max(1, Math.floor(price * 0.5));

export const BAY_PRICE_BASE = 90;

export const BAY_PRICE_STEP = 30;

export const bayPrice = (sector: number): number =>
  BAY_PRICE_BASE + BAY_PRICE_STEP * (Math.max(1, sector) - 1);

export const ptsForDie = (defId: string): number =>
  DIE_BY_ID.get(defId)?.pts ?? 0;

export const ptsForInstance = (die: HandDie): number =>
  forgeLevel(die) === 0 ? ptsForDie(die.defId) : DIE_PTS[dieTier(die)];

export const instanceSellValue = (die: HandDie): number =>
  sellValue(ptsForInstance(die));

export const repairCost = (hullPoints: number): number =>
  Math.max(0, hullPoints) * REPAIR_PER_HULL;

export const mkUpgradeCost = (target: Exclude<MkLevel, 1>): number =>
  MK_COST[target];

export const MK_COST_FLOOR = 1;

export const discountedMkCost = (
  target: Exclude<MkLevel, 1>,
  discount: number,
): number => Math.max(MK_COST_FLOOR, mkUpgradeCost(target) - discount);

export const MINIBOSS_PACKAGE_SCRAP: readonly [number, number] = [30, 40];
