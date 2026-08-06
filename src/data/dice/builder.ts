import { DIE_PTS } from "@/data/tiers";
import type { DieItemDef, DieTier, Rarity, School } from "@/types/content";

type DieBody = Omit<
  DieItemDef,
  "id" | "name" | "desc" | "tier" | "school" | "rarity" | "pts"
>;

export const die = (
  id: string,
  tier: DieTier,
  school: School,
  rarity: Rarity,
  body: DieBody = {},
): DieItemDef => ({
  id,
  name: `content:dice.${id}`,
  desc: `content:diceDesc.${id}`,
  tier,
  school,
  rarity,
  pts: DIE_PTS[tier],
  ...body,
});
