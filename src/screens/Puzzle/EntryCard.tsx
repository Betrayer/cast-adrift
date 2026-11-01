import { Button, Group, Paper, Stack, Text } from "@mantine/core";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Screen } from "@/app/Screen";
import { flourishStyle, riseStyle, staggerStyle } from "@/app/motion";
import { AppHeader } from "@/components/AppHeader";
import { tokens } from "@/app/theme";
import { TierBadge, tierPalette } from "@/components/TierBadge";
import type { PuzzleDef } from "@/data/puzzles";
import { goalTarget } from "@/game/puzzles/evaluate";
import type { PuzzleReward } from "@/game/puzzles/stakes";
import { useBackGuard } from "@/app/backGuard";
import { playSfx } from "@/services/audio";
import { useRunStore } from "@/stores/runStore";
import { rewardLines, stakeLine } from "./puzzleLabels";

const tierRate = (tier: number): number => 1.16 - tier * 0.045;

const ENTRY_FLOURISH_BASE_MS = 420;
const ENTRY_FLOURISH_STEP_MS = 80;

export const EntryCard = ({
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

  useEffect(() => {
    playSfx("eventOpen", { rate: tierRate(puzzle.tier) });
  }, [puzzle.tier]);

  const takeReading = (): void => {
    playSfx("checkDrum", { rate: tierRate(puzzle.tier) });
    onEnter();
  };

  useBackGuard("puzzle", onLeave);

  return (
    <Screen
      width="narrow"
      centered
      header={<AppHeader />}
      footer={
        <Stack gap={6}>
          <Button
            size="md"
            data-press
            onClick={takeReading}
            data-testid="puzzle-enter"
          >
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
      <Paper
        bg={tokens.surface1}
        p="md"
        radius="md"
        withBorder
        data-entry-flourish
        data-puzzle-tier={puzzle.tier}
        style={{
          ...flourishStyle(
            tierPalette(puzzle.tier).stroke,
            ENTRY_FLOURISH_BASE_MS + puzzle.tier * ENTRY_FLOURISH_STEP_MS,
          ),
          ...staggerStyle(60 + puzzle.tier * 20),
        }}
      >
        <Stack gap="sm">
          <Group gap="sm" wrap="nowrap" data-rise style={riseStyle(0)}>
            <TierBadge
              tier={puzzle.tier}
              label={t(`run:anomaly.tierName.${puzzle.tier}`)}
            />
            <Text fw={700} c={tokens.accent}>
              {t(puzzle.title)}
            </Text>
          </Group>

          <Text size="sm" c={tokens.dim} data-rise style={riseStyle(1)}>
            {t(puzzle.goalText, { n: goalTarget(puzzle.goal) })}
          </Text>

          <Stack gap={2} data-rise style={riseStyle(2)}>
            <Text size="xs" c={tokens.faint}>
              {t("run:anomaly.rewardPreview")}
            </Text>
            {rewardLines(t, puzzle, reward).map((line) => (
              <Text key={line} size="sm" c={tokens.text}>
                {line}
              </Text>
            ))}
          </Stack>

          <Stack gap={2} data-rise style={riseStyle(3)}>
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
