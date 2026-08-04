import { Badge, Button, Group, Paper, Stack, Text, Title } from "@mantine/core";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Screen } from "@/app/Screen";
import { tokens } from "@/app/theme";
import { TierBadge } from "@/components/TierBadge";
import { DIE_BY_ID, rollBaseValue } from "@/data/dice";
import {
  PUZZLE_BY_ID,
  type ConstraintRule,
  type OrderStep,
  type PuzzleDef,
  type PuzzleMetric,
} from "@/data/puzzles";
import { schools } from "@/data/schools";
import { slotCapForMk } from "@/data/slots";
import {
  advanceMultiTurn,
  dieIsLocked,
  evalConstraintRule,
  evalOrderStep,
  goalTarget,
  initialMultiTurnState,
  legalAssign,
  multiTurnMetric,
  multiTurnSatisfied,
  placementSatisfied,
  primaryMetric,
  scoreMetric,
  scorePlacement,
  type MultiTurnState,
  type Placement,
  type TrialScore,
} from "@/game/puzzles/evaluate";
import { puzzleForNode } from "@/game/puzzles/selection";
import {
  TIER_STAKES,
  attemptCost,
  attemptsLeft,
  isDeduction,
  maxAttempts,
  rewardFor,
  type PuzzleReward,
} from "@/game/puzzles/stakes";
import { completeNode } from "@/game/run/flow";
import { interferenceImminent } from "@/game/run/interference";
import { LootReveal } from "@/screens/Battle/LootReveal";
import { createStream, deriveSeed } from "@/services/rng";
import { useAppStore } from "@/stores/appStore";
import { useLootStore } from "@/stores/lootStore";
import { useMetaStore } from "@/stores/metaStore";
import { useRunStore } from "@/stores/runStore";
import type { SlotId } from "@/types/battle";
import type { School } from "@/types/content";

const DEFAULT_REROLL_SIZE = 2;
const GREEN = "#A8DF8E";

const withoutSlot = (placement: Placement, slot: SlotId): Placement => {
  const next: Placement = {};
  for (const [s, i] of Object.entries(placement)) {
    if (s !== slot && i !== undefined) next[s as SlotId] = i;
  }
  return next;
};

const rollDeck = (
  puzzle: PuzzleDef,
  seed: number,
  key: string,
  keep: (index: number) => number | undefined = () => undefined,
): number[] => {
  const stream = createStream(deriveSeed(seed, key));
  return puzzle.deck.map((defId, index) => {
    const kept = keep(index);
    if (kept !== undefined) return kept;
    const def = DIE_BY_ID.get(defId);
    return rollBaseValue(defId, def?.tier ?? 6, stream);
  });
};

const metricLabelKey = (metric: PuzzleMetric | "hull"): string =>
  metric === "hull" ? "run:anomaly.mHull" : `run:anomaly.m_${metric}`;

