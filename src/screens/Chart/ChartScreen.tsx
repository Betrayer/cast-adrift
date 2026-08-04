import { ActionIcon, Badge, Button, Group, Paper, Stack, Text } from "@mantine/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Screen } from "@/app/Screen";
import { useAtLeast } from "@/app/breakpoints";
import { tokens } from "@/app/theme";
import { CHART_BOUNDS, CHART_NODES, CHART_NODE_BY_ID } from "@/data/chart";
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
import { trackEvent } from "@/services/analytics";
import { playSfx } from "@/services/audio";
import { useMetaStore } from "@/stores/metaStore";
import {
  boundsOf,
  clientToUser,
  frameRegion,
  hitRadiusFor,
  panBy,
  zoomAt,
  type Box,
  type ChartView,
} from "./chartView";
import styles from "./ChartScreen.module.css";

const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_PX = 24;
const REGION_PAD = 90;
const LABEL_MIN_CSS = 9;

const constellationColor = (
  con: Constellation,
): { stroke: string; fill: string } =>
  con === "hub"
    ? { stroke: tokens.accent, fill: "#1E2340" }
    : { stroke: schools[con].stroke, fill: schools[con].fill };

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

const nodeRadius = (kind: ChartNodeDef["kind"]): number =>
  kind === "keystone" ? 13 : kind === "notable" ? 10 : kind === "gate" ? 8 : 6;

const IDENTITY: ChartView = { scale: 1, tx: 0, ty: 0 };

