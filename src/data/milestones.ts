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
  label: LocKey;
  budget?: number;
  chartPoints?: number;
  unlockId?: string;
}

export const MILESTONES: readonly Milestone[] = [
  { level: 5, kind: "budget", label: "meta:milestone.budget", budget: 2 },
  {
    level: 10,
    kind: "shipRam",
    label: "meta:milestone.shipRam",
    unlockId: "featureShipRam",
  },
  {
    level: 15,
    kind: "diceWave",
    label: "meta:milestone.diceWave",
    unlockId: "diceL15",
  },
  {
    level: 20,
    kind: "contractWave",
    label: "meta:milestone.contractWave",
    unlockId: "contractsL20",
  },
  { level: 25, kind: "budget", label: "meta:milestone.budget", budget: 2 },
  {
    level: 25,
    kind: "shipArk",
    label: "meta:milestone.shipArk",
    unlockId: "featureShipArk",
  },
  {
    level: 30,
    kind: "engraving",
    label: "meta:milestone.engraving",
    unlockId: "featureEngraving",
  },
  {
    level: 35,
    kind: "chartPoints",
    label: "meta:milestone.chartPoints",
    chartPoints: 2,
  },
  {
    level: 40,
    kind: "dailyPreview",
    label: "meta:milestone.dailyPreview",
    unlockId: "featureDailyPreview",
  },
  { level: 45, kind: "budget", label: "meta:milestone.budget", budget: 2 },
  {
    level: 50,
    kind: "respecPrestige",
    label: "meta:milestone.respecPrestige",
    unlockId: "featureFreeRespec",
  },
];

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
