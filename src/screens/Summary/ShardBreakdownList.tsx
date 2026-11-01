import { Group, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { riseStyle } from "@/app/motion";
import { tokens } from "@/app/theme";
import { ZERO_SHARD_BREAKDOWN } from "@/game/xp";
import type { RunResult } from "@/stores/summaryStore";

export const ShardBreakdownList = ({
  result,
}: {
  result: RunResult | null;
}) => {
  const { t } = useTranslation(["run", "meta"]);
  const shards = result?.shards ?? ZERO_SHARD_BREAKDOWN;
  const breakdown: readonly [string, number][] = [
    ["meta:summary.fromSectors", shards.sectors],
    ["meta:summary.fromBeacons", shards.beacons],
    ["meta:summary.fromEnding", shards.firstEnding],
    ["meta:summary.fromHull", shards.hullClear],
    ["meta:summary.fromStreak", shards.streak],
    ["meta:summary.fromDeep", shards.deepClear],
    ["meta:summary.fromAscension", shards.ascension],
    ["meta:summary.fromFinds", result?.findShards ?? 0],
    ["meta:summary.fromAchievements", result?.achievementShards ?? 0],
  ];
  const earned = breakdown.filter(([, value]) => value !== 0);
  if (earned.length === 0) return null;
  return (
    <Stack gap={2} data-shard-breakdown>
      {earned.map(([label, value], index) => (
        <Group
          key={label}
          justify="space-between"
          data-rise
          style={riseStyle(index)}
        >
          <Text size="xs" c={tokens.faint}>
            {t(label)}
          </Text>
          <Text size="xs" c={tokens.dim}>
            +{value}
          </Text>
        </Group>
      ))}
    </Stack>
  );
};
