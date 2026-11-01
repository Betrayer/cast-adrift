import { Group, SimpleGrid, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { PAIR_COLUMNS } from "@/app/grids";
import { riseStyle } from "@/app/motion";
import { tokens } from "@/app/theme";
import type { RunStats } from "@/stores/runStore";
import type { DeathCause } from "@/stores/summaryStore";

const CAUSE_ROW_ID = "cause";

const DETAIL_ROWS: readonly {
  id: string;
  label: string;
  read: (stats: RunStats) => number;
}[] = [
  { id: "elites", label: "run:summary.elites", read: (s) => s.elites },
  {
    id: "minibosses",
    label: "run:summary.minibosses",
    read: (s) => s.minibosses,
  },
  { id: "bosses", label: "run:summary.bosses", read: (s) => s.bosses },
  {
    id: "scrapSpent",
    label: "run:summary.scrapSpent",
    read: (s) => s.scrapSpent,
  },
  {
    id: "hullPctMin",
    label: "run:summary.hullPctMin",
    read: (s) => s.hullPctMin,
  },
  {
    id: "dicePlaced",
    label: "run:summary.dicePlaced",
    read: (s) => s.dicePlaced,
  },
  {
    id: "wormholeRides",
    label: "run:summary.wormholeRides",
    read: (s) => s.wormholeRides,
  },
  {
    id: "holesBypassed",
    label: "run:summary.holesBypassed",
    read: (s) => s.holesBypassed,
  },
];

export const SummaryDetail = ({
  stats,
  cause,
}: {
  stats: RunStats;
  cause: DeathCause | null;
}) => {
  const { t } = useTranslation(["run", "meta"]);
  return (
    <SimpleGrid cols={PAIR_COLUMNS} spacing={4} data-summary-detail>
      {DETAIL_ROWS.map((row, index) => (
        <Group
          key={row.id}
          justify="space-between"
          data-summary-row={row.id}
          data-rise
          style={riseStyle(index)}
        >
          <Text size="xs" c={tokens.faint}>
            {t(row.label)}
          </Text>
          <Text size="xs" c={tokens.dim} data-summary-value={row.id}>
            {row.id === "hullPctMin"
              ? t("run:summary.pct", { n: Math.round(row.read(stats)) })
              : row.read(stats)}
          </Text>
        </Group>
      ))}
      {cause === "singularity" ? (
        <Group justify="space-between" data-summary-row={CAUSE_ROW_ID}>
          <Text size="xs" c={tokens.faint}>
            {t("run:summary.cause")}
          </Text>
          <Text size="xs" c={tokens.danger} data-summary-value={CAUSE_ROW_ID}>
            {t("run:summary.causeSingularity")}
          </Text>
        </Group>
      ) : null}
    </SimpleGrid>
  );
};
