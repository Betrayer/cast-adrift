import { DEFENSE_MODULES } from "@/data/modules/defense";
import { DICE_MODULES } from "@/data/modules/dice";
import { ECONOMY_MODULES } from "@/data/modules/economy";
import { OFFENSE_MODULES } from "@/data/modules/offense";
import { WEIRD_MODULES } from "@/data/modules/weird";
import {
  BASE_MODULE_SLOTS,
  MAX_MODULE_SLOTS,
  type ModuleDef,
} from "@/data/modules/types";
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

export const MODULE_POOL: Record<Rarity, readonly string[]> = {
  common: ALL_MODULES.filter((m) => m.rarity === "common").map((m) => m.id),
  uncommon: ALL_MODULES.filter((m) => m.rarity === "uncommon").map((m) => m.id),
  rare: ALL_MODULES.filter((m) => m.rarity === "rare").map((m) => m.id),
  legendary: [],
};

export const moduleDef = (id: string): ModuleDef | undefined =>
  MODULE_BY_ID.get(id);

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

export const moduleSlots = (moduleSlotDelta: number): number =>
  Math.max(
    BASE_MODULE_SLOTS,
    Math.min(MAX_MODULE_SLOTS, BASE_MODULE_SLOTS + Math.max(0, moduleSlotDelta)),
  );
