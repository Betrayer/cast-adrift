import type { LocKey } from "@/types/content";

export type MilestoneKind =
  | "budget"
  | "shipRam"
  | "shipArk"
  | "engraving"
  | "diceWave"
  | "contractWave"
  | "chartPoints"
  | "dailyPreview"
  | "respecPrestige";

export interface Milestone {
  level: number;
  kind: MilestoneKind;
  budget?: number;
  chartPoints?: number;
  unlockId?: string;
}

export const MILESTONES: readonly Milestone[] = [
  { level: 5, kind: "budget", budget: 2 },
  { level: 10, kind: "shipRam", unlockId: "featureShipRam" },
  { level: 15, kind: "diceWave", unlockId: "diceL15" },
  { level: 20, kind: "contractWave", unlockId: "contractsL20" },
  { level: 25, kind: "budget", budget: 2 },
  { level: 25, kind: "shipArk", unlockId: "featureShipArk" },
  { level: 30, kind: "engraving", unlockId: "featureEngraving" },
  { level: 35, kind: "chartPoints", chartPoints: 2 },
  { level: 40, kind: "dailyPreview", unlockId: "featureDailyPreview" },
  { level: 45, kind: "budget", budget: 2 },
  { level: 50, kind: "respecPrestige", unlockId: "featureFreeRespec" },
];

export const milestoneLabel = (milestone: Milestone): LocKey =>
  `meta:milestone.${milestone.kind}`;

export const ENGRAVING_STATION_LEVEL = 30;
export const DAILY_PREVIEW_LEVEL = 40;
export const FREE_RESPEC_LEVEL = 50;

export const BASE_HANGAR_BUDGET = 10;
export const MAX_HANGAR_BUDGET = 16;

export const milestonesReached = (level: number): Milestone[] =>
  MILESTONES.filter((m) => m.level <= level);

export const milestonesAt = (level: number): Milestone[] =>
  MILESTONES.filter((m) => m.level === level);

export const milestonesBetween = (from: number, to: number): Milestone[] =>
  MILESTONES.filter((m) => m.level > from && m.level <= to);

export const hangarBudget = (level: number, hubBudgetBonus = 0): number => {
  const granted = milestonesReached(level).reduce(
    (sum, m) => sum + (m.budget ?? 0),
    0,
  );
  return Math.max(
    1,
    Math.min(MAX_HANGAR_BUDGET, BASE_HANGAR_BUDGET + granted + hubBudgetBonus),
  );
};

export const bonusChartPoints = (level: number): number =>
  milestonesReached(level).reduce((sum, m) => sum + (m.chartPoints ?? 0), 0);
