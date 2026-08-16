import {
  ACHIEVEMENTS,
  ACHIEVEMENT_BY_ID,
  type AchievementCond,
  type AchievementDef,
} from "@/data/achievements";
import { CHART_NODE_BY_ID } from "@/data/chart";
import { DIE_BY_ID } from "@/data/dice";
import { useMetaStore, type CollectionEntry, type MetaStats } from "@/stores/metaStore";
import { useNarrativeStore } from "@/stores/narrativeStore";
import type { RunStats } from "@/stores/runStore";
import type { School } from "@/types/content";

export interface AchievementRunCtx {
  win: boolean;
  hullPct: number;
  beacons: number;
  puzzles: number;
  ascension: number;
  stats: RunStats;
}

export interface AchievementCtx {
  stats: MetaStats;
  endings: readonly string[];
  bossFirstKills: readonly string[];
  collection: readonly CollectionEntry[];
  encountered: Readonly<Record<string, unknown>>;
  contracts: Readonly<Record<string, number>>;
  chartPicks: readonly string[];
  codex: readonly string[];
  seenPuzzles: readonly string[];
  flagsArchive: readonly string[];
  run: AchievementRunCtx | null;
}

export interface AchievementProgress {
  have: number;
  need: number;
  done: boolean;
}

const countStarBits = (mask: number): number => {
  let n = 0;
  for (let bit = 0; bit < 3; bit += 1) {
    if ((mask & (1 << bit)) !== 0) n += 1;
  }
  return n;
};

const ownedDistinct = (collection: readonly CollectionEntry[]): number =>
  collection.filter((e) => e.count > 0).length;

const ownedSchools = (collection: readonly CollectionEntry[]): number =>
  new Set(
    collection
      .filter((e) => e.count > 0)
      .map((e) => DIE_BY_ID.get(e.defId)?.school)
      .filter((school): school is School => school !== undefined),
  ).size;

const keystonesPicked = (picks: readonly string[]): number =>
  picks.filter((id) => CHART_NODE_BY_ID.get(id)?.kind === "keystone").length;

const flagsHave = (
  cond: Extract<AchievementCond, { c: "flags" }>,
  archive: readonly string[],
): number => cond.keys.filter((key) => archive.includes(key)).length;

export const achievementProgress = (
  def: AchievementDef,
  ctx: AchievementCtx,
): AchievementProgress => {
  const cond = def.cond;
  const of = (have: number, need: number): AchievementProgress => ({
    have: Math.min(have, need),
    need,
    done: have >= need,
  });
  const flag = (done: boolean, need = 1): AchievementProgress => ({
    have: done ? need : 0,
    need,
    done,
  });
  switch (cond.c) {
    case "lifetime":
      return of(ctx.stats[cond.stat], cond.n);
    case "runStatAtMost":
      return flag(
        ctx.run !== null &&
          ctx.run.win &&
          ctx.run.stats[cond.stat] <= cond.n,
      );
    case "runHullPct":
      return flag(ctx.run !== null && ctx.run.win && ctx.run.hullPct >= cond.n);
    case "runBeacons":
      return of(ctx.run?.beacons ?? 0, cond.n);
    case "runPuzzles":
      return of(ctx.run?.puzzles ?? 0, cond.n);
    case "clearAtAscension":
      return flag(
        ctx.run !== null && ctx.run.win && ctx.run.ascension >= cond.n,
      );
    case "endings":
      return of(ctx.endings.length, cond.n);
    case "endingReached":
      return flag(ctx.endings.includes(cond.id));
    case "bossFirstKills":
      return of(ctx.bossFirstKills.length, cond.n);
    case "collectionOwned":
      return of(ownedDistinct(ctx.collection), cond.n);
    case "collectionSchools":
      return of(ownedSchools(ctx.collection), cond.n);
    case "encountered":
      return of(Object.keys(ctx.encountered).length, cond.n);
    case "contractStars":
      return of(
        Object.values(ctx.contracts).reduce(
          (sum, mask) => sum + countStarBits(mask),
          0,
        ),
        cond.n,
      );
    case "keystones":
      return of(keystonesPicked(ctx.chartPicks), cond.n);
    case "codex":
      return of(ctx.codex.length, cond.n);
    case "seenPuzzles":
      return of(ctx.seenPuzzles.length, cond.n);
    case "streak":
      return of(ctx.stats.bestNoDeathStreak, cond.n);
    case "flags":
      return cond.mode === "all"
        ? of(flagsHave(cond, ctx.flagsArchive), cond.keys.length)
        : flag(flagsHave(cond, ctx.flagsArchive) > 0);
  }
};

export const achievementMet = (
  def: AchievementDef,
  ctx: AchievementCtx,
): boolean => achievementProgress(def, ctx).done;

export const newlyMetAchievements = (
  ctx: AchievementCtx,
  already: readonly string[],
): AchievementDef[] => {
  const have = new Set(already);
  return ACHIEVEMENTS.filter(
    (def) => !have.has(def.id) && achievementMet(def, ctx),
  );
};

export const metaAchievementCtx = (
  run: AchievementRunCtx | null = null,
): AchievementCtx => {
  const meta = useMetaStore.getState();
  return {
    stats: meta.stats,
    endings: meta.endings,
    bossFirstKills: meta.bossFirstKills,
    collection: meta.collection,
    encountered: meta.encountered,
    contracts: meta.contracts,
    chartPicks: meta.chartPicks,
    codex: meta.codex,
    seenPuzzles: meta.seenPuzzles,
    flagsArchive: meta.flagsArchive,
    run,
  };
};

export interface AchievementSettlement {
  unlocked: AchievementDef[];
  shards: number;
}

export const settleAchievements = (
  run: AchievementRunCtx | null = null,
): AchievementSettlement => {
  const meta = useMetaStore.getState();
  const fresh = newlyMetAchievements(metaAchievementCtx(run), meta.achievements);
  let shards = 0;
  for (const def of fresh) {
    if (!meta.unlockAchievement(def.id)) continue;
    useNarrativeStore.getState().pushAchievement(def.id);
    const reward = def.reward;
    if (reward === undefined) continue;
    if (reward.shards !== undefined && reward.shards > 0) {
      useMetaStore.getState().addShards(reward.shards);
      shards += reward.shards;
    }
    if (reward.unlockId !== undefined) {
      useMetaStore.getState().grantUnlock(reward.unlockId);
    }
    if (reward.badge !== undefined) {
      useMetaStore.getState().awardBadge(reward.badge);
    }
  }
  return { unlocked: fresh, shards };
};

export const achievementLabel = (id: string): string =>
  ACHIEVEMENT_BY_ID.get(id)?.name ?? id;
