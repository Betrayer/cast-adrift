import type { TFunction } from "i18next";
import { DIE_BY_ID } from "@/data/dice";
import type {
  ConstraintRule,
  OrderStep,
  PuzzleDef,
  PuzzleMetric,
} from "@/data/puzzles";
import {
  TIER_STAKES,
  isDeduction,
  maxAttempts,
  type PuzzleReward,
} from "@/game/puzzles/stakes";

export const metricLabelKey = (metric: PuzzleMetric | "hull"): string =>
  metric === "hull" ? "run:anomaly.mHull" : `run:anomaly.m_${metric}`;

export const ruleLabel = (t: TFunction, rule: ConstraintRule): string => {
  switch (rule.r) {
    case "noWaste":
      return t("run:anomaly.rule.noWaste");
    case "schoolInSlot":
      return t("run:anomaly.rule.schoolInSlot", {
        school: t(`battle:school.${rule.school}`),
        slot: t(`battle:slot.${rule.slot}`),
      });
    case "everyDiePlaced":
      return t("run:anomaly.rule.everyDiePlaced");
    case "slotParity":
      return t("run:anomaly.rule.slotParity", {
        slot: t(`battle:slot.${rule.slot}`),
        parity: t(`run:anomaly.parity.${rule.parity}`),
      });
    case "minSlotsUsed":
      return t("run:anomaly.rule.minSlotsUsed", { n: rule.n });
    case "maxSlotsUsed":
      return t("run:anomaly.rule.maxSlotsUsed", { n: rule.n });
    case "affixUsed":
      return t("run:anomaly.rule.affixUsed", {
        affix: t(`run:anomaly.affix.${rule.affix}`),
      });
  }
};

export const stepLabel = (t: TFunction, step: OrderStep): string => {
  switch (step.s) {
    case "mark":
      return t("run:anomaly.step.mark");
    case "damage":
      return t("run:anomaly.step.damage", { n: step.min });
    case "shield":
      return t("run:anomaly.step.shield", { n: step.min });
    case "charge":
      return t("run:anomaly.step.charge", { n: step.min });
    case "noOverflow":
      return t("run:anomaly.step.noOverflow");
    case "spinalJam":
      return t("run:anomaly.step.spinalJam");
  }
};

export const rewardLines = (
  t: TFunction,
  puzzle: PuzzleDef,
  reward: PuzzleReward,
): string[] => {
  const lines = [t("run:anomaly.rewardScrap", { n: reward.scrap })];
  if (reward.codex !== undefined) lines.push(t("run:anomaly.rewardCodex"));
  if (reward.choice !== undefined) {
    lines.push(
      t("run:anomaly.rewardChoice", {
        name: t(DIE_BY_ID.get(reward.choice.die)?.name ?? reward.choice.die),
      }),
    );
  }
  if (reward.die !== undefined) {
    lines.push(
      t("run:anomaly.rewardDie", {
        name: t(DIE_BY_ID.get(reward.die)?.name ?? reward.die),
      }),
    );
  }
  return [...lines, ...(puzzle.tier === 5 ? [t("run:anomaly.rewardOnce")] : [])];
};

export const stakeLine = (t: TFunction, puzzle: PuzzleDef): string => {
  if (isDeduction(puzzle)) {
    return t("run:anomaly.stakeDeduction", { n: maxAttempts(puzzle) });
  }
  const stakes = TIER_STAKES[puzzle.tier];
  if (stakes.paidCosts.length === 0) {
    return t("run:anomaly.stakeFree", { n: stakes.freeAttempts });
  }
  return t("run:anomaly.stakePaid", {
    n: stakes.freeAttempts,
    costs: stakes.paidCosts.join(" · "),
  });
};
