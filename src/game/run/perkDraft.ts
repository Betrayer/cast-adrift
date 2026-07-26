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

const RARITY_RANK: Record<PerkRarity, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
};

// A rarity floor drops the tiers below it from the weighted draw — the mini-boss
// package drafts at `uncommon` (DESIGN §6.4).
export const rollPerkChoices = (
  rng: RngStream,
  owned: readonly string[],
  floor: PerkRarity = "common",
): string[] => {
  const chosen: string[] = [];
  const taken = new Set(owned);
  const minRank = RARITY_RANK[floor];
  const available = ALL_PERKS.filter(
    (perk) => !taken.has(perk.id) && RARITY_RANK[perk.rarity] >= minRank,
  );
  const weights = (["common", "uncommon", "rare"] as const)
    .filter((r) => RARITY_RANK[r] >= minRank)
    .map((r) => [r, DRAFT_WEIGHTS[r]] as const);

  for (let i = 0; i < PERK_DRAFT_SIZE && chosen.length < available.length; i += 1) {
    const remaining = available.filter((perk) => !chosen.includes(perk.id));
    if (remaining.length === 0) break;
    const rarity = rng.weighted(weights);
    const pool =
      remaining.filter((perk) => perk.rarity === rarity).length > 0
        ? remaining.filter((perk) => perk.rarity === rarity)
        : remaining;
    chosen.push(rng.pick(pool).id);
  }

  return chosen;
};