export const ChartScreen = () => {
  const { t } = useTranslation(["meta", "common"]);
  const go = useAppStore((s) => s.go);
  const picks = useMetaStore((s) => s.chartPicks);
  const level = useMetaStore((s) => s.level);
  const shards = useMetaStore((s) => s.shards);
  const allocatePick = useMetaStore((s) => s.allocatePick);
  const deallocatePick = useMetaStore((s) => s.deallocatePick);
  const spendShards = useMetaStore((s) => s.spendShards);
  const wide = useAtLeast("lg");

  const [view, setView] = useState<ChartView>(IDENTITY);
  const [selected, setSelected] = useState<string | null>(null);
  const [respec, setRespec] = useState(false);
  const [viewport, setViewport] = useState<Box>({ x: 0, y: 0, w: 0, h: 0 });

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const dragged = useRef(false);
  const pinch = useRef<{ dist: number; x: number; y: number } | null>(null);
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);
  const framed = useRef(false);

  const pickSet = useMemo(() => new Set(picks), [picks]);
  const points = pointsAvailable(level, picks);

  const measure = useCallback((): Box => {
    const element = viewportRef.current;
    if (element === null) return { x: 0, y: 0, w: 0, h: 0 };
    const rect = element.getBoundingClientRect();
    return { x: rect.left, y: rect.top, w: rect.width, h: rect.height };
  }, []);

  const homeView = useCallback((): ChartView | null => {
    const owned = CHART_NODES.filter((node) => pickSet.has(node.id)).map(
      (node) => node.pos,
    );
    const hub = CHART_NODES.filter((node) => node.constellation === "hub").map(
      (node) => node.pos,
    );
    const region = boundsOf(owned.length > 0 ? owned : hub, REGION_PAD);
    return region === null ? null : frameRegion(region, CHART_BOUNDS);
  }, [pickSet]);

  // The measurement subscription doubles as the first-frame framing: the chart
  // opens on the region the player has actually invested in, and a fresh
  // profile opens on the hub instead of the middle of an empty canvas.
  useEffect(() => {
    const element = viewportRef.current;
    if (element === null) return;
    const sync = (): void => {
      const box = measure();
      setViewport(box);
      if (framed.current || box.w <= 0) return;
      framed.current = true;
      const home = homeView();
      if (home !== null) setView(home);
    };
    const observer = new ResizeObserver(sync);
    observer.observe(element);
    window.addEventListener("resize", sync);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, [measure, homeView]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dragged.current = false;
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const prev = pointers.current.get(e.pointerId);
      if (prev === undefined) return;
      const pts = pointers.current;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const box = measure();
      if (pts.size >= 2) {
        const [a, b] = [...pts.values()];
        if (a === undefined || b === undefined) return;
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const midX = (a.x + b.x) / 2;
        const midY = (a.y + b.y) / 2;
        const before = pinch.current;
        if (before !== null && before.dist > 0) {
          const anchor = clientToUser(CHART_BOUNDS, box, midX, midY);
          setView((v) => zoomAt(v, CHART_BOUNDS, dist / before.dist, anchor));
        }
        pinch.current = { dist, x: midX, y: midY };
        dragged.current = true;
        return;
      }
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) dragged.current = true;
      setView((v) => panBy(v, CHART_BOUNDS, box, dx, dy));
    },
    [measure],
  );

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  }, []);

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      const anchor = clientToUser(
        CHART_BOUNDS,
        measure(),
        e.clientX,
        e.clientY,
      );
      setView((v) =>
        zoomAt(v, CHART_BOUNDS, e.deltaY < 0 ? 1.15 : 1 / 1.15, anchor),
      );
    },
    [measure],
  );

  const zoomCentre = (factor: number): void => {
    const box = measure();
    const anchor = clientToUser(
      CHART_BOUNDS,
      box,
      box.x + box.w / 2,
      box.y + box.h / 2,
    );
    setView((v) => zoomAt(v, CHART_BOUNDS, factor, anchor));
  };

  const resetView = (): void => {
    setView(homeView() ?? IDENTITY);
  };

  const onStagePointerUp = (e: React.PointerEvent): void => {
    if (dragged.current) return;
    const now = e.timeStamp;
    const previous = lastTap.current;
    lastTap.current = { t: now, x: e.clientX, y: e.clientY };
    if (
      previous === null ||
      now - previous.t > DOUBLE_TAP_MS ||
      Math.hypot(e.clientX - previous.x, e.clientY - previous.y) > DOUBLE_TAP_PX
    ) {
      return;
    }
    lastTap.current = null;
    const anchor = clientToUser(CHART_BOUNDS, measure(), e.clientX, e.clientY);
    setView((v) => zoomAt(v, CHART_BOUNDS, 1.8, anchor));
  };

  const onNodeTap = (id: string): void => {
    if (dragged.current) return;
    setSelected(id);
  };

  const allocate = (id: string): void => {
    if (!canAllocate(id, level, picks)) return;
    playSfx("chartAllocate");
    allocatePick(id);
  };

  const refund = (id: string): void => {
    if (!canDeallocate(id, picks)) return;
    if (!spendShards(RESPEC_SHARD_COST)) return;
    trackEvent({ name: "meta_purchase", params: { kind: "respec" } });
    deallocatePick(id);
  };

  const selectedNode =
    selected !== null ? CHART_NODE_BY_ID.get(selected) : undefined;
  const cssPerUnit =
    viewport.w > 0
      ? Math.min(
          viewport.w / CHART_BOUNDS.w,
          viewport.h / CHART_BOUNDS.h,
        ) * view.scale
      : 0;
  const labelsVisible = cssPerUnit * 10 >= LABEL_MIN_CSS;

  const detail =
    selectedNode === undefined ? null : (
      <Paper
        className={styles.detail}
        bg={tokens.surface1}
        p="md"
        radius="md"
        withBorder
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
    );

  return (
    <Screen
      width="full"
      pad={false}
      scroll={false}
      header={
        <div className={styles.headerBar}>
          <Button
            size="xs"
            variant="default"
            onClick={() => {
              go("menu");
            }}
          >
            {t("common:back")}
          </Button>
          <Text size="sm" c={tokens.text}>
            {t("meta:chart.header", { points, level })}
          </Text>
          <Button
            size="xs"
            variant={respec ? "filled" : "default"}
            color={respec ? "danger" : undefined}
            onClick={() => {
              setRespec((r) => !r);
            }}
          >
            {respec ? t("meta:chart.respecOff") : t("meta:chart.respecMode")}
          </Button>
        </div>
      }
    >
      <div className={styles.stage}>
        <div
          className={styles.viewport}
          ref={viewportRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={(e) => {
            onPointerUp(e);
            onStagePointerUp(e);
          }}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
        >
          <svg
            className={styles.svg}
            viewBox={`${String(CHART_BOUNDS.x)} ${String(CHART_BOUNDS.y)} ${String(CHART_BOUNDS.w)} ${String(CHART_BOUNDS.h)}`}
            preserveAspectRatio="xMidYMid meet"
          >
            <g
              transform={`translate(${String(view.tx)} ${String(view.ty)}) scale(${String(view.scale)})`}
            >
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
                const hitR = hitRadiusFor(
                  r,
                  CHART_BOUNDS,
                  viewport,
                  view.scale,
                );
                return (
                  <g key={node.id}>
                    {node.kind === "keystone" ? (
                      <rect
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
                      />
                    ) : (
                      <circle
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
                      />
                    )}
                    {labelsVisible && node.kind !== "small" ? (
                      <text
                        className={styles.label}
                        x={node.pos.x}
                        y={node.pos.y - r - 6}
                        textAnchor="middle"
                        fontSize={12}
                        fill={allocated ? tokens.text : tokens.dim}
                        opacity={opacity}
                      >
                        {chartNodeTitle(node, t)}
                      </text>
                    ) : null}
                    <circle
                      className={styles.hit}
                      cx={node.pos.x}
                      cy={node.pos.y}
                      r={hitR}
                      onPointerUp={() => {
                        onNodeTap(node.id);
                      }}
                    />
                  </g>
                );
              })}
            </g>
          </svg>
          <div className={styles.zoomControls}>
            <ActionIcon
              variant="default"
              onClick={() => {
                zoomCentre(1.35);
              }}
              aria-label="zoom in"
            >
              +
            </ActionIcon>
            <ActionIcon
              variant="default"
              onClick={() => {
                zoomCentre(1 / 1.35);
              }}
              aria-label="zoom out"
            >
              −
            </ActionIcon>
            <ActionIcon variant="default" onClick={resetView} aria-label="reset">
              ⟲
            </ActionIcon>
          </div>
          {wide ? null : detail}
        </div>
        {wide ? (
          detail ?? (
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
          )
        ) : null}
      </div>
    </Screen>
  );
};
