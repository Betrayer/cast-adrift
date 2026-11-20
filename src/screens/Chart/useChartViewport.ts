import { useCallback, useEffect, useRef, useState } from "react";
import type {
  PointerEvent as ReactPointerEvent,
  WheelEvent as ReactWheelEvent,
} from "react";
import { CHART_NODES } from "@/data/chart";
import type { ChartNodeDef } from "@/data/chart";
import type { ChartLayout, Point } from "@/game/chart/layouts";
import { playSfx } from "@/services/audio";
import { haptic } from "@/services/tma";
import {
  boundsOf,
  clientToUser,
  frameRegion,
  panBy,
  zoomAt,
  type Box,
  type ChartView,
} from "./chartView";

const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_PX = 24;
const REGION_PAD = 90;
const HOLD_MS = 350;

const IDENTITY: ChartView = { scale: 1, tx: 0, ty: 0 };

export const useChartViewport = ({
  layout,
  bounds,
  pickSet,
  onSelect,
  onHover,
}: {
  layout: ChartLayout;
  bounds: Box;
  pickSet: ReadonlySet<string>;
  onSelect: (id: string) => void;
  onHover: (id: string) => void;
}) => {
  const [view, setView] = useState<ChartView>(IDENTITY);
  const [viewport, setViewport] = useState<Box>({ x: 0, y: 0, w: 0, h: 0 });

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const dragged = useRef(false);
  const pinch = useRef<{ dist: number; x: number; y: number } | null>(null);
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);
  const framed = useRef(false);
  const holdTimer = useRef<number | null>(null);

  const measure = useCallback((): Box => {
    const element = viewportRef.current;
    if (element === null) return { x: 0, y: 0, w: 0, h: 0 };
    const rect = element.getBoundingClientRect();
    return { x: rect.left, y: rect.top, w: rect.width, h: rect.height };
  }, []);

  const homeView = useCallback((): ChartView | null => {
    const placed = (keep: (node: ChartNodeDef) => boolean): Point[] =>
      CHART_NODES.filter(keep)
        .map((node) => layout.pos.get(node.id))
        .filter((point): point is Point => point !== undefined);
    const owned = placed((node) => pickSet.has(node.id));
    const hub = placed((node) => node.constellation === "hub");
    const region = boundsOf(owned.length > 0 ? owned : hub, REGION_PAD);
    return region === null ? null : frameRegion(region, layout.bounds);
  }, [pickSet, layout]);

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

  const onPointerDown = useCallback((e: ReactPointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dragged.current = false;
  }, []);

  const onPointerMove = useCallback(
    (e: ReactPointerEvent) => {
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
          const anchor = clientToUser(bounds, box, midX, midY);
          setView((v) => zoomAt(v, bounds, dist / before.dist, anchor));
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
      setView((v) => panBy(v, bounds, box, dx, dy));
    },
    [measure, clearHold, bounds],
  );

  const onPointerUp = useCallback(
    (e: ReactPointerEvent) => {
      pointers.current.delete(e.pointerId);
      if (pointers.current.size < 2) pinch.current = null;
      clearHold();
    },
    [clearHold],
  );

  const onWheel = useCallback(
    (e: ReactWheelEvent) => {
      const anchor = clientToUser(bounds, measure(), e.clientX, e.clientY);
      setView((v) => zoomAt(v, bounds, e.deltaY < 0 ? 1.15 : 1 / 1.15, anchor));
    },
    [measure, bounds],
  );

  const zoomCentre = (factor: number): void => {
    const box = measure();
    const anchor = clientToUser(bounds, box, box.x + box.w / 2, box.y + box.h / 2);
    setView((v) => zoomAt(v, bounds, factor, anchor));
  };

  const resetView = (): void => {
    setView(homeView() ?? IDENTITY);
  };

  const onStagePointerUp = (e: ReactPointerEvent): void => {
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
    const anchor = clientToUser(bounds, measure(), e.clientX, e.clientY);
    playSfx("navTick", { rate: 1.28, gain: 1.5 });
    haptic("place");
    setView((v) => zoomAt(v, bounds, 1.8, anchor));
  };

  const onNodeTap = (id: string): void => {
    if (dragged.current) return;
    onSelect(id);
  };

  const onNodeHold = (id: string): void => {
    clearHold();
    holdTimer.current = window.setTimeout(() => {
      onHover(id);
    }, HOLD_MS);
  };

  return {
    viewportRef,
    view,
    viewport,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: (e: ReactPointerEvent) => {
        onPointerUp(e);
        onStagePointerUp(e);
      },
      onPointerCancel: onPointerUp,
      onWheel,
    },
    zoomCentre,
    resetView,
    onNodeTap,
    onNodeHold,
  };
};
