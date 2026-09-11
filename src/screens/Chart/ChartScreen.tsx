import {
  ActionIcon,
  Badge,
  Button,
  Chip,
  Group,
  Modal,
  Paper,
  Stack,
  Text,
} from "@mantine/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Screen } from "@/app/Screen";
import { AppHeader } from "@/components/AppHeader";
import { useAtLeast } from "@/app/breakpoints";
import { tokens } from "@/app/theme";
import { CHART_BOUNDS, CHART_NODES, CHART_NODE_BY_ID } from "@/data/chart";
import type { ChartNodeDef, Constellation } from "@/data/chart";
import { schools } from "@/data/schools";
import type { ContentTag } from "@/data/tags";
import {
  canAllocate,
  canDeallocate,
  isAllocatable,
  pathTo,
  pointsAvailable,
  pointsSpent,
  pointsTotal,
  respecCost,
} from "@/game/chart/engine";
import { chartNodeCost } from "@/game/chart/cost";
import { chartNodeLines, chartNodeTitle } from "@/game/chart/describe";
import { trackEvent } from "@/services/analytics";
import { playSfx } from "@/services/audio";
import { haptic } from "@/services/tma";
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
const LABEL_PX = 12;

const LABEL_MIN_CSS: Record<string, number> = {
  keystone: 6,
  gate: 6,
  notable: 20,
  minor: 26,
  small: Infinity,
};

const labelBelow = (id: string): boolean => {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) | 0;
  return (h & 1) === 1;
};
const HOLD_MS = 350;
const PATH_TICK_MS = 45;

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

const CHART_TAGS: readonly ContentTag[] = [
  ...new Set(CHART_NODES.flatMap((node) => node.tags ?? [])),
].sort();

const nodeRadius = (kind: ChartNodeDef["kind"]): number =>
  kind === "keystone"
    ? 13
    : kind === "notable"
      ? 10
      : kind === "minor"
        ? 8
        : kind === "gate"
          ? 8
          : 6;

const IDENTITY: ChartView = { scale: 1, tx: 0, ty: 0 };

