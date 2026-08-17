import type { ContentTag } from "@/data/tags";
import type { EffectDef } from "@/game/effects/types";
import type { LocKey, Rarity } from "@/types/content";

export type PerkPool =
  | "red"
  | "blue"
  | "green"
  | "yellow"
  | "black"
  | "grey"
  | "systems";

export type PerkRarity = Extract<Rarity, "common" | "uncommon" | "rare">;

export type PerkTrait =
  | "bloodReactor"
  | "sacrifice"
  | "ricochet"
  | "burnDouble"
  | "stabilizer"
  | "spareLowest"
  | "compost"
  | "reflectDodge"
  | "dodgeCharge"
  | "singleCast"
  | "coldLogic"
  | "obsidianPact"
  | "overflowShield"
  | "firstHitPierce"
  | "escapePod"
  | "recycler"
  | "fateTwice"
  | "prismDouble";

export interface PerkMods {
  rerollSizeDelta: number;
  reserveDelta: number;
  blueReserveDelta: number;
  nudgeCostDelta: number;
  shopDiscountPct: number;
  scrapMultPct: number;
  chargeCapDelta: number;
  hullMaxDelta: number;
  hullMaxPct: number;
  evasionDelta: number;
  markBonusDelta: number;
  jamPowerDelta: number;
  growthCapDelta: number;
  battleStartScrap: number;
  battleEndHeal: number;
  extraRerolls: number;
  scrapPerKill: number;
  setCompleteCharge: number;
  freeShopRerolls: number;
  xpMultPct: number;
  tideEffectDelta: number;
  moduleSlotDelta: number;
}

export type PerkSynergy = readonly ContentTag[];

export interface PerkDef {
  id: string;
  name: LocKey;
  desc: LocKey;
  rarity: PerkRarity;
  pool: PerkPool;
  effects?: readonly EffectDef[];
  mods?: Partial<PerkMods>;
  traits?: readonly PerkTrait[];
  synergy?: PerkSynergy;
  tags?: readonly ContentTag[];
}

export const ZERO_PERK_MODS: PerkMods = {
  rerollSizeDelta: 0,
  reserveDelta: 0,
  blueReserveDelta: 0,
  nudgeCostDelta: 0,
  shopDiscountPct: 0,
  scrapMultPct: 0,
  chargeCapDelta: 0,
  hullMaxDelta: 0,
  hullMaxPct: 0,
  evasionDelta: 0,
  markBonusDelta: 0,
  jamPowerDelta: 0,
  growthCapDelta: 0,
  battleStartScrap: 0,
  battleEndHeal: 0,
  extraRerolls: 0,
  scrapPerKill: 0,
  setCompleteCharge: 0,
  freeShopRerolls: 0,
  xpMultPct: 0,
  tideEffectDelta: 0,
  moduleSlotDelta: 0,
};
