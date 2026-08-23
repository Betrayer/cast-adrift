import { Paper, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Screen } from "@/app/Screen";
import { AppHeader } from "@/components/AppHeader";
import { tokens } from "@/app/theme";
import { AchievementGrid } from "@/screens/Profile/AchievementGrid";
import { BadgeRow } from "@/screens/Profile/BadgeRow";

export const AchievementsScreen = () => {
  const { t } = useTranslation(["meta", "common"]);

  return (
    <Screen
      header={<AppHeader />}
    >
      <Stack gap="sm">
        <Paper bg={tokens.surface1} p="md" radius="md" withBorder>
          <Stack gap="xs">
            <Text fw={600} c={tokens.text}>
              {t("meta:profile.badges")}
            </Text>
            <BadgeRow />
          </Stack>
        </Paper>
        <AchievementGrid />
      </Stack>
    </Screen>
  );
};
