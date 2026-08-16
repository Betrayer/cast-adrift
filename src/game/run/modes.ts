import { contractDef, type ContractSetup } from "@/data/contracts";
import {
  pickDailyMutators,
  type MutatorId,
} from "@/data/mutators";
import { SECTOR_COUNT, sectorDef } from "@/data/sectors";
import { createStream, deriveSeed, fnv1a } from "@/services/rng";
import type { RunMode, RunStats, RunValues } from "@/stores/runStore";

export const DAILY_SEED_PREFIX = "CA_DAILY:";
export const DRIFT_TIDE_CAP = 5;
export const DRIFT_LOOP_HP_PCT = 8;
export const DAY_MS = 86_400_000;

export const utcDateKey = (now: number): string =>
  new Date(now).toISOString().slice(0, 10);

export const msUntilUtcReset = (now: number): number =>
  DAY_MS - (now % DAY_MS);

export const isoWeekKey = (now: number): string => {
  const date = new Date(now);
  const day = date.getUTCDay() === 0 ? 7 : date.getUTCDay();
  const thursday = new Date(date.getTime());
  thursday.setUTCDate(date.getUTCDate() + 4 - day);
  const year = thursday.getUTCFullYear();
  const jan1 = Date.UTC(year, 0, 1);
  const week =
    Math.floor((thursday.getTime() - jan1) / (7 * DAY_MS)) + 1;
  return `${String(year)}-${String(week).padStart(2, "0")}`;
};

export const dailySeed = (date: string): number =>
  fnv1a(`${DAILY_SEED_PREFIX}${date}`);

export const dailyMutators = (date: string): MutatorId[] => {
  const stream = createStream(deriveSeed(dailySeed(date), "mutators"));
  return pickDailyMutators((max) => stream.int(0, max - 1));
};

export const sectorDepth = (sectorIndex: number): number =>
  sectorDef(contentSector(sectorIndex)).shape.bossRow;

export const depthFor = (sectorIndex: number, depthRow: number): number => {
  let passed = 0;
  for (let i = 1; i < Math.max(1, sectorIndex); i += 1) passed += sectorDepth(i);
  return passed + Math.max(0, depthRow);
};

export const driftLoop = (sectorIndex: number): number =>
  Math.max(0, sectorIndex - SECTOR_COUNT);

export const driftLoopHpPct = (loop: number): number =>
  DRIFT_LOOP_HP_PCT * Math.max(0, loop);

export const contentSector = (sectorIndex: number): number =>
  Math.min(SECTOR_COUNT, Math.max(1, sectorIndex));

export interface ScoreBreakdown {
  depth: number;
  depthPoints: number;
  kills: number;
  killPoints: number;
  scrap: number;
  total: number;
}

export const SCORE_PER_DEPTH = 50;
export const SCORE_PER_KILL = 5;

export const scoreBreakdown = (stats: RunStats): ScoreBreakdown => {
  const depthPoints = stats.depth * SCORE_PER_DEPTH;
  const killPoints = stats.kills * SCORE_PER_KILL;
  return {
    depth: stats.depth,
    depthPoints,
    kills: stats.kills,
    killPoints,
    scrap: stats.scrapEarned,
    total: depthPoints + killPoints + stats.scrapEarned,
  };
};

export const runScore = (stats: RunStats): number =>
  scoreBreakdown(stats).total;

export const scoredModes: readonly RunMode[] = ["drift", "daily"];

export const isScoredMode = (mode: RunMode): boolean =>
  scoredModes.includes(mode);

export const setupForRun = (run: Pick<RunValues, "contractId">): ContractSetup =>
  contractDef(run.contractId)?.setup ?? {};

export const isSectorExitRow = (sectorIndex: number, row: number): boolean =>
  row === sectorDepth(sectorIndex);
