import { Group, Stack, Text } from "@mantine/core";
import type { TFunction } from "i18next";
import { tokens } from "@/app/theme";
import type { PuzzleDef } from "@/data/puzzles";
import {
  evalConstraintRule,
  evalOrderStep,
  primaryMetric,
  scoreMetric,
  type Placement,
  type TrialScore,
} from "@/game/puzzles/evaluate";
import { metricLabelKey, ruleLabel, stepLabel } from "./puzzleLabels";

export const SOLVED_GREEN = "#A8DF8E";

const CheckRow = ({ ok, label }: { ok: boolean; label: string }) => (
  <Group gap={8} wrap="nowrap">
    <Text fw={700} c={ok ? SOLVED_GREEN : tokens.faint} style={{ width: 16 }}>
      {ok ? "✓" : "○"}
    </Text>
    <Text size="sm" c={ok ? SOLVED_GREEN : tokens.dim}>
      {label}
    </Text>
  </Group>
);

interface GoalBannerProps {
  puzzle: PuzzleDef;
  score: TrialScore;
  placement: Placement;
  t: TFunction;
  mtMetric: number | null;
}

export const GoalBanner = ({ puzzle, score, placement, t, mtMetric }: GoalBannerProps) => {
  const goal = puzzle.goal;

  if (goal.g === "exact") {
    const now = scoreMetric(goal.metric, score);
    const diff = now - goal.value;
    const tag =
      diff === 0
        ? t("run:anomaly.exactHit")
        : diff > 0
          ? t("run:anomaly.exactOver", { n: diff })
          : t("run:anomaly.exactUnder", { n: -diff });
    return (
      <Group justify="space-between" mt="xs">
        <Text fw={700} c={diff === 0 ? SOLVED_GREEN : tokens.text}>
          {t("run:anomaly.exactEq", { n: goal.value })}
        </Text>
        <Text
          fw={700}
          c={diff === 0 ? SOLVED_GREEN : diff > 0 ? tokens.danger : tokens.dim}
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {t("run:anomaly.exactNow", { n: now })} · {tag}
        </Text>
      </Group>
    );
  }

  if (goal.g === "constraint") {
    const baseNow = scoreMetric(goal.base.metric, score);
    const baseOk = baseNow >= goal.base.min;
    return (
      <Stack gap={4} mt="xs">
        <CheckRow
          ok={baseOk}
          label={t(`run:anomaly.m_${goal.base.metric}`, {
            n: baseNow,
            target: goal.base.min,
          })}
        />
        {goal.rules.map((rule, i) => (
          <CheckRow
            key={i}
            ok={evalConstraintRule(puzzle, rule, placement, score)}
            label={ruleLabel(t, rule)}
          />
        ))}
      </Stack>
    );
  }

  if (goal.g === "order") {
    return (
      <Stack gap={4} mt="xs">
        {goal.steps.map((step, i) => (
          <CheckRow key={i} ok={evalOrderStep(step, score)} label={stepLabel(t, step)} />
        ))}
      </Stack>
    );
  }

  if (goal.g === "survivePlus") {
    const clauseNow = scoreMetric(goal.clause.metric, score);
    return (
      <Stack gap={4} mt="xs">
        <CheckRow ok={score.hullAfter > 0} label={t("run:anomaly.surviveLabel")} />
        <CheckRow
          ok={clauseNow >= goal.clause.min}
          label={t("run:anomaly.clause", {
            n: goal.clause.min,
            metric: t(`run:anomaly.metric.${goal.clause.metric}`),
          })}
        />
      </Stack>
    );
  }

  if (goal.g === "multiTurn") {
    const value = mtMetric ?? 0;
    const ok = value >= goal.final.min;
    const key =
      goal.final.metric === "damage"
        ? "run:anomaly.cumDamage"
        : goal.final.metric === "charge"
          ? "run:anomaly.cumCharge"
          : "run:anomaly.cumShield";
    return (
      <Text fw={700} c={ok ? SOLVED_GREEN : tokens.text} mt="xs">
        {t(key, { n: value, target: goal.final.min })}
      </Text>
    );
  }

  if (goal.g === "deduction") {
    return (
      <GoalBanner
        puzzle={{ ...puzzle, goal: goal.inner }}
        score={score}
        placement={placement}
        t={t}
        mtMetric={null}
      />
    );
  }

  const metric = primaryMetric(goal);
  const now = scoreMetric(metric, score);
  const target = goal.g === "survive" ? null : goal.min;
  const ok = goal.g === "survive" ? score.hullAfter > 0 : now >= goal.min;
  return (
    <Text fw={700} c={ok ? SOLVED_GREEN : tokens.text} mt="xs">
      {target === null
        ? t(metricLabelKey(metric), { n: now })
        : t(metricLabelKey(metric), { n: now, target })}
    </Text>
  );
};
