import { ActionIcon, Badge, Box, Button, Group, Paper, Stack, Text } from "@mantine/core";
import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { tokens } from "@/app/theme";
import { CHART_NODES, CHART_NODE_BY_ID } from "@/data/chart";
import type { ChartNodeDef, Constellation } from "@/data/chart";
import { schools } from "@/data/schools";
import {
  canAllocate,
  canDeallocate,
  isAllocatable,
  pointsAvailable,
  RESPEC_SHARD_COST,
} from "@/game/chart/engine";
import { chartNodeLines, chartNodeTitle } from "@/game/chart/describe";
import { useAppStore } from "@/stores/appStore";
import { useMetaStore } from "@/stores/metaStore";
import styles from "./ChartScreen.module.css";

const CANVAS = 1000;
const MIN_SCALE = 0.5;
const MAX_SCALE = 2;

const constellationColor = (
  con: Constellation,
): { stroke: string; fill: string } =>
  con === "hub"
    ? { stroke: tokens.accent, fill: "#1E2340" }
    : { stroke: schools[con].stroke, fill: schools[con].fill };

interface View {
  scale: number;
  tx: number;
  ty: number;
}

const clampScale = (s: number): number =>
  Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

const uniqueEdges = (): [ChartNodeDef, ChartNodeDef][] => {
  const seen = new Set<string>();
  const edges: [ChartNodeDef, ChartNodeDef][] = [];
  for (const node of CHART_NODES) {
    for (const link of node.links) {
      const other = CHART_NODE_BY_ID.get(link);
      if (other === undefined) continue;
      const key = [node.id, link].sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push([node, other]);
    }
  }
  return edges;
};

const EDGES = uniqueEdges();

