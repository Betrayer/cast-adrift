import { boundsOf as layoutBoundsOf } from "@/game/chart/layouts/geometry";
import type { Box, Point } from "@/game/chart/layouts/types";

export type { Box };

export interface ChartView {
  scale: number;
  tx: number;
  ty: number;
}

export const MIN_SCALE = 0.6;
export const MAX_SCALE = 8;
const KEEP_VISIBLE = 0.25;

export const clampScale = (scale: number): number =>
  Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));

export const fitScale = (bounds: Box, viewport: Box): number =>
  bounds.w <= 0 || bounds.h <= 0
    ? 1
    : Math.min(viewport.w / bounds.w, viewport.h / bounds.h);

export const letterbox = (
  bounds: Box,
  viewport: Box,
): { fit: number; offsetX: number; offsetY: number } => {
  const fit = fitScale(bounds, viewport);
  return {
    fit,
    offsetX: (viewport.w - bounds.w * fit) / 2,
    offsetY: (viewport.h - bounds.h * fit) / 2,
  };
};

export const cssPerUnit = (bounds: Box, viewport: Box, scale: number): number =>
  fitScale(bounds, viewport) * scale;

export const clientToUser = (
  bounds: Box,
  viewport: Box,
  clientX: number,
  clientY: number,
): { x: number; y: number } => {
  const { fit, offsetX, offsetY } = letterbox(bounds, viewport);
  return {
    x: (clientX - viewport.x - offsetX) / fit + bounds.x,
    y: (clientY - viewport.y - offsetY) / fit + bounds.y,
  };
};

export const clampView = (view: ChartView, bounds: Box): ChartView => {
  const marginX = bounds.w * KEEP_VISIBLE;
  const marginY = bounds.h * KEEP_VISIBLE;
  const minTx = bounds.x + marginX - view.scale * (bounds.x + bounds.w);
  const maxTx = bounds.x + bounds.w - marginX - view.scale * bounds.x;
  const minTy = bounds.y + marginY - view.scale * (bounds.y + bounds.h);
  const maxTy = bounds.y + bounds.h - marginY - view.scale * bounds.y;
  return {
    scale: view.scale,
    tx: Math.min(maxTx, Math.max(minTx, view.tx)),
    ty: Math.min(maxTy, Math.max(minTy, view.ty)),
  };
};

export const panBy = (
  view: ChartView,
  bounds: Box,
  viewport: Box,
  dxClient: number,
  dyClient: number,
): ChartView => {
  const scale = fitScale(bounds, viewport);
  return clampView(
    { scale: view.scale, tx: view.tx + dxClient / scale, ty: view.ty + dyClient / scale },
    bounds,
  );
};

export const zoomAt = (
  view: ChartView,
  bounds: Box,
  factor: number,
  anchor: { x: number; y: number },
): ChartView => {
  const next = clampScale(view.scale * factor);
  const ratio = next / view.scale;
  return clampView(
    {
      scale: next,
      tx: anchor.x - (anchor.x - view.tx) * ratio,
      ty: anchor.y - (anchor.y - view.ty) * ratio,
    },
    bounds,
  );
};

export const frameRegion = (
  region: Box,
  bounds: Box,
  fill = 0.7,
): ChartView => {
  const width = Math.max(region.w, 1);
  const height = Math.max(region.h, 1);
  const scale = clampScale(
    Math.min((bounds.w * fill) / width, (bounds.h * fill) / height),
  );
  const centreX = region.x + region.w / 2;
  const centreY = region.y + region.h / 2;
  return clampView(
    {
      scale,
      tx: bounds.x + bounds.w / 2 - scale * centreX,
      ty: bounds.y + bounds.h / 2 - scale * centreY,
    },
    bounds,
  );
};

export const boundsOf = (points: readonly Point[], pad: number): Box | null =>
  points.length === 0 ? null : layoutBoundsOf(points, pad);

export const MIN_TAP_PX = 32;

export const hitRadiusFor = (
  drawnRadius: number,
  bounds: Box,
  viewport: Box,
  scale: number,
): number => {
  const perUnit = cssPerUnit(bounds, viewport, scale);
  if (perUnit <= 0) return drawnRadius;
  return Math.max(drawnRadius, MIN_TAP_PX / 2 / perUnit);
};
