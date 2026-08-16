import type { PerkDef, PerkPool, PerkRarity } from "@/data/perks/types";

type PerkBody = Pick<
  PerkDef,
  "effects" | "mods" | "traits" | "synergy" | "tags"
>;

export const perk = (
  id: string,
  pool: PerkPool,
  rarity: PerkRarity,
  body: PerkBody,
): PerkDef => ({
  id,
  name: `content:perks.${id}`,
  desc: `content:perksDesc.${id}`,
  rarity,
  pool,
  ...body,
});

