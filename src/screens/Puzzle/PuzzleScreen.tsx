import { Box, Button, Group, Paper, Stack, Text, Title } from "@mantine/core";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { tokens } from "@/app/theme";
import { DIE_BY_ID, rollBaseValue } from "@/data/dice";
import {
  PUZZLE_BY_ID,
  PUZZLES,
  type ConstraintRule,
  type OrderStep,
  type PuzzleDef,
  type PuzzleMetric,
} from "@/data/puzzles";
import { schools } from "@/data/schools";
import { slotCapForMk } from "@/data/slots";
import {
  advanceMultiTurn,
  evalConstraintRule,
  evalOrderStep,
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
import { completeNode } from "@/game/run/flow";
import { interferenceImminent } from "@/game/run/interference";
import { createStream, deriveSeed } from "@/services/rng";
import { useAppStore } from "@/stores/appStore";
import { useMetaStore } from "@/stores/metaStore";
import { useRunStore } from "@/stores/runStore";
import type { SlotId } from "@/types/battle";
import type { School } from "@/types/content";

const DEFAULT_REROLL_SIZE = 2;
const MAX_NEW_ROLLS = 3;
const GREEN = "#A8DF8E";

let entryNonce = 0;

const withoutSlot = (placement: Placement, slot: SlotId): Placement => {
  const next: Placement = {};
  for (const [s, i] of Object.entries(placement)) {
    if (s !== slot && i !== undefined) next[s as SlotId] = i;
  }
  return next;
};

const pickPuzzle = (nodeId: string): PuzzleDef | null => {
  const s = useRunStore.getState();
  const stream = createStream(deriveSeed(s.seed, `puzzle:${nodeId}`));
  const unsolved = PUZZLES.filter((p) => !s.solvedPuzzles.includes(p.id));
  const pool = unsolved.length > 0 ? unsolved : PUZZLES;
  return pool.length > 0 ? stream.pick(pool) : null;
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
  color,
  onClick,
}: {
  school: School;
  value: number;
  active: boolean;
  faded: boolean;
  reserved: boolean;
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
        opacity: faded ? 0.4 : 1,
        cursor: "pointer",
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

  // legacy scalar arms
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

const PuzzleRunner = ({
  puzzle,
  nodeId,
  forced,
}: {
  puzzle: PuzzleDef;
  nodeId: string;
  forced: boolean;
}) => {
  const { t } = useTranslation(["run", "battle", "content"]);
  const seed = useRunStore((s) => s.seed);
  const anomalyStreak = useRunStore((s) => s.anomalyStreak);
  const attemptRef = useRef(0);
  const rerollSeqRef = useRef(0);
  const grantedRef = useRef(false);
  const [runKey] = useState(() => {
    entryNonce += 1;
    return `${nodeId}:${String(entryNonce)}`;
  });

  const isDeduction = puzzle.goal.g === "deduction";
  const isMultiTurn = puzzle.goal.g === "multiTurn";
  const turns = puzzle.goal.g === "multiTurn" ? puzzle.goal.turns : 1;

  const [values, setValues] = useState<number[]>(() =>
    puzzle.fixedRoll !== undefined
      ? [...puzzle.fixedRoll]
      : rollDeck(puzzle, seed, `trial:${runKey}:0`),
  );
  const [placement, setPlacement] = useState<Placement>({});
  const [selected, setSelected] = useState<number | null>(null);
  const [reserved, setReserved] = useState<number | null>(null);
  const [turnIndex, setTurnIndex] = useState(0);
  const [mtState, setMtState] = useState<MultiTurnState>(() =>
    initialMultiTurnState(puzzle),
  );
  const [rerollsLeft, setRerollsLeft] = useState(puzzle.rerolls);
  const [rerollMode, setRerollMode] = useState(false);
  const [rerollPick, setRerollPick] = useState<number[]>([]);
  const [checked, setChecked] = useState<boolean | null>(null);
  const [newRolls, setNewRolls] = useState(0);
  const [failedOut, setFailedOut] = useState(false);

  const rerollSize = puzzle.rerollSize ?? DEFAULT_REROLL_SIZE;
  const blocked = new Set<SlotId>(puzzle.blocked ?? []);

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
    const run = useRunStore.getState();
    if (forced) {
      if (puzzle.reward.codex !== undefined) {
        useMetaStore.getState().unlockCodex(puzzle.reward.codex);
      }
      return;
    }
    run.recordAnomalySolved();
    if (!run.solvedPuzzles.includes(puzzle.id)) {
      run.addScrap(puzzle.reward.scrap);
      if (puzzle.reward.die !== undefined) run.addDie(puzzle.reward.die);
      if (puzzle.reward.codex !== undefined) {
        useMetaStore.getState().unlockCodex(puzzle.reward.codex);
      }
      run.markPuzzleSolved(puzzle.id);
    }
  };

  const tapDie = (index: number): void => {
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
    if (selected === null || selected === reserved || !legalAssign(puzzle, selected, slot)) {
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
    const seq = rerollSeqRef.current + 1;
    rerollSeqRef.current = seq;
    const stream = createStream(
      deriveSeed(seed, `trial:${runKey}:${String(attemptRef.current)}:t${String(turnIndex)}:r${String(seq)}`),
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

  const fresh = (): void => {
    const attempt = attemptRef.current + 1;
    attemptRef.current = attempt;
    setValues(rollDeck(puzzle, seed, `trial:${runKey}:${String(attempt)}`));
    setPlacement({});
    setSelected(null);
    setReserved(null);
    setTurnIndex(0);
    setMtState(initialMultiTurnState(puzzle));
    setRerollsLeft(puzzle.rerolls);
    setRerollMode(false);
    setRerollPick([]);
    setChecked(null);
  };

  // New rolls (full re-rolls of the board) are budgeted so a trial can't be
  // brute-forced by spamming a fresh roll until the right values land. Rerolls
  // (partial, per board) stay governed by puzzle.rerolls.
  const newRollsLeft = MAX_NEW_ROLLS - newRolls;
  const requestNewRoll = (): void => {
    if (newRollsLeft <= 0) {
      setFailedOut(true);
      return;
    }
    fresh();
    setNewRolls((n) => n + 1);
  };

  const endTurn = (): void => {
    if (projected === null) return;
    const attempt = attemptRef.current;
    const nextTurn = turnIndex + 1;
    const carried = reserved;
    setMtState(projected);
    setTurnIndex(nextTurn);
    setValues(
      rollDeck(puzzle, seed, `trial:${runKey}:${String(attempt)}:turn${String(nextTurn)}`, (i) =>
        i === carried ? values[i] : undefined,
      ),
    );
    setPlacement({});
    setSelected(null);
    setReserved(null);
    setRerollsLeft(puzzle.rerolls);
    setRerollMode(false);
    setRerollPick([]);
    setChecked(null);
  };

  const resolve = (): void => {
    const solved = reached;
    setChecked(solved);
    if (solved) grantReward();
  };

  const solved = checked === true;
  const showLeaveWarning = !forced && interferenceImminent(anomalyStreak) && !solved;

  return (
    <Stack mih="100dvh" p="md" gap="sm" bg={tokens.bg}>
      <Group justify="space-between">
        <Title order={3} c={tokens.text}>
          {t("run:anomaly.title")}
        </Title>
        <Button size="compact-sm" variant="subtle" color="gray" onClick={done}>
          {t("run:anomaly.leave")}
        </Button>
      </Group>

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
          {t("run:anomaly.goal")}: {t(puzzle.goalText)}
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

        {!isDeduction ? (
          <Text size="sm" c={tokens.dim} mt={6} style={{ textAlign: "right" }}>
            {t("run:anomaly.rerolls", { n: rerollsLeft })}
          </Text>
        ) : null}
      </Paper>

      <Text size="xs" c={tokens.faint}>
        {isDeduction
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
              color={rerollMode ? tokens.danger : tokens.amber}
              onClick={() => {
                tapDie(index);
              }}
            />
          );
        })}
      </Group>

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
        >
          <Text c={solved ? GREEN : tokens.danger} fw={600}>
            {solved ? t("run:anomaly.solved") : t("run:anomaly.failed")}
          </Text>
          {solved ? (
            <Text size="sm" c={tokens.dim}>
              {t("run:anomaly.reward", { n: puzzle.reward.scrap })}
            </Text>
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
        >
          <Text c={tokens.danger} fw={600}>
            {t("run:anomaly.outOfRollsTitle")}
          </Text>
          <Text size="sm" c={tokens.dim}>
            {t("run:anomaly.outOfRolls")}
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
        <Button mt="auto" onClick={done}>
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
          {isDeduction ? (
            <Button variant="default" onClick={resetPlacement}>
              {t("run:anomaly.reset")}
            </Button>
          ) : (
            <Group grow>
              <Button
                variant="default"
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
                color={newRollsLeft <= 0 ? "red" : undefined}
                onClick={requestNewRoll}
              >
                {newRollsLeft > 0
                  ? t("run:anomaly.retryLeft", { n: newRollsLeft })
                  : t("run:anomaly.giveUp")}
              </Button>
            </Group>
          )}
          {isMultiTurn && !isFinalTurn ? (
            <Button onClick={endTurn}>{t("run:anomaly.nextTurn")}</Button>
          ) : (
            <Button onClick={resolve}>{t("run:anomaly.resolve")}</Button>
          )}
        </Stack>
      )}
    </Stack>
  );
};

export const PuzzleScreen = () => {
  const position = useRunStore((s) => s.position);
  const forcedId = useAppStore((s) => s.params?.puzzleId);
  const forced = forcedId !== undefined;
  const nodeId = position ?? "dbg";
  const [puzzle] = useState<PuzzleDef | null>(() => {
    if (forcedId !== undefined) return PUZZLE_BY_ID.get(forcedId) ?? null;
    return position === null ? null : pickPuzzle(position);
  });

  if (puzzle === null || (!forced && position === null)) {
    return <Box bg={tokens.bg} mih="100dvh" />;
  }
  return <PuzzleRunner puzzle={puzzle} nodeId={nodeId} forced={forced} />;
};
