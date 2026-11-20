import { Button, Group, Paper, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { tokens } from "@/app/theme";
import { DIE_BY_ID } from "@/data/dice";
import type { PuzzleDef } from "@/data/puzzles";
import type { PuzzleReward } from "@/game/puzzles/stakes";
import { SOLVED_GREEN } from "./GoalBanner";
import { rewardLines } from "./puzzleLabels";

export const PuzzleVerdict = ({
  solved,
  puzzle,
  reward,
  claimed,
  onClaimDie,
  onClaimVoucher,
}: {
  solved: boolean;
  puzzle: PuzzleDef;
  reward: PuzzleReward;
  claimed: boolean;
  onClaimDie: () => void;
  onClaimVoucher: () => void;
}) => {
  const { t } = useTranslation(["run", "battle", "content"]);
  return (
    <Paper
      bg={tokens.surface2}
      p="sm"
      radius="sm"
      withBorder
      style={{ borderColor: solved ? "#6FBF4B" : tokens.danger }}
      data-testid={solved ? "puzzle-solved" : "puzzle-missed"}
    >
      <Text c={solved ? SOLVED_GREEN : tokens.danger} fw={600}>
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
              <Button size="compact-sm" onClick={onClaimDie}>
                {t("run:anomaly.takeDie", {
                  name: t(
                    DIE_BY_ID.get(reward.choice.die)?.name ??
                      reward.choice.die,
                  ),
                })}
              </Button>
              <Button size="compact-sm" variant="default" onClick={onClaimVoucher}>
                {t("run:anomaly.takeVoucher")}
              </Button>
            </Group>
          ) : null}
        </Stack>
      ) : null}
    </Paper>
  );
};
