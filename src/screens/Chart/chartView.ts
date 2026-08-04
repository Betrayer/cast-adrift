export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

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

// The svg is `preserveAspectRatio="xMidYMid meet"`, so one factor maps user
// units to CSS pixels and the viewBox is letterboxed inside the element.
export const fitScale = (bounds: Box, viewport: Box): number =>
  bounds.w <= 0 || bounds.h <= 0
    ? 1
    : Math.min(viewport.w / bounds.w, viewport.h / bounds.h);

export const clientToUser = (
  bounds: Box,
  viewport: Box,
  clientX: number,
  clientY: number,
): { x: number; y: number } => {
  const scale = fitScale(bounds, viewport);
  const offsetX = (viewport.w - bounds.w * scale) / 2;
  const offsetY = (viewport.h - bounds.h * scale) / 2;
  return {
    x: (clientX - viewport.x - offsetX) / scale + bounds.x,
    y: (clientY - viewport.y - offsetY) / scale + bounds.y,
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

export const boundsOf = (
  points: readonly { x: number; y: number }[],
  pad: number,
): Box | null => {
  if (points.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  return {
    x: minX - pad,
    y: minY - pad,
    w: maxX - minX + pad * 2,
    h: maxY - minY + pad * 2,
  };
};

export const MIN_TAP_PX = 32;

export const hitRadiusFor = (
  drawnRadius: number,
  bounds: Box,
  viewport: Box,
  scale: number,
): number => {
  const cssPerUnit = fitScale(bounds, viewport) * scale;
  if (cssPerUnit <= 0) return drawnRadius;
  return Math.max(drawnRadius, MIN_TAP_PX / 2 / cssPerUnit);
};
