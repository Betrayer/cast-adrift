import type { PerkMods, PerkTrait } from "@/data/perks/types";
import type { EffectDef } from "@/game/effects/types";
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
  name?: LocKey;
  desc?: LocKey;
}
