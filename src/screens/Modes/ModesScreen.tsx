import {
  Badge,
  Button,
  Divider,
  Group,
  Paper,
  Stack,
  Text,
} from "@mantine/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Screen } from "@/app/Screen";
import { riseStyle } from "@/app/motion";
import { AppHeader } from "@/components/AppHeader";
import { tokens } from "@/app/theme";
import { CONTRACTS } from "@/data/contracts";
import { DAILY_PREVIEW_LEVEL } from "@/data/milestones";
import { MUTATOR_BY_ID } from "@/data/mutators";
import { hasFeature } from "@/data/unlocks";
import { unlockContextOf } from "@/game/meta/unlockState";
import { claimDailyAttempt } from "@/game/run/boards";
import {
  hasActiveRun,
  startDailyRun,
  startDriftRun,
} from "@/game/run/flow";
import {
  dailyMutators,
  msUntilUtcReset,
  utcDateKey,
} from "@/game/run/modes";
import { countStars } from "@/game/run/goals";
import { useAppStore } from "@/stores/appStore";
import { useMetaStore } from "@/stores/metaStore";
import { ActiveRunGuard } from "@/screens/Modes/ActiveRunGuard";

const countdownLabel = (ms: number): { h: number; m: number } => ({
  h: Math.floor(ms / 3_600_000),
  m: Math.floor((ms % 3_600_000) / 60_000),
});

const DAY_MS = 86_400_000;

