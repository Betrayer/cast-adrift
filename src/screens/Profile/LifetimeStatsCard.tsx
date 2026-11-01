import { Button, Divider, Paper, SimpleGrid, Stack, Text } from "@mantine/core";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { PAIR_COLUMNS } from "@/app/grids";
import { riseStyle } from "@/app/motion";
import { tokens } from "@/app/theme";
import { useMetaStore, type MetaStats } from "@/stores/metaStore";

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

export const LifetimeStatsCard = () => {
  const { t } = useTranslation(["meta"]);
  const stats = useMetaStore((s) => s.stats);
  const [detailed, setDetailed] = useState(false);

  return (
    <Paper
      bg={tokens.surface1}
      p="md"
      radius="md"
      withBorder
      data-rise
      data-profile-section="stats"
      style={riseStyle(2)}
    >
      <Stack gap="xs">
        <Text fw={600} c={tokens.text}>
          {t("meta:profile.lifetime")}
        </Text>
        <Divider color={tokens.line} />
        <SimpleGrid cols={PAIR_COLUMNS} spacing="xs" verticalSpacing="xs">
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
            cols={PAIR_COLUMNS}
            spacing="xs"
            verticalSpacing="xs"
            data-profile-detail
          >
            {DETAIL_ROWS.map((row, index) => (
              <div
                key={row.id}
                data-profile-row={row.id}
                data-rise
                style={riseStyle(index)}
              >
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
  );
};
