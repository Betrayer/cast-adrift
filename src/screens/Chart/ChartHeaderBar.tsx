import { Button, Group, Paper, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { AppHeader } from "@/components/AppHeader";
import { tokens } from "@/app/theme";
import { pointsSpent, pointsTotal } from "@/game/chart/engine";
import styles from "./ChartScreen.module.css";

export const ChartHeaderBar = ({
  points,
  level,
  picks,
  resettable,
  filterOpen,
  filterCount,
  respec,
  freeRespecs,
  onToggleFilter,
  onToggleRespec,
  onOpenReset,
}: {
  points: number;
  level: number;
  picks: readonly string[];
  resettable: number;
  filterOpen: boolean;
  filterCount: number;
  respec: boolean;
  freeRespecs: number;
  onToggleFilter: () => void;
  onToggleRespec: () => void;
  onOpenReset: () => void;
}) => {
  const { t } = useTranslation(["meta", "common", "battle"]);
  return (
    <div className={styles.headerBar}>
      <AppHeader
        subtitle={t("meta:chart.header", { points, level })}
        actions={
          <>
            <Button
              size="compact-sm"
              variant={filterOpen ? "filled" : "default"}
              data-chart-filter-toggle
              onClick={onToggleFilter}
            >
              {filterCount === 0
                ? t("meta:chart.filter")
                : t("meta:chart.filterOn", { n: filterCount })}
            </Button>
            <Button
              size="compact-sm"
              variant={respec ? "filled" : "default"}
              color={respec ? "danger" : undefined}
              onClick={onToggleRespec}
            >
              {respec ? t("meta:chart.respecOff") : t("meta:chart.respecMode")}
            </Button>
            <Button
              size="compact-sm"
              variant="default"
              data-chart-reset
              disabled={resettable === 0}
              onClick={onOpenReset}
            >
              {t("meta:chart.resetAll")}
            </Button>
          </>
        }
      />
      {freeRespecs > 0 ? (
        <Paper
          className={styles.banner}
          bg={tokens.surface2}
          p="xs"
          radius="md"
          withBorder
          data-chart-repriced
        >
          <Group justify="space-between" gap="xs" wrap="nowrap">
            <Text size="xs" c={tokens.dim}>
              {t("meta:chart.repriced", {
                spent: pointsSpent(picks),
                total: pointsTotal(level),
              })}
            </Text>
            <Button
              size="compact-xs"
              color="danger"
              data-chart-free-respec
              disabled={resettable === 0}
              onClick={onOpenReset}
            >
              {t("meta:chart.freeRespec")}
            </Button>
          </Group>
        </Paper>
      ) : null}
    </div>
  );
};
