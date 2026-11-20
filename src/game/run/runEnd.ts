import { KEEPER_BADGE_ASCENSION, MAX_ASCENSION } from "@/data/ascension";
import { contractDef } from "@/data/contracts";
import { DIE_BY_ID } from "@/data/dice";
import { ENEMY_BY_ID } from "@/data/enemies";
import { beaconsResolved } from "@/data/events/beacons";
import { SECTOR_COUNT } from "@/data/sectors";
import type { ShipId } from "@/data/ships";
import { milestoneCard, milestonesBetween } from "@/data/milestones";
import { settleAchievements } from "@/game/meta/achievements";
import {
  ceremonyRetiredIds,
  freshUnlocks,
  unlockContextOf,
} from "@/game/meta/unlockState";
import { syncActionStats } from "@/game/run/actionLog";
import { finishScoredRun } from "@/game/run/boards";
import { releaseCargo } from "@/game/run/cargo";
import { noteShipEvent } from "@/game/run/shipProgress";
import { pickBoss } from "@/game/run/encounter";
import { countStars, goalStarsMask, type GoalContext } from "@/game/run/goals";
import { depthFor, isScoredMode, scoreBreakdown } from "@/game/run/modes";
import { computeRunMods } from "@/game/run/runMods";
import { autosaveRun } from "@/game/run/snapshot";
import { runXp, shardBreakdown, ZERO_SHARD_BREAKDOWN } from "@/game/xp";
import { trackEvent } from "@/services/analytics";
import { useAppStore } from "@/stores/appStore";
import {
  SINGULARITY_BADGE,
  SMOTRITEL_BADGE,
  useMetaStore,
  type MetaStats,
} from "@/stores/metaStore";
import { useNarrativeStore } from "@/stores/narrativeStore";
import {
  useRunStore,
  type RunMode,
  type RunValues,
} from "@/stores/runStore";
import { useSummaryStore, type DeathCause } from "@/stores/summaryStore";
import type { ScreenId } from "@/types";
import type { School } from "@/types/content";

const runRotation = (run: RunValues): string[] => {
  const faced = [
    ...run.usedMinibosses,
    ...(run.stats.bosses > 0 ? [pickBoss(run.sector, run.seed)] : []),
  ];
  return faced
    .map((id) => ENEMY_BY_ID.get(id)?.name)
    .filter((name): name is string => name !== undefined);
};

const runDeckSchools = (run: RunValues): number =>
  new Set(
    run.deck
      .map((d) => DIE_BY_ID.get(d.defId)?.school)
      .filter(
        (school): school is School =>
          school !== undefined && school !== "prismatic",
      ),
  ).size;

const shipClearDelta = (
  shipId: ShipId,
  win: boolean,
  mode: RunMode,
): Partial<MetaStats> => {
  if (!win || mode !== "campaign") return {};
  switch (shipId) {
    case "wanderer":
      return { clearsWanderer: 1 };
    case "ram":
      return { clearsRam: 1 };
    case "ark":
      return { clearsArk: 1 };
    case "corsair":
      return { clearsCorsair: 1 };
    case "foundry":
      return { clearsFoundry: 1 };
    case "prism":
      return { clearsPrism: 1 };
    default:
      return {};
  }
};

const sectorsClearedCount = (): number => {
  const run = useRunStore.getState();
  return Math.max(0, Math.min(SECTOR_COUNT, run.stats.bosses));
};

const goalContextFor = (win: boolean): GoalContext => {
  const run = useRunStore.getState();
  return {
    win,
    stats: run.stats,
    hull: run.hull,
    hullMax: run.hullMax,
    scrap: run.scrap,
    deckSize: run.deck.length,
    deckSchools: new Set(
      run.deck
        .map((d) => DIE_BY_ID.get(d.defId)?.school)
        .filter((school): school is School => school !== undefined),
    ).size,
    axis: run.axis,
    solvedPuzzles: run.solvedPuzzles,
    flags: run.flags,
  };
};

const settleContract = (win: boolean): { stars: number; newStars: number } => {
  const run = useRunStore.getState();
  const def = contractDef(run.contractId);
  if (def === undefined) return { stars: 0, newStars: 0 };
  const mask = goalStarsMask(def.goals, goalContextFor(win));
  const gained = useMetaStore.getState().recordContractStars(def.id, mask);
  if (gained > 0) {
    trackEvent({
      name: "contract_star",
      params: { contract: def.id, stars: countStars(mask) },
    });
  }
  return { stars: countStars(mask), newStars: gained };
};

const deathParams = (cause: DeathCause): Record<string, string> =>
  cause === "singularity" ? { death: "1", cause } : { death: "1" };