export const ModesScreen = () => {
  const { t } = useTranslation(["meta", "common", "content", "run"]);
  const go = useAppStore((s) => s.go);
  const focus = useAppStore((s) => s.params?.focus);
  const focusRef = useRef<HTMLDivElement>(null);
  const prologueDone = useMetaStore((s) => s.stats.prologueDone);
  const best = useMetaStore((s) => s.best);
  const contracts = useMetaStore((s) => s.contracts);
  const dailyPlayed = useMetaStore((s) => s.dailyPlayed);
  const level = useMetaStore((s) => s.level);
  const achievements = useMetaStore((s) => s.achievements);
  const ascension = useMetaStore((s) => s.ascension);
  const unlocksGranted = useMetaStore((s) => s.unlocksGranted);
  const clears = useMetaStore((s) => s.stats.campaignClears);
  const previewUnlocked = hasFeature(
    unlockContextOf({
      level,
      achievements,
      ascension,
      unlocksGranted,
      stats: { campaignClears: clears },
    }),
    "dailyPreview",
  );
  const [now] = useState(() => Date.now());
  const [pending, setPending] = useState<(() => void) | null>(null);

  const date = utcDateKey(now);
  const mutators = dailyMutators(date);
  const tomorrow = utcDateKey(now + DAY_MS);
  const tomorrowMutators = dailyMutators(tomorrow);
  const dailyRecord = dailyPlayed[date];
  const reset = countdownLabel(msUntilUtcReset(now));
  const starTotal = CONTRACTS.reduce(
    (sum, def) => sum + countStars(contracts[def.id] ?? 0),
    0,
  );

  useEffect(() => {
    if (focus === undefined) return;
    focusRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [focus]);

  const guarded = useCallback((action: () => void) => {
    if (hasActiveRun()) {
      setPending(() => action);
      return;
    }
    action();
  }, []);

  const startDaily = (): void => {
    void claimDailyAttempt(date).then(() => {
      startDailyRun(date);
    });
  };

  return (
    <Screen header={<AppHeader />}>
      <Stack gap="sm">
        <Paper
          bg={tokens.surface1}
          p="md"
          radius="md"
          withBorder
          data-rise
          data-mode-card="campaign"
          style={riseStyle(0)}
        >
          <Stack gap="xs">
            <Text fw={600} c={tokens.text}>
              {t("meta:modes.campaign")}
            </Text>
            <Text size="xs" c={tokens.dim}>
              {t("run:setup.mode")}
            </Text>
            <Button
              color="accent"
              onClick={() => {
                guarded(() => {
                  go(prologueDone ? "runSetup" : "prologue");
                });
              }}
            >
              {t("meta:modes.play")}
            </Button>
          </Stack>
        </Paper>

        <Paper
          ref={focus === "drift" ? focusRef : undefined}
          bg={tokens.surface1}
          p="md"
          radius="md"
          withBorder
          maw={460}
          w="100%"
          data-rise
          data-mode-card="drift"
          style={
            focus === "drift"
              ? { borderColor: tokens.accent, ...riseStyle(1) }
              : riseStyle(1)
          }
        >
          <Stack gap="xs">
            <Group justify="space-between">
              <Text fw={600} c={tokens.text}>
                {t("meta:modes.drift")}
              </Text>
              <Text size="xs" c={tokens.amber}>
                {t("meta:modes.driftBest", { n: best.drift })}
              </Text>
            </Group>
            <Text size="xs" c={tokens.dim}>
              {t("meta:modes.driftDesc")}
            </Text>
            <Group grow>
              <Button
                color="accent"
                onClick={() => {
                  guarded(() => {
                    startDriftRun();
                  });
                }}
              >
                {t("meta:modes.play")}
              </Button>
              <Button
                variant="default"
                onClick={() => {
                  go("leaderboard", { tab: "drift" });
                }}
              >
                {t("meta:modes.board")}
              </Button>
            </Group>
          </Stack>
        </Paper>

        <Paper
          ref={focus === "daily" ? focusRef : undefined}
          bg={tokens.surface1}
          p="md"
          radius="md"
          withBorder
          maw={460}
          w="100%"
          data-rise
          data-mode-card="daily"
          style={
            focus === "daily"
              ? { borderColor: tokens.accent, ...riseStyle(2) }
              : riseStyle(2)
          }
        >
          <Stack gap="xs">
            <Group justify="space-between">
              <Text fw={600} c={tokens.text}>
                {t("meta:modes.daily")}
              </Text>
              <Text size="xs" c={tokens.faint}>
                {date}
              </Text>
            </Group>
            <Group gap="xs">
              {mutators.map((id) => (
                <Badge key={id} color="amber" variant="light">
                  {t(MUTATOR_BY_ID.get(id)?.name ?? id)}
                </Badge>
              ))}
            </Group>
            <Text size="xs" c={tokens.dim}>
              {dailyRecord === undefined
                ? t("meta:modes.dailyFresh")
                : dailyRecord.rank === null
                  ? t("meta:modes.dailyDoneNoRank", {
                      score: dailyRecord.score,
                    })
                  : t("meta:modes.dailyDone", {
                      place: dailyRecord.rank,
                      score: dailyRecord.score,
                    })}
            </Text>
            <Text size="xs" c={tokens.faint}>
              {t("meta:modes.dailyReset", { h: reset.h, m: reset.m })}
            </Text>
            {previewUnlocked ? (
              <Stack gap={4} data-daily-preview>
                <Text size="xs" c={tokens.accent}>
                  {t("meta:modes.dailyPreview", { date: tomorrow })}
                </Text>
                <Group gap="xs">
                  {tomorrowMutators.map((id) => (
                    <Badge key={id} color="accent" variant="light">
                      {t(MUTATOR_BY_ID.get(id)?.name ?? id)}
                    </Badge>
                  ))}
                </Group>
              </Stack>
            ) : (
              <Text size="xs" c={tokens.faint} data-daily-preview-locked>
                {t("meta:modes.dailyPreviewLocked", {
                  n: DAILY_PREVIEW_LEVEL,
                })}
              </Text>
            )}
            <Group grow>
              <Button
                color="accent"
                disabled={dailyRecord !== undefined}
                onClick={() => {
                  guarded(startDaily);
                }}
              >
                {dailyRecord === undefined
                  ? t("meta:modes.play")
                  : t("meta:modes.dailySpent")}
              </Button>
              <Button
                variant="default"
                onClick={() => {
                  go("leaderboard", { tab: "daily" });
                }}
              >
                {t("meta:modes.board")}
              </Button>
            </Group>
          </Stack>
        </Paper>

        <Paper
          bg={tokens.surface1}
          p="md"
          radius="md"
          withBorder
          data-rise
          data-mode-card="contracts"
          style={riseStyle(3)}
        >
          <Stack gap="xs">
            <Group justify="space-between">
              <Text fw={600} c={tokens.text}>
                {t("meta:modes.contracts")}
              </Text>
              <Text size="xs" c={tokens.amber}>
                {t("meta:modes.contractStars", {
                  n: starTotal,
                  max: CONTRACTS.length * 3,
                })}
              </Text>
            </Group>
            <Divider color={tokens.line} />
            <Button
              variant="default"
              onClick={() => {
                go("contracts");
              }}
            >
              {t("meta:modes.open")}
            </Button>
          </Stack>
        </Paper>

        <ActiveRunGuard
          opened={pending !== null}
          onCancel={() => {
            setPending(null);
          }}
          onConfirm={() => {
            const action = pending;
            setPending(null);
            action?.();
          }}
        />
      </Stack>
    </Screen>
  );
};
