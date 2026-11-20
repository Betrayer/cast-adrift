import { Button, Chip, CloseButton, Group, Paper, Stack, Text, TextInput } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { riseStyle } from "@/app/motion";
import { tokens } from "@/app/theme";
import { CHART_NODES } from "@/data/chart";
import type { ChartNodeKind, Constellation } from "@/data/chart/types";
import type { ContentTag } from "@/data/tags";
import { stopStagePointer } from "./chartPresentation";
import {
  CHART_FILTER_CONSTELLATIONS,
  CHART_FILTER_KINDS,
  chartFilterCount,
  EMPTY_CHART_FILTER,
  type ChartFilter,
} from "./chartFilter";
import styles from "./ChartScreen.module.css";

const CHART_TAGS: readonly ContentTag[] = [
  ...new Set(CHART_NODES.flatMap((node) => node.tags ?? [])),
].sort();

const isConstellation = (value: string): value is Constellation =>
  (CHART_FILTER_CONSTELLATIONS as readonly string[]).includes(value);

const isKind = (value: string): value is ChartNodeKind =>
  (CHART_FILTER_KINDS as readonly string[]).includes(value);

export const ChartFilterBar = ({
  value,
  onChange,
}: {
  value: ChartFilter;
  onChange: (value: ChartFilter) => void;
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
      <Stack gap={6}>
        <TextInput
          size="xs"
          value={value.text}
          placeholder={t("meta:chart.search")}
          aria-label={t("meta:chart.search")}
          data-chart-search
          onChange={(event) => {
            onChange({ ...value, text: event.currentTarget.value });
          }}
          rightSection={
            value.text === "" ? null : (
              <CloseButton
                size="sm"
                aria-label={t("meta:chart.searchClear")}
                onClick={() => {
                  onChange({ ...value, text: "" });
                }}
              />
            )
          }
        />
        <Chip
          size="xs"
          checked={value.availableOnly}
          data-chart-available
          onChange={(checked) => {
            onChange({ ...value, availableOnly: checked });
          }}
        >
          {t("meta:chart.available")}
        </Chip>
        <Text size="xs" c={tokens.faint}>
          {t("meta:chart.legend")}
        </Text>
        <Chip.Group
          multiple
          value={[...value.constellations]}
          onChange={(next) => {
            onChange({ ...value, constellations: next.filter(isConstellation) });
          }}
        >
          <Group gap={4}>
            {CHART_FILTER_CONSTELLATIONS.map((constellation, index) => (
              <Chip key={constellation} value={constellation} size="xs" mod="rise" style={riseStyle(index)}>
                <span data-chart-constellation={constellation}>{t(`meta:constellation.${constellation}`)}</span>
              </Chip>
            ))}
          </Group>
        </Chip.Group>
        <Text size="xs" c={tokens.faint}>
          {t("meta:chart.filterKind")}
        </Text>
        <Chip.Group
          multiple
          value={[...value.kinds]}
          onChange={(next) => {
            onChange({ ...value, kinds: next.filter(isKind) });
          }}
        >
          <Group gap={4}>
            {CHART_FILTER_KINDS.map((kind, index) => (
              <Chip key={kind} value={kind} size="xs" mod="rise" style={riseStyle(index)}>
                <span data-chart-kind={kind}>{t(`meta:chart.kind.${kind}`)}</span>
              </Chip>
            ))}
          </Group>
        </Chip.Group>
        <Text size="xs" c={tokens.faint}>
          {t("meta:chart.filterTags")}
        </Text>
        <Chip.Group
          multiple
          value={[...value.tags]}
          onChange={(next) => {
            onChange({ ...value, tags: next });
          }}
        >
          <Group gap={4}>
            {CHART_TAGS.map((tag, index) => (
              <Chip key={tag} value={tag} size="xs" mod="rise" style={riseStyle(index)}>
                <span data-chart-tag={tag}>{t(`meta:chartTag.${tag}`)}</span>
              </Chip>
            ))}
          </Group>
        </Chip.Group>
        {chartFilterCount(value) === 0 ? null : (
          <Button
            size="compact-xs"
            variant="subtle"
            onClick={() => {
              onChange(EMPTY_CHART_FILTER);
            }}
          >
            {t("meta:chart.filterClear")}
          </Button>
        )}
      </Stack>
    </Paper>
  );
};
