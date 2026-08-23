import {
  Badge,
  Divider,
  Group,
  Paper,
  Progress,
  Stack,
  Text,
} from "@mantine/core";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Screen } from "@/app/Screen";
import { AppHeader } from "@/components/AppHeader";
import { tokens } from "@/app/theme";
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_GROUPS,
  ACHIEVEMENT_ROWS,
} from "@/data/achievements";
import { BadgeRow } from "@/screens/Profile/BadgeRow";
import { useMetaStore, VOUCHER_CAP } from "@/stores/metaStore";
import { AchievementRow } from "./AchievementRow";
import { useAchievementCtx } from "./useAchievementCtx";

export const AchievementsScreen = () => {
  const { t } = useTranslation(["meta"]);
  const ctx = useAchievementCtx();
  const unlocked = useMetaStore((s) => s.achievements);
  const vouchers = useMetaStore((s) => s.vouchers.perkDraft);
  const earned = useMemo(() => new Set(unlocked), [unlocked]);

  useEffect(
    () => () => {
      useMetaStore
        .getState()
        .markAchievementsSeen(useMetaStore.getState().achievements);
    },
    [],
  );

  return (
    <Screen header={<AppHeader />}>
      <Stack gap="sm">
        <Paper bg={tokens.surface1} p="md" radius="md" withBorder>
          <Stack gap="xs">
            <Group justify="space-between">
              <Text fw={600} c={tokens.text}>
                {t("meta:profile.achievements")}
              </Text>
              <Text size="xs" c={tokens.amber} data-achievement-count>
                {t("meta:profile.achCount", {
                  n: earned.size,
                  total: ACHIEVEMENTS.length,
                })}
              </Text>
            </Group>
            <Progress
              value={(earned.size / ACHIEVEMENTS.length) * 100}
              color="accent"
              size="xs"
              aria-label={t("meta:profile.achievements")}
            />
            {vouchers === 0 ? null : (
              <Group gap="xs">
                <Badge size="sm" variant="light" color="yellow" data-voucher-bank>
                  {t("meta:voucher.bank", { n: vouchers, max: VOUCHER_CAP })}
                </Badge>
              </Group>
            )}
            <Divider color={tokens.line} />
            <Text size="xs" c={tokens.faint}>
              {t("meta:profile.badges")}
            </Text>
            <BadgeRow />
          </Stack>
        </Paper>
        {ACHIEVEMENT_GROUPS.map((group) => {
          const rows = ACHIEVEMENT_ROWS.filter((row) => row.group === group);
          if (rows.length === 0) return null;
          return (
            <Paper
              key={group}
              bg={tokens.surface1}
              p="md"
              radius="md"
              withBorder
              data-achievement-group={group}
            >
              <Stack gap="xs">
                <Text fw={600} c={tokens.text}>
                  {t(`meta:profile.group.${group}`)}
                </Text>
                <Divider color={tokens.line} />
                {rows.map((row) => (
                  <AchievementRow
                    key={`${row.kind}:${row.id}`}
                    row={row}
                    ctx={ctx}
                    earned={earned}
                  />
                ))}
              </Stack>
            </Paper>
          );
        })}
      </Stack>
    </Screen>
  );
};
