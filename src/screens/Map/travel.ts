import type { CSSProperties } from "react";
import type { Point } from "./mapGeometry";

export const MARKER_TRAVEL_MS = 420;

export const MARKER_ARRIVAL_MS = 120;

export const MAP_JUMP_MS = MARKER_TRAVEL_MS + MARKER_ARRIVAL_MS;

export const WARP_SUCK_MS = 420;

export const WARP_BURST_MS = 560;

export const WARP_LAND_MS = 620;

export const WARP_FLASH_MS = 260;

export const MARKER_MS_VAR = "--ca-map-jump-ms";

export const ARRIVAL_MS_VAR = "--ca-map-arrival-ms";

export const TRAIL_LEN_VAR = "--ca-trail-len";

export const markerStyle = (at: Point): CSSProperties =>
  ({
    transform: `translate(${String(at.x)}px, ${String(at.y)}px)`,
    [MARKER_MS_VAR]: `${String(MARKER_TRAVEL_MS)}ms`,
  }) as CSSProperties;

export const arrivalStyle = (): CSSProperties =>
  ({
    [ARRIVAL_MS_VAR]: `${String(MARKER_ARRIVAL_MS)}ms`,
  }) as CSSProperties;

export const trailStyle = (from: Point, to: Point): CSSProperties =>
  ({
    [MARKER_MS_VAR]: `${String(MARKER_TRAVEL_MS)}ms`,
    [TRAIL_LEN_VAR]: trailLength(from, to),
    strokeDasharray: trailLength(from, to),
  }) as CSSProperties;

export const hopDistance = (from: Point, to: Point): number =>
  Math.hypot(to.x - from.x, to.y - from.y);

export const trailLength = (from: Point, to: Point): number =>
  Math.round(hopDistance(from, to));

export const PATH_LEN_VAR = "--ca-path-len";

export const NODE_ROW_VAR = "--ca-node-row";

export const NODE_REVEAL_ROW_CAP = 8;

export const pathLength = (from: Point, to: Point): number =>
  Math.ceil(hopDistance(from, to)) + 1;

export const pathStyle = (from: Point, to: Point): CSSProperties =>
  ({
    [PATH_LEN_VAR]: pathLength(from, to),
    strokeDasharray: pathLength(from, to),
  }) as CSSProperties;

export const nodeRevealStep = (rowsAway: number): number =>
  Math.min(NODE_REVEAL_ROW_CAP, Math.abs(rowsAway));

export const nodeRevealStyle = (rowsAway: number): CSSProperties =>
  ({
    [NODE_ROW_VAR]: String(nodeRevealStep(rowsAway)),
  }) as CSSProperties;

export interface WarpBeat {
  phase: "suck" | "burst" | "land";
  x: number;
  y: number;
  rows: number;
  direction: "forward" | "backward";
  aim: Point | null;
}

export const WARP_REACH_VAR = "--ca-warp-reach";

export const WARP_SUCK_MS_VAR = "--ca-warp-suck-ms";

export const warpAimStyle = (from: Point, aim: Point): CSSProperties => ({
  transform: `rotate(${String(
    (Math.atan2(aim.y - from.y, aim.x - from.x) * 180) / Math.PI,
  )}deg)`,
});

export const warpStretchStyle = (from: Point, aim: Point): CSSProperties =>
  ({
    [WARP_REACH_VAR]: `${String(hopDistance(from, aim))}px`,
    [WARP_SUCK_MS_VAR]: `${String(WARP_SUCK_MS)}ms`,
  }) as CSSProperties;

export const warpAimMark = (aim: Point): string =>
  `${String(Math.round(aim.x))},${String(Math.round(aim.y))}`;
