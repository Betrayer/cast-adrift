import { DEFENSE_MODULES } from "@/data/modules/defense";
import { DICE_MODULES } from "@/data/modules/dice";
import { ECONOMY_MODULES } from "@/data/modules/economy";
import { OFFENSE_MODULES } from "@/data/modules/offense";
import { WEIRD_MODULES } from "@/data/modules/weird";
import type { ModuleDef } from "@/data/modules/types";
import type { Rarity } from "@/types/content";

export const ALL_MODULES: readonly ModuleDef[] = [
  ...ECONOMY_MODULES,
  ...DEFENSE_MODULES,
  ...OFFENSE_MODULES,
  ...DICE_MODULES,
  ...WEIRD_MODULES,
];

export const MODULE_BY_ID: ReadonlyMap<string, ModuleDef> = new Map(
  ALL_MODULES.map((def) => [def.id, def]),
);

const idsOfRarity = (rarity: Rarity): readonly string[] =>
  ALL_MODULES.filter((m) => m.rarity === rarity).map((m) => m.id);

export const MODULE_POOL: Record<Rarity, readonly string[]> = {
  common: idsOfRarity("common"),
  uncommon: idsOfRarity("uncommon"),
  rare: idsOfRarity("rare"),
  legendary: idsOfRarity("legendary"),
};

export {
  BASE_MODULE_SLOTS,
  MAX_MODULE_SLOTS,
} from "@/data/modules/types";
export type { ModuleDef, ModuleTag } from "@/data/modules/types";
export { ECONOMY_MODULES } from "@/data/modules/economy";
export { DEFENSE_MODULES } from "@/data/modules/defense";
export { OFFENSE_MODULES } from "@/data/modules/offense";
export { DICE_MODULES } from "@/data/modules/dice";
export { WEIRD_MODULES } from "@/data/modules/weird";
