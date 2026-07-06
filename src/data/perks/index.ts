import { PHASE5_PERKS } from "@/data/perks/phase5";
import type { PerkDef } from "@/data/perks/types";

export const ALL_PERKS: readonly PerkDef[] = [...PHASE5_PERKS];

export const PERK_BY_ID: ReadonlyMap<string, PerkDef> = new Map(
  ALL_PERKS.map((def) => [def.id, def]),
);

export type { PerkDef, PerkPool, PerkMods, PerkRarity } from "@/data/perks/types";
export { ZERO_PERK_MODS } from "@/data/perks/types";
