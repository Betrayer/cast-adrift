export const SHIP_RANK_XP = [0, 2, 5, 9, 14, 20, 27] as const;

export const SHIP_RANK_MAX = SHIP_RANK_XP.length - 1;

export const SHIP_RANK_GAIN = {
  elite: 2,
  miniboss: 3,
  boss: 5,
  cleanSector: 2,
} as const;

export const CLEAN_SECTOR_HULL_PCT = 50;

export const SHIP_DRAFT_CARDS = 3;

export const SHIP_DRAFT_WIDE_CARDS = 4;

export const SHIP_DRAFT_WIDE_MASTERY = 3;

export const SHIP_DRAFT_REROLL_MASTERY = 5;

export const shipRankOf = (xp: number): number => {
  let rank = 0;
  for (let next = 1; next <= SHIP_RANK_MAX; next += 1) {
    if (xp < (SHIP_RANK_XP[next] ?? Infinity)) break;
    rank = next;
  }
  return rank;
};

export const openDraftRank = (xp: number, pendingRankUps: number): number =>
  shipRankOf(xp) - pendingRankUps + 1;
