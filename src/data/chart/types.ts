import type { PerkMods, PerkTrait } from "@/data/perks/types";
import type { EffectDef } from "@/game/effects/types";
import type { SlotId } from "@/types/battle";
import type { LocKey, School } from "@/types/content";

export type Constellation = School | "hub";

export type ChartNodeKind = "small" | "gate" | "notable" | "keystone";

export interface ChartNodeDef {
  id: string;
  constellation: Constellation;
  kind: ChartNodeKind;
  pos: { x: number; y: number };
  links: string[];
  entry?: boolean;
  effects?: readonly EffectDef[];
  mods?: Partial<PerkMods>;
  traits?: readonly PerkTrait[];
  fx?: LocKey;
  hubBudget?: boolean;
  budgetDelta?: number;
  slotTierDelta?: Partial<Record<SlotId, number>>;
  name?: LocKey;
  desc?: LocKey;
}
