import { ALL_PERKS } from "@/data/perks";
import type { PerkRarity } from "@/data/perks/types";
import type { RngStream } from "@/services/rng";

export const DRAFT_WEIGHTS: Record<PerkRarity, number> = {
  common: 55,
  uncommon: 35,
  rare: 10,
};

export const PERK_DRAFT_SIZE = 3;
export const SKIP_SCRAP = 10;

export const rollPerkChoices = (
  rng: RngStream,
  owned: readonly string[],
): string[] => {
  const chosen: string[] = [];
  const taken = new Set(owned);
  const available = ALL_PERKS.filter((perk) => !taken.has(perk.id));

  for (let i = 0; i < PERK_DRAFT_SIZE && chosen.length < available.length; i += 1) {
    const remaining = available.filter((perk) => !chosen.includes(perk.id));
    if (remaining.length === 0) break;
    const rarity = rng.weighted([
      ["common", DRAFT_WEIGHTS.common],
      ["uncommon", DRAFT_WEIGHTS.uncommon],
      ["rare", DRAFT_WEIGHTS.rare],
    ] as const);
    const pool =
      remaining.filter((perk) => perk.rarity === rarity).length > 0
        ? remaining.filter((perk) => perk.rarity === rarity)
        : remaining;
    chosen.push(rng.pick(pool).id);
  }

  return chosen;
};
