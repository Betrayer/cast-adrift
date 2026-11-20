import { Badge, Divider, Group, Paper, Stack, Text } from "@mantine/core";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Screen } from "@/app/Screen";
import { riseStyle } from "@/app/motion";
import grids from "@/app/grids.module.css";
import { AppHeader } from "@/components/AppHeader";
import { tokens } from "@/app/theme";
import {
  ACHIEVEMENT_GROUPS,
  ACHIEVEMENT_ROWS,
  type AchievementRow as RowModel,
} from "@/data/achievements";
import { unseenAchievementIds } from "@/game/meta/achievements";
import { BadgeRow } from "@/screens/Profile/BadgeRow";
import { useMetaStore, VOUCHER_CAP } from "@/stores/metaStore";
import { AchievementRow } from "./AchievementRow";
import { AchievementTallyBar, AchievementTallyHead } from "./AchievementTally";
import { useAchievementCtx } from "./useAchievementCtx";

const unseenOnArrival = (): ReadonlySet<string> => {
  const meta = useMetaStore.getState();
  return new Set(unseenAchievementIds(meta.achievements, meta.achievementsSeen));
};

export const rowIsFresh = (
  row: RowModel,
  unseen: ReadonlySet<string>,
): boolean =>
  row.kind === "family"
    ? row.tiers.some((tier) => unseen.has(tier.id))
    : unseen.has(row.def.id);

export const AchievementsScreen = () => {
  const { t } = useTranslation(["meta"]);
  const ctx = useAchievementCtx();
  const unlocked = useMetaStore((s) => s.achievements);
  const vouchers = useMetaStore((s) => s.vouchers.perkDraft);
  const earned = useMemo(() => new Set(unlocked), [unlocked]);
  const [unseen] = useState(unseenOnArrival);

  useEffect(
    () => () => {
      useMetaStore
        .getState()
        .markAchievementsSeen(useMetaStore.getState().achievements);
    },
    [],
  );

  return (
    <Screen width="grid" header={<AppHeader />}>
      <Stack gap="sm">
        <Paper bg={tokens.surface1} p="md" radius="md" withBorder>
          <Stack gap="xs">
            <AchievementTallyHead earned={earned.size} />
            <AchievementTallyBar earned={earned.size} />
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
        <div className={grids.masonry} data-achievement-columns>
        {ACHIEVEMENT_GROUPS.map((group, groupIndex) => {
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
              data-rise
              style={riseStyle(groupIndex)}
            >
              <Stack gap="xs">
                <Text fw={600} c={tokens.text}>
                  {t(`meta:profile.group.${group}`)}
                </Text>
                <Divider color={tokens.line} />
                {rows.map((row, index) => (
                  <AchievementRow
                    key={`${row.kind}:${row.id}`}
                    row={row}
                    ctx={ctx}
                    earned={earned}
                    fresh={rowIsFresh(row, unseen)}
                    riseIndex={index}
                  />
                ))}
              </Stack>
            </Paper>
          );
        })}
        </div>
      </Stack>
    </Screen>
  );
};
