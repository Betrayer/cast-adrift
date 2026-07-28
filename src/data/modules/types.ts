import type { PerkMods, PerkTrait } from "@/data/perks/types";
import type { EffectDef } from "@/game/effects/types";
import type { LocKey, Rarity } from "@/types/content";

export type ModuleTag =
  | "economy"
  | "defense"
  | "offense"
  | "dice"
  | "weird";

export interface ModuleDef {
  id: string;
  name: LocKey;
  desc: LocKey;
  rarity: Rarity;
  price: number;
  tag: ModuleTag;
  effects?: readonly EffectDef[];
  mods?: Partial<PerkMods>;
  traits?: readonly PerkTrait[];
}

export const BASE_MODULE_SLOTS = 2;
export const MAX_MODULE_SLOTS = 3;
