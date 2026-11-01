import {
  Button,
  Divider,
  Group,
  Paper,
  Stack,
  Text,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Screen } from "@/app/Screen";
import grids from "@/app/grids.module.css";
import { riseStyle } from "@/app/motion";
import { AppHeader } from "@/components/AppHeader";
import { tokens } from "@/app/theme";
import { isGuestAccount, supportId } from "@/services/uid";
import { useAppStore } from "@/stores/appStore";
import { AchievementSummary } from "./AchievementSummary";
import { BadgeRow } from "./BadgeRow";
import { BestsCard } from "./BestsCard";
import { EndingsCard } from "./EndingsCard";
import { LifetimeStatsCard } from "./LifetimeStatsCard";
import { ProfileLevelCard } from "./ProfileLevelCard";

const AccountLine = () => {
  const { t } = useTranslation(["settings"]);
  const go = useAppStore((s) => s.go);
  const account = useAppStore((s) => s.account);
  const uid = useAppStore((s) => s.uid);
  const status = isGuestAccount(account)
    ? t("settings:account.guest")
    : account?.email !== null && account?.email !== undefined
      ? account.email
      : t("settings:account.telegramProfile");

  return (
    <Paper bg={tokens.surface1} p="sm" radius="md" withBorder>
      <Group justify="space-between" wrap="nowrap">
        <Stack gap={0}>
          <Text size="xs" c={tokens.faint}>
            {t("settings:account.title")}
          </Text>
          <Text size="sm" fw={600} c={tokens.text} data-testid="profile-account">
            {status}
          </Text>
          <Text size="10px" c={tokens.faint}>
            {t("settings:account.supportId", { id: supportId(uid) })}
          </Text>
        </Stack>
        <Button
          size="xs"
          variant="default"
          data-testid="profile-account-open"
          onClick={() => {
            go("settings");
          }}
        >
          {t("settings:title")}
        </Button>
      </Group>
    </Paper>
  );
};

export const ProfileScreen = () => {
  const { t } = useTranslation(["meta", "common", "content", "settings"]);

  return (
    <Screen
      width="grid"
      header={<AppHeader />}
    >
      <Stack gap="sm">
          <div data-rise data-profile-section="account" style={riseStyle(0)}>
            <AccountLine />
          </div>

          <ProfileLevelCard />

          <div className={grids.masonry} data-profile-columns>
          <LifetimeStatsCard />

          <BestsCard />

          <Paper
            bg={tokens.surface1}
            p="md"
            radius="md"
            withBorder
            data-rise
            data-profile-section="badges"
            style={riseStyle(3)}
          >
            <Stack gap="xs">
              <Text fw={600} c={tokens.text}>
                {t("meta:profile.badges")}
              </Text>
              <Divider color={tokens.line} />
              <BadgeRow />
            </Stack>
          </Paper>

          <div data-rise data-profile-section="achievements" style={riseStyle(3)}>
            <AchievementSummary />
          </div>

          <EndingsCard />
          </div>
      </Stack>
    </Screen>
  );
};
