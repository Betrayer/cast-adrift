import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Screen } from "@/app/Screen";
import { useAtLeast } from "@/app/breakpoints";
import { backdropMode, deviceTier } from "@/app/deviceTier";
import { CHART_NODES, CHART_NODE_BY_ID } from "@/data/chart";
import type { ChartNodeDef } from "@/data/chart";
import {
  canAllocate,
  canDeallocate,
  chartResetCost,
  pathTo,
  pickedChain,
  pointsAvailable,
  respecCost,
} from "@/game/chart/engine";
import { CORE_NODE_ID } from "@/game/chart/cost";
import { layoutChart, type Point } from "@/game/chart/layouts";
import { chartGlow } from "@/game/chart/layouts/glow";
import { trackEvent } from "@/services/analytics";
import { playSfx } from "@/services/audio";
import { useChartLayoutId } from "@/services/prefs";
import { useMetaStore } from "@/stores/metaStore";
import { useReducedMotion, useSettingsStore } from "@/stores/settingsStore";
import { ChartBackdrop } from "./ChartBackdrop";
import { RefundConfirmModal, ResetConfirmModal } from "./ChartConfirmModals";
import { ChartDecorLayer } from "./ChartDecorLayer";
import { ChartFilterBar } from "./ChartFilterBar";
import {
  ChartLinks,
  ChartNodes,
  ChartPulseTrail,
  type ChartPulse,
} from "./ChartGraph";
import { ChartHeaderBar } from "./ChartHeaderBar";
import { ChartNodeDetail } from "./ChartNodeDetail";
import { backdropPalette } from "./chartPresentation";
import { ChartViewControls } from "./ChartViewControls";
import { useChartViewport } from "./useChartViewport";
import { useLayoutMotion } from "./useLayoutMotion";
import { cssPerUnit } from "./chartView";
import styles from "./ChartScreen.module.css";

const PATH_TICK_MS = 45;

