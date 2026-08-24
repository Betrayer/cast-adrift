import {
  Button,
  Divider,
  Group,
  Paper,
  Progress,
  RingProgress,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Screen } from "@/app/Screen";
import grids from "@/app/grids.module.css";
import { AppHeader } from "@/components/AppHeader";
import { tokens } from "@/app/theme";
import { CONTRACTS, CONTRACT_STAR_COUNT } from "@/data/contracts";
import { ENDINGS, STANDARD_ENDINGS } from "@/data/narrative/endings";

import { countStars } from "@/game/run/goals";
import { progressWithinLevel } from "@/game/xp";
import { isGuestAccount, supportId } from "@/services/uid";
import { useAppStore } from "@/stores/appStore";
import { useMetaStore, type MetaStats } from "@/stores/metaStore";
import { AchievementSummary } from "./AchievementSummary";
import { BadgeRow } from "./BadgeRow";

const endingSlots = (earned: readonly string[]): typeof ENDINGS =>
  earned.includes("answer") ? ENDINGS : STANDARD_ENDINGS;

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

const DETAIL_ROWS: readonly {
  id: string;
  label: string;
  read: (stats: MetaStats) => number;
}[] = [
  {
    id: "shardsEarned",
    label: "meta:profile.shardsEarned",
    read: (s) => s.shardsEarned,
  },
  { id: "elites", label: "meta:profile.elites", read: (s) => s.elites },
  { id: "t5Solved", label: "meta:profile.t5Solved", read: (s) => s.t5Solved },
  { id: "beacons", label: "meta:profile.beacons", read: (s) => s.beacons },
  {
    id: "streak",
    label: "meta:profile.streak",
    read: (s) => s.noDeathStreak,
  },
  {
    id: "bestStreak",
    label: "meta:profile.bestStreak",
    read: (s) => s.bestNoDeathStreak,
  },
  {
    id: "deepClears",
    label: "meta:profile.deepClears",
    read: (s) => s.deepClears,
  },
  { id: "driftRuns", label: "meta:profile.driftRuns", read: (s) => s.driftRuns },
  { id: "dailyRuns", label: "meta:profile.dailyRuns", read: (s) => s.dailyRuns },
  {
    id: "contractRuns",
    label: "meta:profile.contractRuns",
    read: (s) => s.contractRuns,
  },
  {
    id: "wormholeRides",
    label: "meta:profile.wormholeRides",
    read: (s) => s.wormholeRides,
  },
  {
    id: "holesBypassed",
    label: "meta:profile.holesBypassed",
    read: (s) => s.holesBypassed,
  },
];

const StatCell = ({ label, value }: { label: string; value: string }) => (
  <Stack gap={0}>
    <Text size="xs" c={tokens.faint}>
      {label}
    </Text>
    <Text fw={700} c={tokens.text}>
      {value}
    </Text>
  </Stack>
);