export const ChartScreen = () => {
  const { t } = useTranslation(["meta", "common"]);
  const go = useAppStore((s) => s.go);
  const picks = useMetaStore((s) => s.chartPicks);
  const level = useMetaStore((s) => s.level);
  const shards = useMetaStore((s) => s.shards);
  const allocatePick = useMetaStore((s) => s.allocatePick);
  const deallocatePick = useMetaStore((s) => s.deallocatePick);
  const spendShards = useMetaStore((s) => s.spendShards);

  const [view, setView] = useState<View>({ scale: 0.62, tx: 0, ty: 0 });
  const [selected, setSelected] = useState<string | null>(null);
  const [respec, setRespec] = useState(false);

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const dragged = useRef(false);
  const pinchDist = useRef<number | null>(null);

  const pickSet = useMemo(() => new Set(picks), [picks]);
  const points = pointsAvailable(level, picks);

  const selectedNode =
    selected !== null ? CHART_NODE_BY_ID.get(selected) : undefined;

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dragged.current = false;
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (prev === undefined) return;
    const pts = pointers.current;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size >= 2) {
      const [a, b] = [...pts.values()];
      if (a === undefined || b === undefined) return;
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDist.current !== null) {
        const factor = dist / pinchDist.current;
        setView((v) => ({ ...v, scale: clampScale(v.scale * factor) }));
      }
      pinchDist.current = dist;
      dragged.current = true;
      return;
    }
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) dragged.current = true;
    setView((v) => ({ ...v, tx: v.tx + dx, ty: v.ty + dy }));
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchDist.current = null;
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    setView((v) => ({
      ...v,
      scale: clampScale(v.scale * (e.deltaY < 0 ? 1.1 : 0.9)),
    }));
  }, []);

  const zoom = (factor: number): void =>
    setView((v) => ({ ...v, scale: clampScale(v.scale * factor) }));

  const resetView = (): void => setView({ scale: 0.62, tx: 0, ty: 0 });

  const onNodeTap = (id: string): void => {
    if (dragged.current) return;
    setSelected(id);
  };

  const allocate = (id: string): void => {
    if (canAllocate(id, level, picks)) allocatePick(id);
  };

  const refund = (id: string): void => {
    if (!canDeallocate(id, picks)) return;
    if (!spendShards(RESPEC_SHARD_COST)) return;
    deallocatePick(id);
  };

  const nodeRadius = (kind: ChartNodeDef["kind"]): number =>
    kind === "keystone" ? 13 : kind === "notable" ? 10 : kind === "gate" ? 8 : 6;

  return (
    <Box pos="relative" mih="100dvh" bg={tokens.bg} style={{ overflow: "hidden" }}>
      <div
        className={styles.viewport}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        <svg
          className={styles.svg}
          viewBox={`0 0 ${String(CANVAS)} ${String(CANVAS)}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <g transform={`translate(${String(view.tx)} ${String(view.ty)}) scale(${String(view.scale)})`}>
            {EDGES.map(([a, b]) => {
              const lit = pickSet.has(a.id) && pickSet.has(b.id);
              return (
                <line
                  key={`${a.id}|${b.id}`}
                  x1={a.pos.x}
                  y1={a.pos.y}
                  x2={b.pos.x}
                  y2={b.pos.y}
                  stroke={lit ? tokens.accent : tokens.line}
                  strokeWidth={lit ? 2 : 1}
                  opacity={lit ? 0.9 : 0.35}
                />
              );
            })}
            {CHART_NODES.map((node) => {
              const color = constellationColor(node.constellation);
              const allocated = pickSet.has(node.id);
              const canGet = !allocated && isAllocatable(node.id, picks);
              const r = nodeRadius(node.kind);
              const fill = allocated ? color.stroke : color.fill;
              const stroke = allocated || canGet ? color.stroke : tokens.faint;
              const opacity = allocated ? 1 : canGet ? 1 : 0.4;
              const highlight = selected === node.id;
              if (node.kind === "keystone") {
                return (
                  <rect
                    key={node.id}
                    className={`${styles.node ?? ""} ${canGet ? styles.pulse ?? "" : ""}`}
                    x={node.pos.x - r}
                    y={node.pos.y - r}
                    width={r * 2}
                    height={r * 2}
                    transform={`rotate(45 ${String(node.pos.x)} ${String(node.pos.y)})`}
                    fill={fill}
                    stroke={highlight ? tokens.text : stroke}
                    strokeWidth={highlight ? 3 : 2}
                    opacity={opacity}
                    onPointerUp={() => {
                      onNodeTap(node.id);
                    }}
                  />
                );
              }
              return (
                <circle
                  key={node.id}
                  className={`${styles.node ?? ""} ${canGet ? styles.pulse ?? "" : ""}`}
                  cx={node.pos.x}
                  cy={node.pos.y}
                  r={r}
                  fill={fill}
                  stroke={highlight ? tokens.text : stroke}
                  strokeWidth={
                    highlight ? 3 : node.kind === "notable" ? 3 : 1.5
                  }
                  opacity={opacity}
                  onPointerUp={() => {
                    onNodeTap(node.id);
                  }}
                />
              );
            })}
          </g>
        </svg>
      </div>

      <Group
        pos="absolute"
        top={0}
        left={0}
        right={0}
        p="sm"
        justify="space-between"
        style={{ pointerEvents: "none" }}
      >
        <Button
          size="xs"
          variant="default"
          onClick={() => {
            go("menu");
          }}
          style={{ pointerEvents: "auto" }}
        >
          {t("common:back")}
        </Button>
        <Paper bg={tokens.surface1} px="sm" py={4} radius="md" withBorder>
          <Text size="sm" c={tokens.text}>
            {t("meta:chart.header", { points, level })}
          </Text>
        </Paper>
        <Button
          size="xs"
          variant={respec ? "filled" : "default"}
          color={respec ? "danger" : undefined}
          onClick={() => {
            setRespec((r) => !r);
          }}
          style={{ pointerEvents: "auto" }}
        >
          {respec ? t("meta:chart.respecOff") : t("meta:chart.respecMode")}
        </Button>
      </Group>

      <Stack pos="absolute" bottom={12} left={12} gap={6} style={{ pointerEvents: "auto" }}>
        <ActionIcon variant="default" onClick={() => { zoom(1.2); }} aria-label="zoom in">
          +
        </ActionIcon>
        <ActionIcon variant="default" onClick={() => { zoom(0.8); }} aria-label="zoom out">
          −
        </ActionIcon>
        <ActionIcon variant="default" onClick={resetView} aria-label="reset">
          ⟲
        </ActionIcon>
      </Stack>

      {selectedNode !== undefined ? (
        <Paper
          pos="absolute"
          bottom={12}
          right={12}
          left={64}
          maw={360}
          ml="auto"
          bg={tokens.surface1}
          p="md"
          radius="md"
          withBorder
          style={{ pointerEvents: "auto" }}
        >
          <Stack gap="xs">
            <Group justify="space-between">
              <Text fw={600} c={tokens.text}>
                {chartNodeTitle(selectedNode, t)}
              </Text>
              <Badge
                variant="light"
                color="gray"
                style={{
                  color: constellationColor(selectedNode.constellation).stroke,
                }}
              >
                {t(`meta:constellation.${selectedNode.constellation}`)}
              </Badge>
            </Group>
            {chartNodeLines(selectedNode, t).map((line, i) => (
              <Text key={i} size="sm" c={tokens.dim}>
                · {line}
              </Text>
            ))}
            {pickSet.has(selectedNode.id) ? (
              respec ? (
                <Button
                  size="xs"
                  color="danger"
                  disabled={
                    !canDeallocate(selectedNode.id, picks) ||
                    shards < RESPEC_SHARD_COST
                  }
                  onClick={() => {
                    refund(selectedNode.id);
                  }}
                >
                  {t("meta:chart.refundCost", { cost: RESPEC_SHARD_COST })}
                </Button>
              ) : (
                <Badge color="teal" variant="light">
                  {t("meta:chart.allocatedTag")}
                </Badge>
              )
            ) : (
              <Button
                size="xs"
                disabled={!canAllocate(selectedNode.id, level, picks)}
                onClick={() => {
                  allocate(selectedNode.id);
                }}
              >
                {points <= 0
                  ? t("meta:chart.noPoints")
                  : t("meta:chart.allocate")}
              </Button>
            )}
          </Stack>
        </Paper>
      ) : null}
    </Box>
  );
};
