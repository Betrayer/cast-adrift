import { Badge, Button, Group, Paper, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { tokens } from "@/app/theme";
import type { ChartNodeDef } from "@/data/chart";
import {
  canAllocate,
  canDeallocate,
  respecCost,
  type ChartPath,
} from "@/game/chart/engine";
import { chartNodeCost } from "@/game/chart/cost";
import {
  chartNodeLines,
  chartNodeTitle,
  chartRequirementLines,
} from "@/game/chart/describe";
import { constellationColor, stopStagePointer } from "./chartPresentation";
import styles from "./ChartScreen.module.css";

export const ChartNodeDetail = ({
  node,
  picks,
  owned,
  respec,
  level,
  shards,
  points,
  preview,
  onRequestRefund,
  onAllocate,
}: {
  node: ChartNodeDef | undefined;
  picks: readonly string[];
  owned: boolean;
  respec: boolean;
  level: number;
  shards: number;
  points: number;
  preview: ChartPath | null;
  onRequestRefund: (id: string) => void;
  onAllocate: (id: string) => void;
}) => {
  const { t } = useTranslation(["meta", "common", "battle"]);
  if (node === undefined) {
    return (
      <Paper
        className={styles.detail}
        bg={tokens.surface1}
        p="md"
        radius="md"
        withBorder
      >
        <Text size="sm" c={tokens.faint}>
          {t("meta:chart.selectHint")}
        </Text>
      </Paper>
    );
  }
  const cost = chartNodeCost(node.id);
  const refund = respecCost(node.id);
  return (
    <Paper
      className={styles.detail}
      bg={tokens.surface1}
      p="md"
      radius="md"
      withBorder
      data-chart-detail
      onPointerDown={stopStagePointer}
      onPointerUp={stopStagePointer}
      onPointerMove={stopStagePointer}
    >
      <Stack gap="xs">
        <Group justify="space-between">
          <Text fw={600} c={tokens.text}>
            {chartNodeTitle(node, t)}
          </Text>
          <Group gap={4}>
            <Badge variant="light" color="gray" data-chart-cost={cost}>
              {t("meta:chart.cost", { n: cost })}
            </Badge>
            <Badge
              variant="light"
              color="gray"
              style={{
                color: constellationColor(node.constellation).stroke,
              }}
            >
              {t(`meta:constellation.${node.constellation}`)}
            </Badge>
          </Group>
        </Group>
        {chartRequirementLines(node, picks, t).map((line) => (
          <Text
            key={line}
            size="sm"
            c={tokens.amber}
            data-chart-requirement
          >
            · {line}
          </Text>
        ))}
        {chartNodeLines(node, t).map((line, i) => (
          <Text
            key={i}
            size="sm"
            c={line.drawback ? tokens.danger : tokens.dim}
            data-chart-line
            data-chart-drawback={line.drawback ? "1" : undefined}
          >
            · {line.text}
          </Text>
        ))}
        {(node.tags ?? []).length === 0 ? null : (
          <Group gap={4}>
            {(node.tags ?? []).map((tag) => (
              <Badge key={tag} size="xs" variant="outline" color="gray">
                {t(`meta:chartTag.${tag}`)}
              </Badge>
            ))}
          </Group>
        )}
        {owned ? (
          respec ? (
            <Button
              size="xs"
              color="danger"
              data-chart-refund
              disabled={!canDeallocate(node.id, picks) || shards < refund}
              onClick={() => {
                onRequestRefund(node.id);
              }}
            >
              {refund === 0
                ? t("meta:chart.refundFree")
                : t("meta:chart.refundCost", { cost: refund })}
            </Button>
          ) : (
            <Badge color="teal" variant="light">
              {t("meta:chart.allocatedTag")}
            </Badge>
          )
        ) : (
          <>
            {preview !== null && preview.cost > 0 ? (
              <Text size="xs" c={tokens.accent} data-chart-path>
                {t("meta:chart.pathCost", {
                  n: preview.cost,
                  have: Math.max(0, points),
                })}
              </Text>
            ) : null}
            <Button
              size="xs"
              disabled={!canAllocate(node.id, level, picks)}
              onClick={() => {
                onAllocate(node.id);
              }}
            >
              {points < cost
                ? t("meta:chart.noPoints")
                : t("meta:chart.allocate")}
            </Button>
          </>
        )}
      </Stack>
    </Paper>
  );
};