export const endRun = (win: boolean, cause?: DeathCause): void => {
  syncActionStats();
  useNarrativeStore.getState().dropRunFeed();
  const run = useRunStore.getState();
  const deathCause: DeathCause =
    cause ?? (run.hull <= 0 ? "hull" : "abandon");
  const meta = useMetaStore.getState();
  const contract = run.mode === "contract" ? settleContract(win) : null;
  const counts = {
    nodes: run.stats.nodesCleared,
    elites: run.stats.elites,
    minibosses: run.stats.minibosses,
    bosses: run.stats.bosses,
    contractStars: contract?.newStars ?? 0,
  };
  const cleared = sectorsClearedCount();
  const xpMult =
    1 +
    computeRunMods(run.perks, run.chartPicks, run.modules, run.officers)
      .xpMultPct / 100;
  const xpGain = Math.round(runXp(counts, run.ascension) * xpMult);
  const beacons = beaconsResolved(run.flags);
  const hullPct = run.hullMax <= 0 ? 0 : (run.hull / run.hullMax) * 100;
  if (run.mode === "campaign") meta.recordStreak(win);
  const streak = useMetaStore.getState().stats.noDeathStreak;
  const shards =
    run.mode === "campaign"
      ? shardBreakdown({
          win,
          sectorsCleared: cleared,
          beacons,
          hullPct,
          firstEnding: run.endingFirstTime,
          streak,
          ascension: run.ascension,
          deepClear: run.crossedThreshold,
        })
      : ZERO_SHARD_BREAKDOWN;
  const award = meta.awardRun(xpGain, shards.total, win);
  meta.archiveRunFlags(Object.keys(run.flags));
  noteShipEvent("runEnded");
  if (win && run.mode === "campaign") {
    noteShipEvent("campaignWon");
    meta.recordCampaignClear(run.ascension);
    if (run.ascension >= KEEPER_BADGE_ASCENSION) meta.awardBadge(SMOTRITEL_BADGE);
    if (run.ascension >= MAX_ASCENSION) meta.awardBadge(SINGULARITY_BADGE);
  }
  meta.bumpLifetime({
    scrapEarned: run.stats.scrapEarned,
    beacons,
    ...shipClearDelta(run.shipId, win, run.mode),
    driftRuns: run.mode === "drift" ? 1 : 0,
    dailyRuns: run.mode === "daily" ? 1 : 0,
    contractRuns: run.mode === "contract" ? 1 : 0,
    deepClears: win && run.crossedThreshold ? 1 : 0,
    ...(run.mode === "drift" ? { deepestDrift: run.stats.depth } : {}),
  });
  const finds = meta.recordEncounters(run.encounters);
  const settled = settleAchievements({
    win,
    hullPct,
    beacons,
    puzzles: run.solvedPuzzles.length,
    ascension: run.ascension,
    deckSchools: runDeckSchools(run),
    stats: run.stats,
  });
  const milestones = milestonesBetween(award.fromLevel, award.toLevel).map(
    milestoneCard,
  );
  const after = useMetaStore.getState();
  const unlocks = freshUnlocks(unlockContextOf(after), after.unlocksSeen);
  if (award.toLevel > award.fromLevel && !isScoredMode(run.mode)) {
    after.markUnlocksSeen(ceremonyRetiredIds(unlocks));
  }
  useSummaryStore.getState().setResult({
    xpGain,
    shardGain: shards.total + finds.shards + settled.shards,
    shards,
    findShards: finds.shards,
    firstFinds: finds.firstFinds,
    achievements: settled.unlocked.map((def) => def.id),
    achievementShards: settled.shards,
    unlocks: unlocks.defs.map((def) => def.label),
    unlockIds: unlocks.ids,
    fromLevel: award.fromLevel,
    toLevel: award.toLevel,
    win,
    cause: win ? null : deathCause,
    milestones,
    mode: run.mode,
    score: isScoredMode(run.mode)
      ? scoreBreakdown(run.stats, run.ascension)
      : null,
    contractId: run.contractId,
    contractStars: contract?.stars ?? 0,
    rotation: runRotation(run),
  });
  if (!win) {
    trackEvent({
      name: "death",
      params: {
        sector: run.sector,
        depth: depthFor(run.sectorIndex, run.depthRow),
        cause: deathCause,
      },
    });
  }
  useRunStore.setState({
    active: false,
    pendingSwaps: [],
    officers: [],
    pendingOfficerBark: false,
    echoUsed: false,
  });
  releaseCargo();
  if (isScoredMode(run.mode)) void finishScoredRun();
  if (win) useAppStore.getState().go(summaryScreenFor(run.mode));
  else useAppStore.getState().go("ending", deathParams(deathCause));
  autosaveRun();
};

export const summaryScreenFor = (mode: RunMode): ScreenId =>
  isScoredMode(mode) ? "driftSummary" : "summary";

export const leaveDeathEpilogue = (): void => {
  useAppStore
    .getState()
    .go(summaryScreenFor(useRunStore.getState().mode));
};
