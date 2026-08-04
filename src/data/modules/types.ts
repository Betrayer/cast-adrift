import type { PerkMods, PerkTrait } from "@/data/perks/types";
import type { ContentTag } from "@/data/tags";
import type { EffectDef } from "@/game/effects/types";
import type { LocKey, Rarity } from "@/types/content";

export type ModuleTag =
  | "economy"
  | "defense"
  | "offense"
  | "dice"
  | "weird";

export const MODULE_CATEGORY_TAGS: Record<ModuleTag, readonly ContentTag[]> = {
  economy: ["scrap"],
  defense: ["shields"],
  offense: ["weapons"],
  dice: ["dice"],
  weird: ["control"],
};

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
  tags?: readonly ContentTag[];
}

export const moduleTags = (def: ModuleDef): readonly ContentTag[] => [
  ...MODULE_CATEGORY_TAGS[def.tag],
  ...(def.tags ?? []),
];

export const BASE_MODULE_SLOTS = 2;
export const MAX_MODULE_SLOTS = 3;