export const ChartScreen = () => {
  const picks = useMetaStore((s) => s.chartPicks);
  const level = useMetaStore((s) => s.level);
  const shards = useMetaStore((s) => s.shards);
  const allocatePick = useMetaStore((s) => s.allocatePick);
  const deallocatePick = useMetaStore((s) => s.deallocatePick);
  const spendShards = useMetaStore((s) => s.spendShards);
  const freeRespecs = useMetaStore((s) => s.chartFreeRespecs);
  const resetChart = useMetaStore((s) => s.resetChart);
  const wide = useAtLeast("lg");
  const layoutId = useChartLayoutId();
  const layout = useMemo(() => layoutChart(CHART_NODES, layoutId), [layoutId]);
  const reduced = useReducedMotion();
  const [tier] = useState(deviceTier);
  const mode = backdropMode({ reduced, tier });
  const shown = useLayoutMotion(layout, reduced);
  const bounds = shown.bounds;
  const themeId = useSettingsStore((s) => s.theme);
  const palette = useMemo(() => backdropPalette(themeId), [themeId]);
  const posOf = (id: string): Point => shown.pos.get(id) ?? layout.centre;

  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [respec, setRespec] = useState(false);
  const [confirmRefund, setConfirmRefund] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [pulse, setPulse] = useState<ChartPulse | null>(null);

  const pickSet = useMemo(() => new Set(picks), [picks]);
  const {
    viewportRef,
    view,
    viewport,
    handlers,
    zoomCentre,
    resetView,
    onNodeTap,
    onNodeHold,
  } = useChartViewport({
    layout,
    bounds,
    pickSet,
    onSelect: setSelected,
    onHover: setHovered,
  });
  const glow = useMemo(() => chartGlow(picks), [picks]);
  const pulseCount = useRef(0);
  const points = pointsAvailable(level, picks);
  const resetPrice = chartResetCost(level, picks);
  const resettable = picks.filter((id) => id !== CORE_NODE_ID).length;

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

  const [viewLayout, setViewLayout] = useState(layoutId);
  if (viewLayout !== layoutId) {
    setViewLayout(layoutId);
    setPulse(null);
    resetView();
  }

  const allocate = (id: string): void => {
    if (!canAllocate(id, level, picks)) return;
    playSfx("chartAllocate");
    allocatePick(id);
    pulseCount.current += 1;
    setPulse({ key: pulseCount.current, node: id, chain: pickedChain(id, picks) });
  };

  const refund = (id: string): void => {
    if (!canDeallocate(id, picks)) return;
    const price = respecCost(id);
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
  const perUnit = cssPerUnit(bounds, viewport, view.scale);
  const labelSize = perUnit * 10;
  const unitsPerPx = perUnit > 0 ? 1 / perUnit : 1;

  const detail = (
    <ChartNodeDetail
      node={selectedNode}
      picks={picks}
      owned={selectedNode !== undefined && pickSet.has(selectedNode.id)}
      respec={respec}
      level={level}
      shards={shards}
      points={points}
      preview={preview}
      onRequestRefund={setConfirmRefund}
      onAllocate={allocate}
    />
  );

  return (
    <Screen
      width="full"
      pad={false}
      scroll={false}
      header={
        <ChartHeaderBar
          points={points}
          level={level}
          picks={picks}
          resettable={resettable}
          filterOpen={filterOpen}
          filterCount={tagFilter.length}
          respec={respec}
          freeRespecs={freeRespecs}
          onToggleFilter={() => {
            setFilterOpen((open) => !open);
          }}
          onToggleRespec={() => {
            setRespec((r) => !r);
          }}
          onOpenReset={() => {
            setConfirmReset(true);
          }}
        />
      }
    >
      <div className={styles.stage}>
        <div
          className={styles.viewport}
          ref={viewportRef}
          onPointerDown={handlers.onPointerDown}
          onPointerMove={handlers.onPointerMove}
          onPointerUp={handlers.onPointerUp}
          onPointerCancel={handlers.onPointerCancel}
          onWheel={handlers.onWheel}
          data-chart-layout={layoutId}
        >
          <ChartBackdrop
            layout={layout}
            bounds={bounds}
            view={view}
            glow={glow}
            palette={palette}
            mode={mode}
          />
          <svg
            className={styles.svg}
            viewBox={`${String(bounds.x)} ${String(bounds.y)} ${String(bounds.w)} ${String(bounds.h)}`}
            preserveAspectRatio="xMidYMid meet"
            data-chart-svg
          >
            <g
              transform={`translate(${String(view.tx)} ${String(view.ty)}) scale(${String(view.scale)})`}
            >
              <ChartDecorLayer
                layout={layout}
                glow={glow}
                flashKey={pulse === null || layoutId !== "nebulae" ? null : pulse.key}
              />
              <ChartLinks pickSet={pickSet} previewSet={previewSet} posOf={posOf} />
              <ChartNodes
                picks={picks}
                pickSet={pickSet}
                previewSet={previewSet}
                matchesFilter={matchesFilter}
                posOf={posOf}
                selected={selected}
                hovered={hovered}
                pulse={pulse}
                reduced={reduced}
                bounds={bounds}
                viewport={viewport}
                viewScale={view.scale}
                unitsPerPx={unitsPerPx}
                labelSize={labelSize}
                wide={wide}
                onHover={setHovered}
                onHold={onNodeHold}
                onTap={onNodeTap}
              />
              {pulse !== null && !reduced && pulse.chain.length > 1 ? (
                <ChartPulseTrail
                  key={pulse.key}
                  pulse={pulse}
                  pos={shown.pos}
                  onDone={() => {
                    setPulse(null);
                  }}
                />
              ) : null}
            </g>
          </svg>
          <ChartViewControls
            layoutId={layoutId}
            onZoom={zoomCentre}
            onReset={resetView}
          />
          {filterOpen ? (
            <ChartFilterBar value={tagFilter} onChange={setTagFilter} />
          ) : null}
          {wide || selectedNode === undefined ? null : detail}
        </div>
        {wide ? detail : null}
      </div>
      <RefundConfirmModal
        opened={confirmRefund !== null}
        target={refundTarget}
        onCancel={() => {
          setConfirmRefund(null);
        }}
        onConfirm={() => {
          if (confirmRefund !== null) refund(confirmRefund);
        }}
      />
      <ResetConfirmModal
        opened={confirmReset}
        count={resettable}
        freeRespecs={freeRespecs}
        shards={shards}
        price={resetPrice}
        onCancel={() => {
          setConfirmReset(false);
        }}
        onConfirm={() => {
          if (!resetChart()) return;
          playSfx("respecConfirm");
          setSelected(null);
          setConfirmReset(false);
        }}
      />
    </Screen>
  );
};
