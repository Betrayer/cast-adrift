export const XP_EVENTS = {
  node: 2,
  elite: 6,
  miniboss: 12,
  boss: 25,
  contractStar: 10,
} as const;

export const MAX_LEVEL = 50;

export interface RunCounts {
  nodes: number;
  elites: number;
  minibosses: number;
  bosses: number;
  contractStars: number;
}

export const ascensionMult = (ascension: number): number =>
  1 + 0.1 * Math.max(0, ascension);

export const xpToNext = (level: number): number => 25 + 6 * level;

export const totalXpForLevel = (level: number): number => {
  const clamped = Math.max(1, Math.min(MAX_LEVEL, level));
  return (clamped - 1) * (25 + 3 * clamped);
};

export const levelFromTotalXp = (xp: number): number => {
  let level = 1;
  while (level < MAX_LEVEL && totalXpForLevel(level + 1) <= xp) level += 1;
  return level;
};

export interface LevelProgress {
  level: number;
  into: number;
  need: number;
  pct: number;
}

export const progressWithinLevel = (xp: number): LevelProgress => {
  const level = levelFromTotalXp(xp);
  if (level >= MAX_LEVEL) return { level, into: 0, need: 0, pct: 1 };
  const base = totalXpForLevel(level);
  const need = xpToNext(level);
  const into = Math.max(0, xp - base);
  return { level, into, need, pct: need > 0 ? into / need : 1 };
};

export const runXp = (counts: RunCounts, ascension = 0): number => {
  const raw =
    counts.nodes * XP_EVENTS.node +
    counts.elites * XP_EVENTS.elite +
    counts.minibosses * XP_EVENTS.miniboss +
    counts.bosses * XP_EVENTS.boss +
    counts.contractStars * XP_EVENTS.contractStar;
  return Math.round(raw * ascensionMult(ascension));
};

// DESIGN §12.3 campaign table. Replaces the Phase-5 per-node slice formula:
// shards now come from sector clears, not from node grinding.
export const SECTOR_CLEAR_SHARDS: readonly number[] = [40, 55, 75, 100, 140];
export const BOSS_FIRST_KILL_SHARDS: readonly number[] = [25, 35, 50, 70, 100];

// «За Ядром» is paid as its own band rather than as a sixth entry in the sector
// table: it is opt-in, it is not part of the campaign's clear count, and the
// table's shape (§12.3) describes a five-act run.
export const SECTOR_SIX_CLEAR_SHARDS = 180;
export const SECTOR_SIX_BOSS_SHARDS = 60;

export const sectorClearShards = (sector: number): number =>
  SECTOR_CLEAR_SHARDS[Math.max(0, Math.min(4, sector - 1))] ?? 0;

export const bossFirstKillShards = (sector: number): number =>
  sector > SECTOR_CLEAR_SHARDS.length
    ? SECTOR_SIX_BOSS_SHARDS
    : (BOSS_FIRST_KILL_SHARDS[Math.max(0, Math.min(4, sector - 1))] ?? 0);

export const campaignShards = (sectorsCleared: number): number =>
  SECTOR_CLEAR_SHARDS.slice(0, Math.max(0, sectorsCleared)).reduce(
    (sum, n) => sum + n,
    0,
  );

export const ASCENSION_SHARD_PCT = 8;
export const BEACON_SHARDS = 8;
export const FIRST_ENDING_SHARDS = 25;
export const HALF_HULL_CLEAR_SHARDS = 15;
export const STREAK_SHARDS = 5;
export const STREAK_SHARD_CAP = 25;
export const HALF_HULL_PCT = 50;

export const ascensionShardMult = (ascension: number): number =>
  1 + (ASCENSION_SHARD_PCT / 100) * Math.max(0, ascension);

export interface RunQualityInput {
  win: boolean;
  sectorsCleared: number;
  beacons: number;
  hullPct: number;
  firstEnding: boolean;
  streak: number;
  ascension: number;
  deepClear: boolean;
}

export interface ShardBreakdown {
  sectors: number;
  beacons: number;
  firstEnding: number;
  hullClear: number;
  streak: number;
  deepClear: number;
  ascension: number;
  total: number;
}

export const ZERO_SHARD_BREAKDOWN: ShardBreakdown = {
  sectors: 0,
  beacons: 0,
  firstEnding: 0,
  hullClear: 0,
  streak: 0,
  deepClear: 0,
  ascension: 0,
  total: 0,
};

export const shardBreakdown = (input: RunQualityInput): ShardBreakdown => {
  const sectors = campaignShards(input.sectorsCleared);
  const beacons = Math.max(0, input.beacons) * BEACON_SHARDS;
  const firstEnding = input.firstEnding ? FIRST_ENDING_SHARDS : 0;
  const hullClear =
    input.win && input.hullPct >= HALF_HULL_PCT ? HALF_HULL_CLEAR_SHARDS : 0;
  const streak = Math.min(
    STREAK_SHARD_CAP,
    Math.max(0, input.streak) * STREAK_SHARDS,
  );
  const deepClear =
    input.win && input.deepClear ? SECTOR_SIX_CLEAR_SHARDS : 0;
  const base =
    sectors + beacons + firstEnding + hullClear + streak + deepClear;
  const total = Math.round(base * ascensionShardMult(input.ascension));
  return {
    sectors,
    beacons,
    firstEnding,
    hullClear,
    streak,
    deepClear,
    ascension: total - base,
    total,
  };
};
