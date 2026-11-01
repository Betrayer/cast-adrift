import { Group, Progress, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { tokens } from "@/app/theme";
import { ACHIEVEMENTS } from "@/data/achievements";

export const AchievementTallyHead = ({ earned }: { earned: number }) => {
  const { t } = useTranslation(["meta"]);
  return (
    <Group justify="space-between">
      <Text fw={600} c={tokens.text}>
        {t("meta:profile.achievements")}
      </Text>
      <Text size="xs" c={tokens.amber} data-achievement-count>
        {t("meta:profile.achCount", {
          n: earned,
          total: ACHIEVEMENTS.length,
        })}
      </Text>
    </Group>
  );
};

export const AchievementTallyBar = ({ earned }: { earned: number }) => {
  const { t } = useTranslation(["meta"]);
  return (
    <Progress
      value={(earned / ACHIEVEMENTS.length) * 100}
      color="accent"
      size="xs"
      aria-label={t("meta:profile.achievements")}
    />
  );
};