const ruleLabel = (t: TFunction, rule: ConstraintRule): string => {
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

const stepLabel = (t: TFunction, step: OrderStep): string => {
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

const rewardLines = (
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

const stakeLine = (t: TFunction, puzzle: PuzzleDef): string => {
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

const CheckRow = ({ ok, label }: { ok: boolean; label: string }) => (
  <Group gap={8} wrap="nowrap">
    <Text fw={700} c={ok ? GREEN : tokens.faint} style={{ width: 16 }}>
      {ok ? "✓" : "○"}
    </Text>
    <Text size="sm" c={ok ? GREEN : tokens.dim}>
      {label}
    </Text>
  </Group>
);

const DieChip = ({
  school,
  value,
  active,
  faded,
  reserved,
  locked,
  color,
  onClick,
}: {
  school: School;
  value: number;
  active: boolean;
  faded: boolean;
  reserved: boolean;
  locked: boolean;
  color: string;
  onClick: () => void;
}) => {
  const colors = schools[school];
  return (
    <div
      onClick={onClick}
      style={{
        position: "relative",
        width: 46,
        height: 46,
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: colors.fill,
        border: `2px solid ${reserved ? tokens.amber : active ? color : colors.stroke}`,
        color: colors.text,
        fontWeight: 700,
        fontSize: 18,
        opacity: faded || locked ? 0.4 : 1,
        cursor: locked ? "not-allowed" : "pointer",
      }}
    >
      {value}
      {reserved ? (
        <span
          style={{
            position: "absolute",
            top: -6,
            right: -6,
            background: tokens.amber,
            color: "#1B1300",
            borderRadius: 6,
            fontSize: 10,
            fontWeight: 800,
            padding: "0 4px",
          }}
        >
          R
        </span>
      ) : null}
      {locked ? (
        <span
          style={{
            position: "absolute",
            bottom: -6,
            right: -6,
            background: tokens.line,
            color: tokens.text,
            borderRadius: 6,
            fontSize: 10,
            fontWeight: 800,
            padding: "0 4px",
          }}
        >
          ✕
        </span>
      ) : null}
    </div>
  );
};

interface GoalBannerProps {
  puzzle: PuzzleDef;
  score: TrialScore;
  placement: Placement;
  t: TFunction;
  mtMetric: number | null;
}

const GoalBanner = ({ puzzle, score, placement, t, mtMetric }: GoalBannerProps) => {
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
        <Text fw={700} c={diff === 0 ? GREEN : tokens.text}>
          {t("run:anomaly.exactEq", { n: goal.value })}
        </Text>
        <Text
          fw={700}
          c={diff === 0 ? GREEN : diff > 0 ? tokens.danger : tokens.dim}
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
      <Text fw={700} c={ok ? GREEN : tokens.text} mt="xs">
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
    <Text fw={700} c={ok ? GREEN : tokens.text} mt="xs">
      {target === null
        ? t(metricLabelKey(metric), { n: now })
        : t(metricLabelKey(metric), { n: now, target })}
    </Text>
  );
};

interface FlowProps {
  puzzle: PuzzleDef;
  nodeId: string;
  forced: boolean;
}

const EntryCard = ({
  puzzle,
  reward,
  onEnter,
  onLeave,
}: {
  puzzle: PuzzleDef;
  reward: PuzzleReward;
  onEnter: () => void;
  onLeave: () => void;
}) => {
  const { t } = useTranslation(["run", "battle", "content"]);
  const interference = useRunStore((s) => s.interferenceStacks);

  return (
    <Screen
      width="narrow"
      centered
      header={
        <Title order={3} c={tokens.text}>
          {t("run:anomaly.title")}
        </Title>
      }
      footer={
        <Stack gap={6}>
          <Button size="md" onClick={onEnter} data-testid="puzzle-enter">
            {t("run:anomaly.entryEnter")}
          </Button>
          <Button variant="subtle" color="gray" onClick={onLeave}>
            {t("run:anomaly.leave")}
          </Button>
          <Text size="xs" c={tokens.faint} ta="center">
            {t("run:anomaly.entryLeaveNote")}
          </Text>
        </Stack>
      }
    >
      <Paper bg={tokens.surface1} p="md" radius="md" withBorder>
        <Stack gap="sm">
          <Group gap="sm" wrap="nowrap">
            <TierBadge
              tier={puzzle.tier}
              label={t(`run:anomaly.tierName.${puzzle.tier}`)}
            />
            <Text fw={700} c={tokens.accent}>
              {t(puzzle.title)}
            </Text>
          </Group>

          <Text size="sm" c={tokens.dim}>
            {t(puzzle.goalText, { n: goalTarget(puzzle.goal) })}
          </Text>

          <Stack gap={2}>
            <Text size="xs" c={tokens.faint}>
              {t("run:anomaly.rewardPreview")}
            </Text>
            {rewardLines(t, puzzle, reward).map((line) => (
              <Text key={line} size="sm" c={tokens.text}>
                {line}
              </Text>
            ))}
          </Stack>

          <Stack gap={2}>
            <Text size="xs" c={tokens.faint}>
              {t("run:anomaly.stakes")}
            </Text>
            <Text size="sm" c={tokens.text}>
              {stakeLine(t, puzzle)}
            </Text>
          </Stack>

          <Text size="sm" c={interference > 0 ? tokens.danger : tokens.dim}>
            {interference > 0
              ? t("run:anomaly.interferenceNow", { n: interference })
              : t("run:anomaly.interferenceNone")}
          </Text>
        </Stack>
      </Paper>
    </Screen>
  );
};

const PuzzleRunner = ({ puzzle, nodeId, forced }: FlowProps) => {
  const { t } = useTranslation(["run", "battle", "content"]);
  const seed = useRunStore((s) => s.seed);
  const scrap = useRunStore((s) => s.scrap);
  const anomalyStreak = useRunStore((s) => s.anomalyStreak);
  const attemptsUsed = useRunStore(
    (s) => s.puzzleRuns[nodeId]?.attempts ?? 0,
  );
  const grantedRef = useRef(false);

  const reward = useMemo(
    () => rewardFor(puzzle, createStream(deriveSeed(seed, `reward:${nodeId}`))),
    [puzzle, seed, nodeId],
  );

  const deduction = isDeduction(puzzle);
  const isMultiTurn = puzzle.goal.g === "multiTurn";
  const turns = puzzle.goal.g === "multiTurn" ? puzzle.goal.turns : 1;
  const boardIndex = deduction ? 0 : Math.max(0, attemptsUsed - 1);

  const [values, setValues] = useState<number[]>(() =>
    puzzle.fixedRoll !== undefined
      ? [...puzzle.fixedRoll]
      : rollDeck(puzzle, seed, `trial:${nodeId}:${String(boardIndex)}`),
  );
  const [placement, setPlacement] = useState<Placement>({});
  const [selected, setSelected] = useState<number | null>(null);
  const [reserved, setReserved] = useState<number | null>(null);
  const [turnIndex, setTurnIndex] = useState(0);
  const [mtState, setMtState] = useState<MultiTurnState>(() =>
    initialMultiTurnState(puzzle),
  );
  const [rerollsLeft, setRerollsLeft] = useState(puzzle.rerolls);
  const [rerollSeq, setRerollSeq] = useState(0);
  const [rerollMode, setRerollMode] = useState(false);
  const [rerollPick, setRerollPick] = useState<number[]>([]);
  const [checked, setChecked] = useState<boolean | null>(null);
  const [claimed, setClaimed] = useState(reward.choice === undefined);

  const rerollSize = puzzle.rerollSize ?? DEFAULT_REROLL_SIZE;
  const blocked = new Set<SlotId>(puzzle.blocked ?? []);
  const left = attemptsLeft(puzzle, attemptsUsed);
  const nextCost = attemptCost(puzzle, attemptsUsed);
  const canAfford = nextCost <= scrap;

  const slotOfDie = useMemo(() => {
    const map = new Map<number, SlotId>();
    for (const [slot, index] of Object.entries(placement)) {
      if (index !== undefined) map.set(index, slot as SlotId);
    }
    return map;
  }, [placement]);

  const score = useMemo(
    () => scorePlacement(puzzle, values, placement, isMultiTurn ? mtState.carry : undefined),
    [puzzle, values, placement, isMultiTurn, mtState.carry],
  );

  const projected = useMemo(
    () => (isMultiTurn ? advanceMultiTurn(puzzle, mtState, values, placement) : null),
    [isMultiTurn, puzzle, mtState, values, placement],
  );

  const mtMetric = projected === null ? null : multiTurnMetric(puzzle, projected);
  const isFinalTurn = turnIndex >= turns - 1;

  const reached = isMultiTurn
    ? projected !== null && isFinalTurn && multiTurnSatisfied(puzzle, projected)
    : placementSatisfied(puzzle, values, placement);

  const solved = checked === true;
  const failedOut = checked === false && left <= 0;

  const done = (): void => {
    if (!forced && !grantedRef.current) {
      useRunStore.getState().recordAnomalyUnsolved();
    }
    if (forced) useAppStore.getState().go("map");
    else completeNode({ outcome: "cleared" });
  };

  const grantReward = (): void => {
    if (grantedRef.current) return;
    grantedRef.current = true;
    const meta = useMetaStore.getState();
    if (forced) {
      if (reward.codex !== undefined) meta.unlockCodex(reward.codex);
      return;
    }
    const run = useRunStore.getState();
    run.recordAnomalySolved();
    if (run.solvedPuzzles.includes(puzzle.id)) return;
    run.addScrap(reward.scrap);
    if (reward.codex !== undefined) meta.unlockCodex(reward.codex);
    if (reward.die !== undefined) {
      run.addDie(reward.die);
      useLootStore.getState().drop(reward.die);
    }
    run.markPuzzleSolved(puzzle.id);
  };

  const claimDie = (): void => {
    if (claimed || reward.choice === undefined) return;
    setClaimed(true);
    if (forced) return;
    useRunStore.getState().addDie(reward.choice.die);
    useLootStore.getState().drop(reward.choice.die);
  };

  const claimVoucher = (): void => {
    if (claimed || reward.choice === undefined) return;
    setClaimed(true);
    if (forced) return;
    useRunStore.getState().addVoucher(reward.choice.vouchers);
  };

  const tapDie = (index: number): void => {
    if (dieIsLocked(puzzle, index, turnIndex)) return;
    if (rerollMode) {
      if (slotOfDie.has(index) || index === reserved) return;
      setRerollPick((pick) =>
        pick.includes(index)
          ? pick.filter((i) => i !== index)
          : pick.length < rerollSize
            ? [...pick, index]
            : pick,
      );
      return;
    }
    if (reserved === index) {
      setReserved(null);
      return;
    }
    const slot = slotOfDie.get(index);
    if (slot !== undefined) {
      setPlacement((p) => withoutSlot(p, slot));
      setChecked(null);
      return;
    }
    setSelected((cur) => (cur === index ? null : index));
  };

  const tapSlot = (slot: SlotId): void => {
    if (rerollMode) return;
    const occupant = placement[slot];
    if (occupant !== undefined) {
      setPlacement((p) => withoutSlot(p, slot));
      setChecked(null);
      return;
    }
    if (
      selected === null ||
      selected === reserved ||
      !legalAssign(puzzle, selected, slot, turnIndex)
    ) {
      return;
    }
    setPlacement((p) => ({ ...p, [slot]: selected }));
    setSelected(null);
    setChecked(null);
  };

  const toggleReserve = (): void => {
    if (selected === null || slotOfDie.has(selected)) return;
    setReserved((cur) => (cur === selected ? null : selected));
    setSelected(null);
  };

  const confirmReroll = (): void => {
    if (rerollPick.length === 0 || rerollsLeft <= 0) {
      setRerollMode(false);
      setRerollPick([]);
      return;
    }
    const seq = rerollSeq + 1;
    setRerollSeq(seq);
    const stream = createStream(
      deriveSeed(
        seed,
        `trial:${nodeId}:${String(boardIndex)}:t${String(turnIndex)}:r${String(seq)}`,
      ),
    );
    setValues((vals) =>
      vals.map((v, i) => {
        if (!rerollPick.includes(i) || i === reserved) return v;
        const def = DIE_BY_ID.get(puzzle.deck[i] ?? "");
        return rollBaseValue(puzzle.deck[i] ?? "", def?.tier ?? 6, stream);
      }),
    );
    setRerollsLeft((n) => n - 1);
    setRerollMode(false);
    setRerollPick([]);
    setChecked(null);
  };

  const resetPlacement = (): void => {
    setPlacement({});
    setSelected(null);
    setChecked(null);
  };

  const newAttempt = (): void => {
    if (left <= 0) return;
    if (nextCost > 0 && !useRunStore.getState().spendScrap(nextCost)) return;
    const attempt = useRunStore.getState().spendPuzzleAttempt(nodeId);
    setValues(rollDeck(puzzle, seed, `trial:${nodeId}:${String(attempt - 1)}`));
    setPlacement({});
    setSelected(null);
    setReserved(null);
    setTurnIndex(0);
    setMtState(initialMultiTurnState(puzzle));
    setRerollsLeft(puzzle.rerolls);
    setRerollSeq(0);
    setRerollMode(false);
    setRerollPick([]);
    setChecked(null);
  };

  const endTurn = (): void => {
    if (projected === null) return;
    const nextTurn = turnIndex + 1;
    const carried = reserved;
    setMtState(projected);
    setTurnIndex(nextTurn);
    setValues(
      rollDeck(
        puzzle,
        seed,
        `trial:${nodeId}:${String(boardIndex)}:turn${String(nextTurn)}`,
        (i) => (i === carried ? values[i] : undefined),
      ),
    );
    setPlacement({});
    setSelected(null);
    setReserved(null);
    setRerollsLeft(puzzle.rerolls);
    setRerollSeq(0);
    setRerollMode(false);
    setRerollPick([]);
    setChecked(null);
  };

  const resolve = (): void => {
    const won = reached;
    setChecked(won);
    if (won) {
      grantReward();
      return;
    }
    if (deduction) useRunStore.getState().spendPuzzleAttempt(nodeId);
  };

  const showLeaveWarning =
    !forced && interferenceImminent(anomalyStreak) && !solved;

  const attemptsChip = deduction
    ? t("run:anomaly.submissionsLeft", { n: left })
    : t("run:anomaly.attemptChip", {
        cur: attemptsUsed,
        max: maxAttempts(puzzle),
      });

  return (
    <Screen
      width="wide"
      overlay={<LootReveal />}
      header={
        <Group justify="space-between" wrap="nowrap">
          <Group gap="xs" wrap="nowrap">
            <TierBadge tier={puzzle.tier} compact />
            <Title order={4} c={tokens.text}>
              {t("run:anomaly.title")}
            </Title>
          </Group>
          <Button size="compact-sm" variant="subtle" color="gray" onClick={done}>
            {t("run:anomaly.leave")}
          </Button>
        </Group>
      }
    >
      <Stack gap="sm">
        <Paper bg={tokens.surface1} p="md" radius="md" withBorder>
          <Group justify="space-between">
            <Text fw={600} c={tokens.accent}>
              {t(puzzle.title)}
            </Text>
            {isMultiTurn ? (
              <Text size="sm" fw={700} c={tokens.amber}>
                {t("run:anomaly.turn", { cur: turnIndex + 1, max: turns })}
              </Text>
            ) : null}
          </Group>
          <Text size="sm" c={tokens.dim} mt={4}>
            {t("run:anomaly.goal")}: {t(puzzle.goalText, { n: goalTarget(puzzle.goal) })}
          </Text>

          <GoalBanner
            puzzle={puzzle}
            score={score}
            placement={placement}
            t={t}
            mtMetric={mtMetric}
          />

          {isMultiTurn ? (
            <Text size="xs" c={tokens.faint} mt={6}>
              {t("run:anomaly.carry")}{" "}
              {mtState.cumDamage === 0 &&
              mtState.carry.charge === 0 &&
              mtState.carry.burn === 0 &&
              reserved === null
                ? t("run:anomaly.carryNone")
                : [
                    mtState.carry.charge > 0
                      ? t("run:anomaly.carryCharge", { n: mtState.carry.charge })
                      : null,
                    mtState.carry.burn > 0
                      ? t("run:anomaly.carryBurn", { n: mtState.carry.burn })
                      : null,
                    reserved !== null
                      ? t("run:anomaly.carryReserved", {
                          n: DIE_BY_ID.get(puzzle.deck[reserved] ?? "")?.tier ?? 6,
                        })
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
            </Text>
          ) : null}

          <Group justify="space-between" mt={6} wrap="wrap" gap={6}>
            <Badge
              variant="light"
              color={left <= 0 ? "red" : left === 1 ? "yellow" : "gray"}
              data-testid="puzzle-attempts"
            >
              {attemptsChip}
            </Badge>
            {!deduction ? (
              <Text size="sm" c={tokens.dim}>
                {t("run:anomaly.rerolls", { n: rerollsLeft })}
              </Text>
            ) : null}
          </Group>
        </Paper>

        <Text size="xs" c={tokens.faint}>
          {deduction
            ? t("run:anomaly.fixed")
            : rerollMode
              ? t("run:anomaly.rerollHint", { n: rerollSize })
              : t("run:anomaly.tray")}
        </Text>
        <Group gap="xs">
          {puzzle.deck.map((defId, index) => {
            const def = DIE_BY_ID.get(defId);
            const placed = slotOfDie.has(index);
            const marked = rerollPick.includes(index);
            return (
              <DieChip
                key={index}
                school={def?.school ?? "grey"}
                value={values[index] ?? 1}
                active={rerollMode ? marked : selected === index}
                faded={placed}
                reserved={reserved === index}
                locked={dieIsLocked(puzzle, index, turnIndex)}
                color={rerollMode ? tokens.danger : tokens.amber}
                onClick={() => {
                  tapDie(index);
                }}
              />
            );
          })}
        </Group>

        {(puzzle.locks ?? 0) > 0 && turnIndex === 0 ? (
          <Text size="xs" c={tokens.faint}>
            {t("run:anomaly.locked", { n: puzzle.locks ?? 0 })}
          </Text>
        ) : null}

        {isMultiTurn && !rerollMode ? (
          <Button
            size="compact-xs"
            variant="default"
            disabled={selected === null || (selected !== null && slotOfDie.has(selected))}
            onClick={toggleReserve}
          >
            {reserved !== null && reserved === selected
              ? t("run:anomaly.unreserve")
              : t("run:anomaly.reserve")}
          </Button>
        ) : null}

        <Text size="xs" c={tokens.faint}>
          {t("run:anomaly.slots")}
        </Text>
        <Stack gap={6}>
          {puzzle.slots.map((slot) => {
            const isBlocked = blocked.has(slot);
            const occupant = placement[slot];
            const value = occupant !== undefined ? values[occupant] : undefined;
            const mk = puzzle.mk?.[slot] ?? 1;
            return (
              <Paper
                key={slot}
                bg={isBlocked ? tokens.bg : tokens.surface1}
                p="xs"
                radius="sm"
                withBorder
                opacity={isBlocked ? 0.5 : 1}
                style={{ cursor: isBlocked || rerollMode ? "default" : "pointer" }}
                onClick={() => {
                  if (!isBlocked) tapSlot(slot);
                }}
              >
                <Group justify="space-between" wrap="nowrap">
                  <Stack gap={0}>
                    <Text size="sm" c={tokens.text}>
                      {t(`battle:slot.${slot}`)}
                    </Text>
                    <Text size="xs" c={tokens.faint}>
                      {t("battle:slot.cap", { cap: slotCapForMk(slot, mk), mk })}
                    </Text>
                  </Stack>
                  {isBlocked ? (
                    <Text size="sm" c={tokens.danger}>
                      {t("battle:jam")}
                    </Text>
                  ) : value !== undefined ? (
                    <Text size="lg" fw={700} c={tokens.text}>
                      {value}
                    </Text>
                  ) : (
                    <Text size="sm" c={tokens.faint}>
                      +
                    </Text>
                  )}
                </Group>
              </Paper>
            );
          })}
        </Stack>

        {checked !== null ? (
          <Paper
            bg={tokens.surface2}
            p="sm"
            radius="sm"
            withBorder
            style={{ borderColor: solved ? "#6FBF4B" : tokens.danger }}
            data-testid={solved ? "puzzle-solved" : "puzzle-missed"}
          >
            <Text c={solved ? GREEN : tokens.danger} fw={600}>
              {solved ? t("run:anomaly.solved") : t("run:anomaly.failed")}
            </Text>
            {solved ? (
              <Stack gap={4} mt={4}>
                {rewardLines(t, puzzle, reward).map((line) => (
                  <Text key={line} size="sm" c={tokens.dim}>
                    {line}
                  </Text>
                ))}
                {reward.choice !== undefined && !claimed ? (
                  <Group grow mt={4}>
                    <Button size="compact-sm" onClick={claimDie}>
                      {t("run:anomaly.takeDie", {
                        name: t(
                          DIE_BY_ID.get(reward.choice.die)?.name ??
                            reward.choice.die,
                        ),
                      })}
                    </Button>
                    <Button size="compact-sm" variant="default" onClick={claimVoucher}>
                      {t("run:anomaly.takeVoucher")}
                    </Button>
                  </Group>
                ) : null}
              </Stack>
            ) : null}
          </Paper>
        ) : null}

        {failedOut ? (
          <Paper
            bg={tokens.surface2}
            p="sm"
            radius="sm"
            withBorder
            style={{ borderColor: tokens.danger }}
            data-testid="puzzle-out"
          >
            <Text c={tokens.danger} fw={600}>
              {t("run:anomaly.outOfAttemptsTitle")}
            </Text>
            <Text size="sm" c={tokens.dim}>
              {t("run:anomaly.outOfAttempts")}
            </Text>
          </Paper>
        ) : null}

        {showLeaveWarning && !failedOut ? (
          <Text size="xs" c={tokens.danger} ta="center">
            {t("run:anomaly.interferenceWarn")}
          </Text>
        ) : null}

        {failedOut ? (
          <Button mt="auto" color="red" onClick={done}>
            {t("run:anomaly.toMap")}
          </Button>
        ) : solved ? (
          <Button mt="auto" disabled={!claimed} onClick={done}>
            {t("run:event.continue")}
          </Button>
        ) : rerollMode ? (
          <Group grow mt="auto">
            <Button
              variant="default"
              onClick={() => {
                setRerollMode(false);
                setRerollPick([]);
              }}
            >
              {t("run:anomaly.rerollCancel")}
            </Button>
            <Button disabled={rerollPick.length === 0} onClick={confirmReroll}>
              {t("run:anomaly.rerollConfirm", { k: rerollPick.length })}
            </Button>
          </Group>
        ) : (
          <Stack gap={6} mt="auto">
            {deduction ? (
              <Button variant="default" onClick={resetPlacement}>
                {t("run:anomaly.reset")}
              </Button>
            ) : (
              <Group grow align="stretch">
                <Button
                  variant="default"
                  styles={{ label: { whiteSpace: "normal", lineHeight: 1.2 } }}
                  disabled={rerollsLeft <= 0}
                  onClick={() => {
                    setRerollMode(true);
                    setSelected(null);
                  }}
                >
                  {t("run:anomaly.reroll", { n: rerollsLeft })}
                </Button>
                <Button
                  variant="default"
                  styles={{ label: { whiteSpace: "normal", lineHeight: 1.2 } }}
                  disabled={left <= 0 || !canAfford}
                  onClick={newAttempt}
                  data-testid="puzzle-new-attempt"
                >
                  {nextCost > 0
                    ? t("run:anomaly.newAttemptCost", { n: nextCost })
                    : t("run:anomaly.newAttempt", { n: left })}
                </Button>
              </Group>
            )}
            {isMultiTurn && !isFinalTurn ? (
              <Button onClick={endTurn}>{t("run:anomaly.nextTurn")}</Button>
            ) : (
              <Button onClick={resolve} data-testid="puzzle-resolve">
                {t("run:anomaly.resolve")}
              </Button>
            )}
          </Stack>
        )}
      </Stack>
    </Screen>
  );
};

const PuzzleFlow = ({ puzzle, nodeId, forced }: FlowProps) => {
  const bound = useRunStore((s) => s.puzzleRuns[nodeId]);
  const entered = forced || bound?.puzzleId === puzzle.id;
  const seed = useRunStore((s) => s.seed);
  const reward = useMemo(
    () => rewardFor(puzzle, createStream(deriveSeed(seed, `reward:${nodeId}`))),
    [puzzle, seed, nodeId],
  );

  const enter = (): void => {
    const run = useRunStore.getState();
    run.beginPuzzle(nodeId, puzzle.id);
    useMetaStore.getState().markPuzzleSeen(puzzle.id);
    if (!isDeduction(puzzle)) run.spendPuzzleAttempt(nodeId);
  };

  const leave = (): void => {
    useRunStore.getState().recordAnomalyUnsolved();
    completeNode({ outcome: "cleared" });
  };

  if (!entered) {
    return (
      <EntryCard
        puzzle={puzzle}
        reward={reward}
        onEnter={enter}
        onLeave={leave}
      />
    );
  }
  return (
    <PuzzleRunner
      key={puzzle.id}
      puzzle={puzzle}
      nodeId={nodeId}
      forced={forced}
    />
  );
};

export const PuzzleScreen = () => {
  const position = useRunStore((s) => s.position);
  const forcedId = useAppStore((s) => s.params?.puzzleId);
  const forced = forcedId !== undefined;
  const nodeId = position ?? "dbg";

  const [puzzle] = useState<PuzzleDef | null>(() => {
    if (forcedId !== undefined) return PUZZLE_BY_ID.get(forcedId) ?? null;
    const run = useRunStore.getState();
    const bound = run.puzzleRuns[nodeId];
    if (bound !== undefined) return PUZZLE_BY_ID.get(bound.puzzleId) ?? null;
    const node = run.map?.nodes.find((n) => n.id === position);
    if (node === undefined) return null;
    return puzzleForNode(
      run.seed,
      node,
      run.solvedPuzzles,
      useMetaStore.getState().seenPuzzles,
    );
  });

  if (puzzle === null || (!forced && position === null)) return <Screen />;
  return <PuzzleFlow puzzle={puzzle} nodeId={nodeId} forced={forced} />;
};
