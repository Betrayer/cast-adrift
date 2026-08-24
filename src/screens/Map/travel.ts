import type { CSSProperties } from "react";

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

export interface Point {
  x: number;
  y: number;
}

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

export const trailLength = (from: Point, to: Point): number =>
  Math.round(Math.hypot(to.x - from.x, to.y - from.y));
