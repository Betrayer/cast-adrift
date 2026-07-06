import { Box, Button, Group, Paper, Stack, Text, Title } from "@mantine/core";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { tokens } from "@/app/theme";
import { DIE_BY_ID, rollBaseValue } from "@/data/dice";
import { PUZZLE_BY_ID, PUZZLES, type PuzzleDef } from "@/data/puzzles";
import { schools } from "@/data/schools";
import { slotCapForMk } from "@/data/slots";
import {
  goalMetric,
  goalSatisfied,
  legalAssign,
  scorePlacement,
  type Placement,
} from "@/game/puzzles/evaluate";
import { completeNode } from "@/game/run/flow";
import { createStream, deriveSeed } from "@/services/rng";
import { useAppStore } from "@/stores/appStore";
import { useMetaStore } from "@/stores/metaStore";
import { useRunStore } from "@/stores/runStore";
import type { SlotId } from "@/types/battle";
import type { School } from "@/types/content";

const DEFAULT_REROLL_SIZE = 2;

// Each entry into a trial gets a fresh roll (trials are no-penalty and
// retryable, so a deterministic-per-node roll would just look "stuck").
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

const rollDeck = (puzzle: PuzzleDef, seed: number, key: string): number[] => {
  const stream = createStream(deriveSeed(seed, key));
  return puzzle.deck.map((defId) => {
    const def = DIE_BY_ID.get(defId);
    return rollBaseValue(defId, def?.tier ?? 6, stream);
  });
};

const DieChip = ({
  school,
  value,
  active,
  faded,
  color,
  onClick,
}: {
  school: School;
  value: number;
  active: boolean;
  faded: boolean;
  color: string;
  onClick: () => void;
}) => {
  const colors = schools[school];
  return (
    <div
      onClick={onClick}
      style={{
        width: 46,
        height: 46,
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: colors.fill,
        border: `2px solid ${active ? color : colors.stroke}`,
        color: colors.text,
        fontWeight: 700,
        fontSize: 18,
        opacity: faded ? 0.4 : 1,
        cursor: "pointer",
      }}
    >
      {value}
    </div>
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
  const attemptRef = useRef(0);
  const rerollSeqRef = useRef(0);
  const grantedRef = useRef(false);
  const [runKey] = useState(() => {
    entryNonce += 1;
    return `${nodeId}:${String(entryNonce)}`;
  });

  const [values, setValues] = useState<number[]>(() =>
    rollDeck(puzzle, seed, `trial:${runKey}:0`),
  );
  const [placement, setPlacement] = useState<Placement>({});
  const [selected, setSelected] = useState<number | null>(null);
  const [rerollsLeft, setRerollsLeft] = useState(puzzle.rerolls);
  const [rerollMode, setRerollMode] = useState(false);
  const [rerollPick, setRerollPick] = useState<number[]>([]);
  const [checked, setChecked] = useState<boolean | null>(null);

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
    () => scorePlacement(puzzle, values, placement),
    [puzzle, values, placement],
  );
  const metric = goalMetric(puzzle.goal, score);
  const reached = goalSatisfied(puzzle.goal, score);

  const done = (): void => {
    if (forced) useAppStore.getState().go("map");
    else completeNode({ outcome: "cleared" });
  };

  const tapDie = (index: number): void => {
    if (rerollMode) {
      if (slotOfDie.has(index)) return;
      setRerollPick((pick) =>
        pick.includes(index)
          ? pick.filter((i) => i !== index)
          : pick.length < rerollSize
            ? [...pick, index]
            : pick,
      );
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
    if (selected === null || !legalAssign(puzzle, selected, slot)) return;
    setPlacement((p) => ({ ...p, [slot]: selected }));
    setSelected(null);
    setChecked(null);
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
      deriveSeed(seed, `trial:${runKey}:${String(attemptRef.current)}:r${String(seq)}`),
    );
    setValues((vals) =>
      vals.map((v, i) => {
        if (!rerollPick.includes(i)) return v;
        const def = DIE_BY_ID.get(puzzle.deck[i] ?? "");
        return rollBaseValue(puzzle.deck[i] ?? "", def?.tier ?? 6, stream);
      }),
    );
    setRerollsLeft((n) => n - 1);
    setRerollMode(false);
    setRerollPick([]);
    setChecked(null);
  };

  const fresh = (): void => {
    const attempt = attemptRef.current + 1;
    attemptRef.current = attempt;
    setValues(rollDeck(puzzle, seed, `trial:${runKey}:${String(attempt)}`));
    setPlacement({});
    setSelected(null);
    setRerollsLeft(puzzle.rerolls);
    setRerollMode(false);
    setRerollPick([]);
    setChecked(null);
  };

  const resolve = (): void => {
    const solved = goalSatisfied(puzzle.goal, score);
    setChecked(solved);
    if (solved && !grantedRef.current) {
      grantedRef.current = true;
      const run = useRunStore.getState();
      if (forced) {
        if (puzzle.reward.codex !== undefined) {
          useMetaStore.getState().unlockCodex(puzzle.reward.codex);
        }
      } else if (!run.solvedPuzzles.includes(puzzle.id)) {
        run.addScrap(puzzle.reward.scrap);
        if (puzzle.reward.die !== undefined) run.addDie(puzzle.reward.die);
        if (puzzle.reward.codex !== undefined) {
          useMetaStore.getState().unlockCodex(puzzle.reward.codex);
        }
        run.markPuzzleSolved(puzzle.id);
      }
    }
  };

  const solved = checked === true;
  const metricKey =
    puzzle.goal.g === "survive" ? "run:anomaly.mHull" : `run:anomaly.m_${puzzle.goal.g}`;
  const target = puzzle.goal.g === "survive" ? null : puzzle.goal.min;

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
        <Text fw={600} c={tokens.accent}>
          {t(puzzle.title)}
        </Text>
        <Text size="sm" c={tokens.dim} mt={4}>
          {t("run:anomaly.goal")}: {t(puzzle.goalText)}
        </Text>
        <Group justify="space-between" mt="xs">
          <Text
            fw={700}
            c={reached ? "#A8DF8E" : tokens.text}
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {target === null
              ? t(metricKey, { n: metric })
              : t(metricKey, { n: metric, target })}
          </Text>
          <Text size="sm" c={tokens.dim}>
            {t("run:anomaly.rerolls", { n: rerollsLeft })}
          </Text>
        </Group>
      </Paper>

      <Text size="xs" c={tokens.faint}>
        {rerollMode ? t("run:anomaly.rerollHint", { n: rerollSize }) : t("run:anomaly.tray")}
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
              faded={rerollMode ? placed : placed}
              color={rerollMode ? tokens.danger : tokens.amber}
              onClick={() => {
                tapDie(index);
              }}
            />
          );
        })}
      </Group>

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
          <Text c={solved ? "#A8DF8E" : tokens.danger} fw={600}>
            {solved ? t("run:anomaly.solved") : t("run:anomaly.failed")}
          </Text>
          {solved ? (
            <Text size="sm" c={tokens.dim}>
              {t("run:anomaly.reward", { n: puzzle.reward.scrap })}
            </Text>
          ) : null}
        </Paper>
      ) : null}

      {solved ? (
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
            <Button variant="default" onClick={fresh}>
              {t("run:anomaly.retry")}
            </Button>
          </Group>
          <Button onClick={resolve}>{t("run:anomaly.resolve")}</Button>
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