export const ProfileScreen = () => {
  const { t } = useTranslation(["meta", "common", "content", "settings"]);
  const level = useMetaStore((s) => s.level);
  const xp = useMetaStore((s) => s.xp);
  const shards = useMetaStore((s) => s.shards);
  const stats = useMetaStore((s) => s.stats);
  const best = useMetaStore((s) => s.best);
  const endings = useMetaStore((s) => s.endings);
  const contracts = useMetaStore((s) => s.contracts);
  const [detailed, setDetailed] = useState(false);
  const progress = progressWithinLevel(xp);
  const starTotal = CONTRACTS.reduce(
    (sum, def) => sum + countStars(contracts[def.id] ?? 0),
    0,
  );

  return (
    <Screen
      width="grid"
      header={<AppHeader />}
    >
      <Stack gap="sm">
          <AccountLine />

          <Paper bg={tokens.surface1} p="md" radius="md" withBorder>
            <Group>
              <RingProgress
                size={92}
                thickness={7}
                roundCaps
                sections={[{ value: progress.pct * 100, color: "accent" }]}
                label={
                  <Text ta="center" c={tokens.text} fw={700}>
                    {level}
                  </Text>
                }
              />
              <Stack gap={4} style={{ flex: 1 }}>
                <Text c={tokens.text} fw={600}>
                  {t("meta:summary.level", { level })}
                </Text>
                <Progress
                  value={progress.pct * 100}
                  color="accent"
                  aria-label="xp"
                />
                <Text size="xs" c={tokens.faint}>
                  {t("meta:summary.toNext", {
                    into: progress.into,
                    need: progress.need,
                  })}
                </Text>
                <Text size="xs" c={tokens.amber}>
                  {t("meta:profile.shards", { n: shards })}
                </Text>
              </Stack>
            </Group>
          </Paper>

          <div className={grids.masonry} data-profile-columns>
          <Paper bg={tokens.surface1} p="md" radius="md" withBorder>
            <Stack gap="xs">
              <Text fw={600} c={tokens.text}>
                {t("meta:profile.lifetime")}
              </Text>
              <Divider color={tokens.line} />
              <SimpleGrid cols={2} spacing="xs" verticalSpacing="xs">
                <StatCell
                  label={t("meta:profile.runs")}
                  value={String(stats.runs)}
                />
                <StatCell
                  label={t("meta:profile.wins")}
                  value={String(stats.wins)}
                />
                <StatCell
                  label={t("meta:profile.kills")}
                  value={String(stats.kills)}
                />
                <StatCell
                  label={t("meta:profile.scrap")}
                  value={String(stats.scrapEarned)}
                />
                <StatCell
                  label={t("meta:profile.deepestDrift")}
                  value={String(stats.deepestDrift)}
                />
                <StatCell
                  label={t("meta:profile.clears")}
                  value={String(stats.campaignClears)}
                />
              </SimpleGrid>
              <Button
                size="compact-xs"
                variant="subtle"
                color="gray"
                data-testid="profile-more"
                onClick={() => {
                  setDetailed((value) => !value);
                }}
              >
                {t(detailed ? "meta:profile.less" : "meta:profile.more")}
              </Button>
              {detailed ? (
                <SimpleGrid
                  cols={2}
                  spacing="xs"
                  verticalSpacing="xs"
                  data-profile-detail
                >
                  {DETAIL_ROWS.map((row) => (
                    <div key={row.id} data-profile-row={row.id}>
                      <StatCell
                        label={t(row.label)}
                        value={String(row.read(stats))}
                      />
                    </div>
                  ))}
                </SimpleGrid>
              ) : null}
            </Stack>
          </Paper>

          <Paper bg={tokens.surface1} p="md" radius="md" withBorder>
            <Stack gap="xs">
              <Text fw={600} c={tokens.text}>
                {t("meta:profile.bests")}
              </Text>
              <Divider color={tokens.line} />
              <Group justify="space-between">
                <Text size="sm" c={tokens.dim}>
                  {t("meta:profile.bestDrift")}
                </Text>
                <Text size="sm" c={tokens.amber} fw={700}>
                  {best.drift}
                </Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c={tokens.dim}>
                  {t("meta:profile.bestWeekly")}
                </Text>
                <Text size="sm" c={tokens.amber} fw={700}>
                  {best.driftWeekly}
                </Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c={tokens.dim}>
                  {t("meta:profile.bestDaily")}
                </Text>
                <Text size="sm" c={tokens.amber} fw={700}>
                  {best.dailyRank === null
                    ? t("meta:profile.none")
                    : t("meta:profile.place", { rank: best.dailyRank })}
                </Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c={tokens.dim}>
                  {t("meta:profile.stars")}
                </Text>
                <Text size="sm" c={tokens.amber} fw={700}>
                  {t("meta:modes.contractStars", {
                    n: starTotal,
                    max: CONTRACTS.length * CONTRACT_STAR_COUNT,
                  })}
                </Text>
              </Group>
            </Stack>
          </Paper>

          <Paper bg={tokens.surface1} p="md" radius="md" withBorder>
            <Stack gap="xs">
              <Text fw={600} c={tokens.text}>
                {t("meta:profile.badges")}
              </Text>
              <Divider color={tokens.line} />
              <BadgeRow />
            </Stack>
          </Paper>

          <AchievementSummary />

          <Paper bg={tokens.surface1} p="md" radius="md" withBorder>
            <Stack gap="xs">
              <Text fw={600} c={tokens.text}>
                {t("meta:profile.endings")}
              </Text>
              <Divider color={tokens.line} />
              <SimpleGrid cols={{ base: 2, xs: 5 }} spacing="xs">
                {endingSlots(endings).map((def) => {
                  const earned = endings.includes(def.id);
                  return (
                    <Stack key={def.id} align="center" gap={2}>
                      <Paper
                        bg={earned ? tokens.surface2 : tokens.bg}
                        withBorder
                        radius="xl"
                        w={46}
                        h={46}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderColor: earned ? tokens.amber : tokens.line,
                        }}
                      >
                        <Text
                          fw={700}
                          c={earned ? tokens.amber : tokens.faint}
                          size="lg"
                        >
                          {earned ? t(def.label).slice(0, 1) : "?"}
                        </Text>
                      </Paper>
                      <Text size="10px" c={earned ? tokens.dim : tokens.faint} ta="center">
                        {earned ? t(def.label) : t("meta:profile.locked")}
                      </Text>
                    </Stack>
                  );
                })}
              </SimpleGrid>
            </Stack>
          </Paper>
          </div>
      </Stack>
    </Screen>
  );
};