export const ChartScreen = () => {
  const { t } = useTranslation(["meta", "common", "battle"]);
  const picks = useMetaStore((s) => s.chartPicks);
  const level = useMetaStore((s) => s.level);
  const shards = useMetaStore((s) => s.shards);
  const allocatePick = useMetaStore((s) => s.allocatePick);
  const deallocatePick = useMetaStore((s) => s.deallocatePick);
  const spendShards = useMetaStore((s) => s.spendShards);
  const freeRespecs = useMetaStore((s) => s.chartFreeRespecs);
  const fullRespec = useMetaStore((s) => s.fullRespec);
  const wide = useAtLeast("lg");

  const [view, setView] = useState<ChartView>(IDENTITY);
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [respec, setRespec] = useState(false);
  const [confirmRefund, setConfirmRefund] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [viewport, setViewport] = useState<Box>({ x: 0, y: 0, w: 0, h: 0 });

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const dragged = useRef(false);
  const pinch = useRef<{ dist: number; x: number; y: number } | null>(null);
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);
  const framed = useRef(false);
  const holdTimer = useRef<number | null>(null);

  const pickSet = useMemo(() => new Set(picks), [picks]);
  const points = pointsAvailable(level, picks);

  const previewId = hovered ?? selected;
  const preview = useMemo(
    () => (previewId === null ? null : pathTo(previewId, picks)),
    [previewId, picks],
  );
  const previewLength = preview?.ids.length ?? 0;
  useEffect(() => {
    if (previewLength === 0) return;
    const timers = Array.from({ length: Math.min(previewLength, 8) }, (_, i) =>
      window.setTimeout(() => {
        playSfx("navTick", { rate: 1 + i * 0.06, gain: 1.6 });
      }, i * PATH_TICK_MS),
    );
    return () => {
      for (const id of timers) window.clearTimeout(id);
    };
  }, [previewLength, previewId]);

  const previewSet = useMemo(
    () => new Set(preview?.ids ?? []),
    [preview],
  );
  const filterSet = useMemo(() => new Set(tagFilter), [tagFilter]);
  const matchesFilter = useCallback(
    (node: ChartNodeDef): boolean =>
      filterSet.size === 0 ||
      (node.tags ?? []).some((tag) => filterSet.has(tag)),
    [filterSet],
  );

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

  useEffect(() => {
    const element = viewportRef.current;
    if (element === null) return;
    const sync = (): void => {
      const box = measure();
      if (box.w <= 0) return;
      setViewport(box);
      if (framed.current) return;
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

  const clearHold = useCallback(() => {
    if (holdTimer.current !== null) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }, []);

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
      if (Math.abs(dx) + Math.abs(dy) > 3) {
        dragged.current = true;
        clearHold();
      }
      setView((v) => panBy(v, CHART_BOUNDS, box, dx, dy));
    },
    [measure, clearHold],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      pointers.current.delete(e.pointerId);
      if (pointers.current.size < 2) pinch.current = null;
      clearHold();
    },
    [clearHold],
  );

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
    playSfx("navTick", { rate: 1.28, gain: 1.5 });
    haptic("place");
    setView((v) => zoomAt(v, CHART_BOUNDS, 1.8, anchor));
  };

  const stopStagePointer = (e: React.PointerEvent): void => {
    e.stopPropagation();
  };

  const onNodeTap = (id: string): void => {
    if (dragged.current) return;
    setSelected(id);
  };

  const onNodeHold = (id: string): void => {
    clearHold();
    holdTimer.current = window.setTimeout(() => {
      setHovered(id);
    }, HOLD_MS);
  };

  const allocate = (id: string): void => {
    if (!canAllocate(id, level, picks)) return;
    playSfx("chartAllocate");
    allocatePick(id);
  };

  const refund = (id: string): void => {
    if (!canDeallocate(id, picks)) return;
    const price = respecCost(level, id);
    if (price > 0 && !spendShards(price)) return;
    playSfx("respecConfirm");
    trackEvent({ name: "meta_purchase", params: { kind: "respec" } });
    deallocatePick(id);
    setConfirmRefund(null);
  };

  const selectedNode =
    selected !== null ? CHART_NODE_BY_ID.get(selected) : undefined;
  const refundTarget =
    confirmRefund !== null ? CHART_NODE_BY_ID.get(confirmRefund) : undefined;
  const selectedCost =
    selectedNode === undefined ? 0 : chartNodeCost(selectedNode.id);
  const selectedRefund =
    selectedNode === undefined ? 0 : respecCost(level, selectedNode.id);
  const cssPerUnit =
    viewport.w > 0
      ? Math.min(
          viewport.w / CHART_BOUNDS.w,
          viewport.h / CHART_BOUNDS.h,
        ) * view.scale
      : 0;
  const labelSize = cssPerUnit * 10;
  const unitsPerPx = cssPerUnit > 0 ? 1 / cssPerUnit : 1;
  const labelVisibleFor = (node: ChartNodeDef): boolean =>
    selected === node.id ||
    hovered === node.id ||
    labelSize >= (LABEL_MIN_CSS[node.kind] ?? Infinity);

  const detail =
    selectedNode === undefined ? null : (
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
              {chartNodeTitle(selectedNode, t)}
            </Text>
            <Group gap={4}>
              <Badge variant="light" color="gray" data-chart-cost={selectedCost}>
                {t("meta:chart.cost", { n: selectedCost })}
              </Badge>
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
          </Group>
          {chartNodeLines(selectedNode, t).map((line, i) => (
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
          {(selectedNode.tags ?? []).length === 0 ? null : (
            <Group gap={4}>
              {(selectedNode.tags ?? []).map((tag) => (
                <Badge key={tag} size="xs" variant="outline" color="gray">
                  {t(`meta:chartTag.${tag}`)}
                </Badge>
              ))}
            </Group>
          )}
          {pickSet.has(selectedNode.id) ? (
            respec ? (
              <Button
                size="xs"
                color="danger"
                data-chart-refund
                disabled={
                  !canDeallocate(selectedNode.id, picks) ||
                  shards < selectedRefund
                }
                onClick={() => {
                  setConfirmRefund(selectedNode.id);
                }}
              >
                {selectedRefund === 0
                  ? t("meta:chart.refundFree")
                  : t("meta:chart.refundCost", { cost: selectedRefund })}
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
                disabled={!canAllocate(selectedNode.id, level, picks)}
                onClick={() => {
                  allocate(selectedNode.id);
                }}
              >
                {points < selectedCost
                  ? t("meta:chart.noPoints")
                  : t("meta:chart.allocate")}
              </Button>
            </>
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
          <AppHeader
            subtitle={t("meta:chart.header", { points, level })}
            actions={
              <>
                <Button
                  size="compact-sm"
                  variant={filterOpen ? "filled" : "default"}
                  data-chart-filter-toggle
                  onClick={() => {
                    setFilterOpen((open) => !open);
                  }}
                >
                  {tagFilter.length === 0
                    ? t("meta:chart.filter")
                    : t("meta:chart.filterOn", { n: tagFilter.length })}
                </Button>
                <Button
                  size="compact-sm"
                  variant={respec ? "filled" : "default"}
                  color={respec ? "danger" : undefined}
                  onClick={() => {
                    setRespec((r) => !r);
                  }}
                >
                  {respec ? t("meta:chart.respecOff") : t("meta:chart.respecMode")}
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
                  onClick={() => {
                    setConfirmReset(true);
                  }}
                >
                  {t("meta:chart.freeRespec")}
                </Button>
              </Group>
            </Paper>
          ) : null}
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
                const onPath =
                  (previewSet.has(a.id) || pickSet.has(a.id)) &&
                  (previewSet.has(b.id) || pickSet.has(b.id)) &&
                  (previewSet.has(a.id) || previewSet.has(b.id));
                return (
                  <line
                    key={`${a.id}|${b.id}`}
                    x1={a.pos.x}
                    y1={a.pos.y}
                    x2={b.pos.x}
                    y2={b.pos.y}
                    stroke={
                      lit
                        ? tokens.accent
                        : onPath
                          ? tokens.amber
                          : tokens.line
                    }
                    strokeWidth={lit || onPath ? 2 : 1}
                    opacity={lit ? 0.9 : onPath ? 0.85 : 0.35}
                  />
                );
              })}
              {CHART_NODES.map((node) => {
                const color = constellationColor(node.constellation);
                const allocated = pickSet.has(node.id);
                const canGet = !allocated && isAllocatable(node.id, picks);
                const onPath = previewSet.has(node.id);
                const dimmed = !matchesFilter(node) && !allocated;
                const r = nodeRadius(node.kind);
                const fill = allocated ? color.stroke : color.fill;
                const stroke = allocated || canGet ? color.stroke : tokens.faint;
                const opacity = dimmed
                  ? 0.12
                  : allocated
                    ? 1
                    : canGet || onPath
                      ? 1
                      : 0.4;
                const highlight = selected === node.id;
                const hitR = hitRadiusFor(
                  r,
                  CHART_BOUNDS,
                  viewport,
                  view.scale,
                );
                const outline = highlight
                  ? tokens.text
                  : onPath
                    ? tokens.amber
                    : stroke;
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
                        stroke={outline}
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
                        stroke={outline}
                        strokeWidth={
                          highlight
                            ? 3
                            : node.kind === "notable"
                              ? 3
                              : node.kind === "minor"
                                ? 2.5
                                : 1.5
                        }
                        opacity={opacity}
                      />
                    )}
                    {labelVisibleFor(node) ? (
                      <text
                        className={styles.label}
                        x={node.pos.x}
                        y={
                          labelBelow(node.id)
                            ? node.pos.y + r + LABEL_PX * unitsPerPx
                            : node.pos.y - r - 6 * unitsPerPx
                        }
                        textAnchor="middle"
                        fontSize={LABEL_PX * unitsPerPx}
                        fill={
                          highlight
                            ? tokens.text
                            : allocated
                              ? tokens.text
                              : tokens.dim
                        }
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
                      data-chart-node={node.id}
                      onPointerEnter={() => {
                        if (wide) setHovered(node.id);
                      }}
                      onPointerLeave={() => {
                        setHovered(null);
                      }}
                      onPointerDown={() => {
                        onNodeHold(node.id);
                      }}
                      onPointerUp={() => {
                        onNodeTap(node.id);
                      }}
                    />
                  </g>
                );
              })}
            </g>
          </svg>
          <div
            className={styles.zoomControls}
            onPointerDown={stopStagePointer}
            onPointerUp={stopStagePointer}
            onPointerMove={stopStagePointer}
          >
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
          {filterOpen ? (
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
                value={tagFilter}
                onChange={(value) => {
                  setTagFilter(value as string[]);
                }}
              >
                <Group gap={4}>
                  {CHART_TAGS.map((tag) => (
                    <Chip key={tag} value={tag} size="xs">
                      <span data-chart-tag={tag}>
                        {t(`meta:chartTag.${tag}`)}
                      </span>
                    </Chip>
                  ))}
                </Group>
              </Chip.Group>
              {tagFilter.length === 0 ? null : (
                <Button
                  size="compact-xs"
                  variant="subtle"
                  mt={4}
                  onClick={() => {
                    setTagFilter([]);
                  }}
                >
                  {t("meta:chart.filterClear")}
                </Button>
              )}
            </Paper>
          ) : null}
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
      <Modal
        opened={confirmRefund !== null}
        onClose={() => {
          setConfirmRefund(null);
        }}
        title={t("meta:chart.respecConfirmTitle")}
        centered
        data-respec-confirm
      >
        <Stack gap="sm">
          <Text size="sm" c={tokens.dim}>
            {refundTarget === undefined
              ? ""
              : t("meta:chart.respecConfirmBody", {
                  name: chartNodeTitle(refundTarget, t),
                  cost: respecCost(level, refundTarget.id),
                  points: chartNodeCost(refundTarget.id),
                })}
          </Text>
          <Group grow>
            <Button
              variant="default"
              onClick={() => {
                setConfirmRefund(null);
              }}
            >
              {t("common:cancel")}
            </Button>
            <Button
              color="danger"
              data-respec-yes
              onClick={() => {
                if (confirmRefund !== null) refund(confirmRefund);
              }}
            >
              {t("meta:chart.respecConfirmYes")}
            </Button>
          </Group>
        </Stack>
      </Modal>
      <Modal
        opened={confirmReset}
        onClose={() => {
          setConfirmReset(false);
        }}
        title={t("meta:chart.freeRespecTitle")}
        centered
        data-full-respec-confirm
      >
        <Stack gap="sm">
          <Text size="sm" c={tokens.dim}>
            {t("meta:chart.freeRespecBody", { n: picks.length })}
          </Text>
          <Group grow>
            <Button
              variant="default"
              onClick={() => {
                setConfirmReset(false);
              }}
            >
              {t("common:cancel")}
            </Button>
            <Button
              color="danger"
              data-full-respec-yes
              onClick={() => {
                playSfx("respecConfirm");
                fullRespec();
                setSelected(null);
                setConfirmReset(false);
              }}
            >
              {t("meta:chart.freeRespecYes")}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Screen>
  );
};
