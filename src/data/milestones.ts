import type { LocKey } from "@/types/content";

export type MilestoneKind =
  | "budget"
  | "shipRam"
  | "contractRow"
  | "shipArk"
  | "engraving"
  | "dailyPreview"
  | "respecPrestige";

export interface Milestone {
  level: number;
  kind: MilestoneKind;
  label: LocKey;
  live: boolean;
}

export const MILESTONES: readonly Milestone[] = [
  { level: 5, kind: "budget", label: "meta:milestone.budget", live: true },
  { level: 10, kind: "shipRam", label: "meta:milestone.shipRam", live: true },
  { level: 15, kind: "budget", label: "meta:milestone.budget", live: true },
  { level: 20, kind: "contractRow", label: "meta:milestone.contractRow", live: false },
  { level: 25, kind: "budget", label: "meta:milestone.budget", live: true },
  { level: 25, kind: "shipArk", label: "meta:milestone.shipArk", live: true },
  { level: 30, kind: "engraving", label: "meta:milestone.engraving", live: true },
  { level: 35, kind: "budget", label: "meta:milestone.budget", live: true },
  { level: 40, kind: "dailyPreview", label: "meta:milestone.dailyPreview", live: false },
  { level: 45, kind: "budget", label: "meta:milestone.budget", live: true },
  { level: 50, kind: "respecPrestige", label: "meta:milestone.respecPrestige", live: false },
];

export const ENGRAVING_STATION_LEVEL = 30;

export const BASE_HANGAR_BUDGET = 10;
export const MAX_HANGAR_BUDGET = 16;

export const milestonesReached = (level: number): Milestone[] =>
  MILESTONES.filter((m) => m.level <= level);

export const milestonesAt = (level: number): Milestone[] =>
  MILESTONES.filter((m) => m.level === level);

export const hangarBudget = (level: number, hubBudgetBonus = 0): number => {
  const budgetMilestones = milestonesReached(level).filter(
    (m) => m.kind === "budget",
  ).length;
  return Math.min(
    MAX_HANGAR_BUDGET,
    BASE_HANGAR_BUDGET + budgetMilestones + Math.max(0, hubBudgetBonus),
  );
};
