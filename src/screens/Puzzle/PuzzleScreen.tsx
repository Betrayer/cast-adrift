import { Badge, Button, Group, Paper, Stack, Text } from "@mantine/core";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Screen } from "@/app/Screen";
import { AppHeader } from "@/components/AppHeader";
import { tokens } from "@/app/theme";
import { TierBadge } from "@/components/TierBadge";
import { DIE_BY_ID } from "@/data/dice";
import { PUZZLE_BY_ID, type PuzzleDef } from "@/data/puzzles";
import {
  advanceMultiTurn,
  dieIsLocked,
  goalTarget,
  initialMultiTurnState,
  legalAssign,
  multiTurnMetric,
  multiTurnSatisfied,
  placementSatisfied,
  scorePlacement,
  type MultiTurnState,
  type Placement,
} from "@/game/puzzles/evaluate";
import { settleAchievements } from "@/game/meta/achievements";
import { grantDieUnlock } from "@/game/meta/unlockState";
import { puzzleForNode } from "@/game/puzzles/selection";
import { bumpRolls, rerollPuzzleDice, rollPuzzleDeck } from "@/game/puzzles/roll";
import {
  attemptCost,
  attemptsLeft,
  isDeduction,
  maxAttempts,
  rewardFor,
  type PuzzleReward,
} from "@/game/puzzles/stakes";
import { useBackGuard } from "@/app/backGuard";
import { grantDie } from "@/game/run/inventory";
import { completeNode } from "@/game/run/flow";
import { interferenceImminent } from "@/game/run/interference";
import { LootReveal } from "@/screens/Battle/LootReveal";
import { duckMusic, playSfx } from "@/services/audio";
import { createStream, deriveSeed } from "@/services/rng";
import { haptic } from "@/services/tma";
import { useAppStore } from "@/stores/appStore";
import { useLootStore } from "@/stores/lootStore";
import { useMetaStore } from "@/stores/metaStore";
import { useRunStore } from "@/stores/runStore";
import type { SlotId } from "@/types/battle";
import { EntryCard } from "./EntryCard";
import { GoalBanner } from "./GoalBanner";
import { PuzzleDie } from "./PuzzleDie";
import { PuzzleSlots } from "./PuzzleSlots";
import { PuzzleVerdict } from "./PuzzleVerdict";

const DEFAULT_REROLL_SIZE = 2;

const withoutSlot = (placement: Placement, slot: SlotId): Placement => {
  const next: Placement = {};
  for (const [s, i] of Object.entries(placement)) {
    if (s !== slot && i !== undefined) next[s as SlotId] = i;
  }
  return next;
};

interface FlowProps {
  puzzle: PuzzleDef;
  nodeId: string;
  forced: boolean;
}

export const choiceAlreadySettled = (
  reward: PuzzleReward,
  solvedPuzzles: readonly string[],
  puzzleId: string,
): boolean =>
  reward.choice === undefined || solvedPuzzles.includes(puzzleId);

