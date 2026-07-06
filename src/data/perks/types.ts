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
  | "dodgeCharge";

export interface PerkMods {
  rerollSizeDelta: number;
  reserveDelta: number;
  blueReserveDelta: number;
  nudgeCostDelta: number;
  shopDiscountPct: number;
  scrapMultPct: number;
  chargeCapDelta: number;
  hullMaxDelta: number;
  enginesThresholdDelta: number;
  markBonusDelta: number;
  jamPowerDelta: number;
  growthCapDelta: number;
  battleStartScrap: number;
  battleEndHeal: number;
}

export interface PerkDef {
  id: string;
  name: LocKey;
  desc: LocKey;
  rarity: PerkRarity;
  pool: PerkPool;
  effects?: readonly EffectDef[];
  mods?: Partial<PerkMods>;
  traits?: readonly PerkTrait[];
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
  enginesThresholdDelta: 0,
  markBonusDelta: 0,
  jamPowerDelta: 0,
  growthCapDelta: 0,
  battleStartScrap: 0,
  battleEndHeal: 0,
};
