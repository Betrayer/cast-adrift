import type { PerkMods, PerkTrait } from "@/data/perks/types";
import type { ContentTag } from "@/data/tags";
import type { EffectDef } from "@/game/effects/types";
import type { SlotId } from "@/types/battle";
import type { LocKey, School } from "@/types/content";

const TIER_BANDS: readonly number[] = [3, 6, 9, 11];

export const smallTier = (depth: number): number => {
  for (let tier = 0; tier < TIER_BANDS.length; tier += 1) {
    if (depth <= (TIER_BANDS[tier] ?? 0)) return tier + 1;
  }
  return TIER_BANDS.length;
};

export type Constellation = School | "hub" | "nexus";

export type ChartNodeKind =
  | "small"
  | "gate"
  | "notable"
  | "confluence"
  | "nexus"
  | "keystone";

export interface ChartRequirement {
  pointsIn: Partial<Record<School, number>>;
}

export interface ChartScaling {
  school: School;
  per: number;
  max: number;
}

export interface ChartNodeDef {
  id: string;
  constellation: Constellation;
  kind: ChartNodeKind;
  links: string[];
  depth: number;
  entry?: boolean;
  requires?: ChartRequirement;
  scaledBy?: ChartScaling;
  effects?: readonly EffectDef[];
  mods?: Partial<PerkMods>;
  traits?: readonly PerkTrait[];
  tags?: readonly ContentTag[];
  fx?: LocKey;
  hubBudget?: boolean;
  budgetDelta?: number;
  slotTierDelta?: Partial<Record<SlotId, number>>;
  name?: LocKey;
  desc?: LocKey;
}
