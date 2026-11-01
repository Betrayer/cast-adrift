import { Button, Chip, Group, Paper } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { riseStyle } from "@/app/motion";
import { tokens } from "@/app/theme";
import { CHART_NODES } from "@/data/chart";
import type { ContentTag } from "@/data/tags";
import { stopStagePointer } from "./chartPresentation";
import styles from "./ChartScreen.module.css";

const CHART_TAGS: readonly ContentTag[] = [
  ...new Set(CHART_NODES.flatMap((node) => node.tags ?? [])),
].sort();

export const ChartFilterBar = ({
  value,
  onChange,
}: {
  value: string[];
  onChange: (value: string[]) => void;
}) => {
  const { t } = useTranslation(["meta", "common", "battle"]);
  return (
    <Paper
      className={styles.filterBar}
      bg={tokens.surface1}
      p="xs"
      radius="md"
      withBorder
      data-chart-filter
      onPointerDown={stopStagePointer}
      onPointerUp={stopStagePointer}
      onPointerMove={stopStagePointer}
    >
      <Chip.Group
        multiple
        value={value}
        onChange={(next) => {
          onChange(next as string[]);
        }}
      >
        <Group gap={4}>
          {CHART_TAGS.map((tag, index) => (
            <Chip
              key={tag}
              value={tag}
              size="xs"
              mod="rise"
              style={riseStyle(index)}
            >
              <span data-chart-tag={tag}>
                {t(`meta:chartTag.${tag}`)}
              </span>
            </Chip>
          ))}
        </Group>
      </Chip.Group>
      {value.length === 0 ? null : (
        <Button
          size="compact-xs"
          variant="subtle"
          mt={4}
          onClick={() => {
            onChange([]);
          }}
        >
          {t("meta:chart.filterClear")}
        </Button>
      )}
    </Paper>
  );
};
