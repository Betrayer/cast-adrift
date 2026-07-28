import { BLACK_PERKS } from "@/data/perks/black";
import { BLUE_PERKS } from "@/data/perks/blue";
import { GREEN_PERKS } from "@/data/perks/green";
import { GREY_PERKS } from "@/data/perks/grey";
import { PHASE5_PERKS } from "@/data/perks/phase5";
import { RED_PERKS } from "@/data/perks/red";
import { SYSTEM_PERKS } from "@/data/perks/systems";
import { YELLOW_PERKS } from "@/data/perks/yellow";
import type { PerkDef } from "@/data/perks/types";

export const ALL_PERKS: readonly PerkDef[] = [
  ...PHASE5_PERKS,
  ...RED_PERKS,
  ...BLUE_PERKS,
  ...GREEN_PERKS,
  ...YELLOW_PERKS,
  ...BLACK_PERKS,
  ...GREY_PERKS,
  ...SYSTEM_PERKS,
];

export const PERK_BY_ID: ReadonlyMap<string, PerkDef> = new Map(
  ALL_PERKS.map((def) => [def.id, def]),
);

export type {
  PerkDef,
  PerkPool,
  PerkMods,
  PerkRarity,
  PerkSynergy,
} from "@/data/perks/types";
export { ZERO_PERK_MODS } from "@/data/perks/types";
