import {
  ACHIEVEMENTS,
  ACHIEVEMENT_BY_ID,
  tierNumeral,
  type AchievementCond,
  type AchievementDef,
} from "@/data/achievements";
import { CHART_NODE_BY_ID } from "@/data/chart";
import { DIE_BY_ID } from "@/data/dice";
import { CHAINS, nextStep } from "@/data/narrative/chains";
import {
  useMetaStore,
  type CollectionEntry,
  type MetaStats,
  type VoucherKind,
} from "@/stores/metaStore";
import { useNarrativeStore } from "@/stores/narrativeStore";
import { useRunStore, type RunStats } from "@/stores/runStore";
import type { School } from "@/types/content";
import type { FlagValue } from "@/types/events";

export interface AchievementRunCtx {
  win: boolean;
  hullPct: number;
  beacons: number;
  puzzles: number;
  ascension: number;
  deckSchools: number;
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

const archiveFlags = (
  archive: readonly string[],
): Record<string, FlagValue> => {
  const out: Record<string, FlagValue> = {};
  for (const key of archive) out[key] = true;
  return out;
};

const chainProgress = (
  chainId: string,
  archive: readonly string[],
): AchievementProgress => {
  const chain = CHAINS.find((c) => c.id === chainId);
  if (chain === undefined) return { have: 0, need: 1, done: false };
  const flags = archiveFlags(archive);
  const have = chain.steps.filter((step) =>
    step.done.some((key) => flags[key] !== undefined),
  ).length;
  return { have, need: chain.steps.length, done: have >= chain.steps.length };
};

const chainsDoneCount = (archive: readonly string[]): number => {
  const flags = archiveFlags(archive);
  return CHAINS.filter((chain) => nextStep(chain, flags) === null).length;
};

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
    case "runDeckSchools":
      return flag(
        ctx.run !== null && ctx.run.win && ctx.run.deckSchools >= cond.n,
      );
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
    case "chainDone":
      return chainProgress(cond.id, ctx.flagsArchive);
    case "chainsDone":
      return of(chainsDoneCount(ctx.flagsArchive), cond.n);
    case "flags":
      return cond.mode === "all"
        ? of(flagsHave(cond, ctx.flagsArchive), cond.keys.length)
        : flag(flagsHave(cond, ctx.flagsArchive) > 0);
  }
};

const RUN_SCOPED_CONDS: ReadonlySet<AchievementCond["c"]> = new Set([
  "runStatAtMost",
  "runHullPct",
  "runBeacons",
  "runPuzzles",
  "runDeckSchools",
  "clearAtAscension",
]);

export const isRunScoped = (def: AchievementDef): boolean =>
  RUN_SCOPED_CONDS.has(def.cond.c);

export const LIFETIME_ACHIEVEMENTS: readonly AchievementDef[] =
  ACHIEVEMENTS.filter((def) => !isRunScoped(def));

export const achievementMet = (
  def: AchievementDef,
  ctx: AchievementCtx,
): boolean => achievementProgress(def, ctx).done;

export const newlyMetAchievements = (
  ctx: AchievementCtx,
  already: readonly string[],
  pool: readonly AchievementDef[] = ACHIEVEMENTS,
): AchievementDef[] => {
  const have = new Set(already);
  return pool.filter((def) => !have.has(def.id) && achievementMet(def, ctx));
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
  offers: string[];
}

const grantRewards = (defs: readonly AchievementDef[]): AchievementSettlement => {
  const meta = useMetaStore.getState();
  const unlocked: AchievementDef[] = [];
  const offers: string[] = [];
  let shards = 0;
  for (const def of defs) {
    if (!meta.unlockAchievement(def.id)) continue;
    unlocked.push(def);
    useNarrativeStore.getState().pushAchievement(def.id);
    const run = useRunStore.getState();
    if (run.active) {
      useNarrativeStore.getState().pushJournal({
        k: "achievement",
        achievement: def.id,
        sector: run.sector,
      });
    }
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
    if (reward.voucher !== undefined) {
      useMetaStore.getState().offerVoucher(def.id);
      offers.push(def.id);
    }
  }
  return { unlocked, shards, offers };
};

export const settleAchievements = (
  run: AchievementRunCtx | null = null,
): AchievementSettlement => {
  const meta = useMetaStore.getState();
  return grantRewards(
    newlyMetAchievements(metaAchievementCtx(run), meta.achievements),
  );
};

export const settleLifetimeAchievements = (): AchievementSettlement => {
  const meta = useMetaStore.getState();
  return grantRewards(
    newlyMetAchievements(
      metaAchievementCtx(null),
      meta.achievements,
      LIFETIME_ACHIEVEMENTS,
    ),
  );
};

export type VoucherChoice = "voucher" | "shards";

export interface VoucherOffer {
  achievement: string;
  kind: VoucherKind;
  altShards: number;
}

export const voucherOfferOf = (id: string): VoucherOffer | null => {
  const def = ACHIEVEMENT_BY_ID.get(id);
  const kind = def?.reward?.voucher;
  if (def === undefined || kind === undefined) return null;
  return {
    achievement: id,
    kind,
    altShards: def.reward?.altShards ?? 0,
  };
};

export const pendingVoucherOffer = (): VoucherOffer | null => {
  for (const id of useMetaStore.getState().voucherOffers) {
    const offer = voucherOfferOf(id);
    if (offer !== null) return offer;
  }
  return null;
};

export const takeVoucherOffer = (
  id: string,
  choice: VoucherChoice,
): boolean => {
  const offer = voucherOfferOf(id);
  if (offer === null) return false;
  if (!useMetaStore.getState().clearVoucherOffer(id)) return false;
  if (choice === "voucher" && useMetaStore.getState().grantVoucher(offer.kind)) {
    return true;
  }
  useMetaStore.getState().addShards(offer.altShards);
  return true;
};

export const achievementLabel = (id: string): string =>
  ACHIEVEMENT_BY_ID.get(id)?.name ?? id;

export const achievementTitle = (
  def: AchievementDef,
  translate: (key: string) => string,
): string =>
  def.tier === undefined || (def.tierCount ?? 1) <= 1
    ? translate(def.name)
    : `${translate(def.name)} ${tierNumeral(def.tier)}`;

export const achievementTitleById = (
  id: string,
  translate: (key: string) => string,
): string => {
  const def = ACHIEVEMENT_BY_ID.get(id);
  return def === undefined ? id : achievementTitle(def, translate);
};

export const achievementDescArgs = (
  def: AchievementDef,
): { n: number } => ({ n: def.need ?? 0 });
