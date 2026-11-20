import {
  SHIP_PERK_IDS,
  SHIP_PERK_MK,
  SHIP_PERK_NEEDS_SLOT,
} from "@/data/perks/ship";
import { masteryTableOf } from "@/data/shipMastery";
import {
  SHIP_DRAFT_CARDS,
  SHIP_RANK_MAX,
  shipRankOf,
  SHIP_DRAFT_REROLL_MASTERY,
  SHIP_DRAFT_WIDE_CARDS,
  SHIP_DRAFT_WIDE_MASTERY,
} from "@/data/shipRanks";
import { SHIP_BY_ID, type ShipId } from "@/data/ships";
import type { MkLevel } from "@/data/slots";
import { MK_COST, nextMkFor } from "@/game/economy/prices";
import { createStream } from "@/services/rng";
import type { SlotId } from "@/types/battle";

const FIRST_MK_RANK = 3;

export const firstMkDiscount = (shipId: ShipId, rank: number): number => {
  const table = masteryTableOf(shipId);
  if (table === undefined || rank < FIRST_MK_RANK) return 0;
  return Math.round((MK_COST[2] * table.firstMkDiscountPct) / 100);
};

export const shipDraftSize = (masteryRank: number): number =>
  masteryRank >= SHIP_DRAFT_WIDE_MASTERY ? SHIP_DRAFT_WIDE_CARDS : SHIP_DRAFT_CARDS;

export const shipDraftRerollAllowed = (masteryRank: number): boolean =>
  masteryRank >= SHIP_DRAFT_REROLL_MASTERY;

export const rankXpCounts = (
  xp: number,
  pendingRankUps: number,
  perksDisabled: boolean,
): boolean => !perksDisabled && (shipRankOf(xp) < SHIP_RANK_MAX || pendingRankUps > 0);

export interface ShipDraftContext {
  shipId: ShipId;
  mkLevels: Partial<Record<SlotId, MkLevel>>;
  ascension: number;
  disabledSlots: readonly SlotId[];
}

export const shipPerkAvailable = (ctx: ShipDraftContext, perkId: string): boolean => {
  const slots = SHIP_BY_ID.get(ctx.shipId)?.slots ?? {};
  const usable = (slot: SlotId): boolean =>
    slots[slot] !== undefined && !ctx.disabledSlots.includes(slot);
  const needs = SHIP_PERK_NEEDS_SLOT[perkId];
  if (needs !== undefined && !needs.some(usable)) return false;
  const mkSlot = SHIP_PERK_MK[perkId];
  if (mkSlot === undefined) return true;
  const mk = ctx.mkLevels[mkSlot] ?? slots[mkSlot]?.mk ?? 1;
  return usable(mkSlot) && nextMkFor(mkSlot, mk, ctx.ascension) !== null;
};

export const rollShipDraft = (
  ctx: ShipDraftContext,
  owned: readonly string[],
  size: number,
  seed: number,
): string[] => {
  const stream = createStream(seed);
  const pool = SHIP_PERK_IDS.filter(
    (id) => !owned.includes(id) && shipPerkAvailable(ctx, id),
  );
  return stream.shuffle([...pool]).slice(0, size);
};