const PuzzleRunner = ({
  puzzle,
  nodeId,
  forced,
  reward,
}: FlowProps & { reward: PuzzleReward }) => {
  const { t } = useTranslation(["run", "battle", "content"]);
  const seed = useRunStore((s) => s.seed);
  const scrap = useRunStore((s) => s.scrap);
  const anomalyStreak = useRunStore((s) => s.anomalyStreak);
  const attemptsUsed = useRunStore(
    (s) => s.puzzleRuns[nodeId]?.attempts ?? 0,
  );
  const grantedRef = useRef(false);

  const deduction = isDeduction(puzzle);
  const isMultiTurn = puzzle.goal.g === "multiTurn";
  const turns = puzzle.goal.g === "multiTurn" ? puzzle.goal.turns : 1;
  const boardIndex = deduction ? 0 : Math.max(0, attemptsUsed - 1);

  const [values, setValues] = useState<number[]>(() =>
    puzzle.fixedRoll !== undefined
      ? [...puzzle.fixedRoll]
      : rollPuzzleDeck(puzzle, seed, `trial:${nodeId}:${String(boardIndex)}`),
  );
  const [rolls, setRolls] = useState<number[]>(() =>
    puzzle.deck.map(() => (puzzle.fixedRoll !== undefined ? 0 : 1)),
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
  const [claimed, setClaimed] = useState(() =>
    choiceAlreadySettled(
      reward,
      useRunStore.getState().solvedPuzzles,
      puzzle.id,
    ),
  );

  const rerollSize = puzzle.rerollSize ?? DEFAULT_REROLL_SIZE;
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

  const lastReached = useRef(reached);
  useEffect(() => {
    if (reached !== lastReached.current) {
      playSfx("ruleTick", { rate: reached ? 1.22 : 0.84 });
      lastReached.current = reached;
    }
  }, [reached]);

  const done = (): void => {
    if (!forced && !grantedRef.current) {
      useRunStore.getState().recordAnomalyUnsolved();
    }
    if (forced) useAppStore.getState().go("map");
    else completeNode({ outcome: "cleared" });
  };

  useBackGuard("puzzle", done);

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
      grantDie(reward.die);
      useLootStore.getState().drop(reward.die);
      if (puzzle.tier === 5) grantDieUnlock(reward.die);
    }
    run.markPuzzleSolved(puzzle.id);
    if (puzzle.tier === 5) {
      meta.bumpLifetime({ t5Solved: 1 });
      settleAchievements();
    }
  };

  const claimDie = (): void => {
    if (claimed || reward.choice === undefined) return;
    playSfx("optionTick", { rate: 1.14 });
    setClaimed(true);
    if (forced) return;
    grantDie(reward.choice.die);
    useLootStore.getState().drop(reward.choice.die);
  };

  const claimVoucher = (): void => {
    if (claimed || reward.choice === undefined) return;
    playSfx("optionTick", { rate: 0.86 });
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
      playSfx("invalid", { gain: 0.5 });
      return;
    }
    playSfx("puzzlePlace");
    setPlacement((p) => ({ ...p, [slot]: selected }));
    setSelected(null);
    setChecked(null);
  };

  const toggleReserve = (): void => {
    if (selected === null || slotOfDie.has(selected)) return;
    setReserved((cur) => (cur === selected ? null : selected));
    setSelected(null);
  };

  const leaveRerollMode = (): void => {
    setRerollMode(false);
    setRerollPick([]);
  };

  const resetBoard = (): void => {
    setPlacement({});
    setSelected(null);
    setReserved(null);
    setRerollsLeft(puzzle.rerolls);
    setRerollSeq(0);
    leaveRerollMode();
    setChecked(null);
  };

  const confirmReroll = (): void => {
    if (rerollPick.length === 0 || rerollsLeft <= 0) {
      leaveRerollMode();
      return;
    }
    playSfx("reroll");
    const seq = rerollSeq + 1;
    setRerollSeq(seq);
    const picked = rerollPick.filter((i) => i !== reserved);
    setValues((vals) =>
      rerollPuzzleDice(
        puzzle,
        vals,
        picked,
        seed,
        `trial:${nodeId}:${String(boardIndex)}:t${String(turnIndex)}:r${String(seq)}`,
      ),
    );
    setRolls((gens) => bumpRolls(gens, (i) => picked.includes(i)));
    setRerollsLeft((n) => n - 1);
    leaveRerollMode();
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
    playSfx(nextCost > 0 ? "buy" : "attemptSpent");
    const attempt = useRunStore.getState().spendPuzzleAttempt(nodeId);
    setValues(rollPuzzleDeck(puzzle, seed, `trial:${nodeId}:${String(attempt - 1)}`));
    setRolls((gens) => bumpRolls(gens, () => true));
    resetBoard();
    setTurnIndex(0);
    setMtState(initialMultiTurnState(puzzle));
  };

  const endTurn = (): void => {
    if (projected === null) return;
    const nextTurn = turnIndex + 1;
    const carried = reserved;
    setMtState(projected);
    setTurnIndex(nextTurn);
    setValues(
      rollPuzzleDeck(
        puzzle,
        seed,
        `trial:${nodeId}:${String(boardIndex)}:turn${String(nextTurn)}`,
        (i) => (i === carried ? values[i] : undefined),
      ),
    );
    setRolls((gens) => bumpRolls(gens, (i) => i !== carried));
    resetBoard();
  };

  const resolve = (): void => {
    const won = reached;
    setChecked(won);
    if (won) {
      const ceremony = puzzle.tier >= 4;
      playSfx(ceremony ? "solveT45" : "solveT13");
      if (ceremony) {
        duckMusic(2000);
        haptic("puzzleSolve");
      }
      grantReward();
      return;
    }
    playSfx("puzzleFail");
    if (deduction) {
      useRunStore.getState().spendPuzzleAttempt(nodeId);
      playSfx("attemptSpent");
    }
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
        <AppHeader
          title={
            <Group gap="xs" wrap="nowrap">
              <TierBadge tier={puzzle.tier} compact />
              <span>{t("run:anomaly.title")}</span>
            </Group>
          }
          actions={
            <Button
              size="compact-sm"
              variant="subtle"
              color="gray"
              data-testid="puzzle-leave"
              onClick={done}
            >
              {t("run:anomaly.leave")}
            </Button>
          }
        />
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
            const placed = slotOfDie.has(index);
            const marked = rerollPick.includes(index);
            return (
              <PuzzleDie
                key={index}
                riseIndex={index}
                defId={defId}
                index={index}
                seed={deriveSeed(seed, `trial:${nodeId}`)}
                gen={rolls[index] ?? 0}
                value={values[index] ?? 1}
                active={rerollMode ? marked : selected === index}
                faded={placed}
                reserved={reserved === index}
                locked={dieIsLocked(puzzle, index, turnIndex)}
                color={rerollMode ? tokens.danger : tokens.amber}
                onTap={() => {
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
        <PuzzleSlots
          puzzle={puzzle}
          placement={placement}
          values={values}
          rerollMode={rerollMode}
          onTapSlot={tapSlot}
        />

        {checked !== null ? (
          <PuzzleVerdict
            solved={solved}
            puzzle={puzzle}
            reward={reward}
            claimed={claimed}
            onClaimDie={claimDie}
            onClaimVoucher={claimVoucher}
          />
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
            <Button variant="default" onClick={leaveRerollMode}>
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
      reward={reward}
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
