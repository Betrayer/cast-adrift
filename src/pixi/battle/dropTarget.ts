import type { Point, Rect } from "@/pixi/battle/layout";
import type { SlotId } from "@/types/battle";

export type DropTarget = SlotId | "reserve";

export interface DropCandidate {
  target: DropTarget;
  rect: Rect;
}

export const CAPTURE_RADIUS_FACTOR = 0.75;
export const HOME_RADIUS_FACTOR = 0.5;
export const CAPTURE_PULL = 0.3;
export const PULL_EASE = 0.3;
export const FRAME_MS = 1000 / 60;

export const overlapArea = (
  rect: Rect,
  cx: number,
  cy: number,
  size: number,
): number => {
  const w =
    Math.min(rect.x + rect.w, cx + size / 2) - Math.max(rect.x, cx - size / 2);
  const h =
    Math.min(rect.y + rect.h, cy + size / 2) - Math.max(rect.y, cy - size / 2);
  return w > 0 && h > 0 ? w * h : 0;
};

export const pickDropTarget = (
  at: Point,
  home: Point | null,
  size: number,
  candidates: readonly DropCandidate[],
): DropTarget | null => {
  if (home !== null && Math.hypot(at.x - home.x, at.y - home.y) < size * HOME_RADIUS_FACTOR) {
    return null;
  }
  const radius = size * CAPTURE_RADIUS_FACTOR;
  const dieArea = size * size;
  let best: DropTarget | null = null;
  let bestOverlap = -1;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const { target, rect } of candidates) {
    const distance = Math.hypot(
      Math.max(rect.x - at.x, 0, at.x - (rect.x + rect.w)),
      Math.max(rect.y - at.y, 0, at.y - (rect.y + rect.h)),
    );
    if (distance > radius) continue;
    const overlap =
      dieArea > 0 ? overlapArea(rect, at.x, at.y, size) / dieArea : 0;
    if (
      overlap > bestOverlap ||
      (overlap === bestOverlap && distance < bestDistance)
    ) {
      best = target;
      bestOverlap = overlap;
      bestDistance = distance;
    }
  }
  return best;
};

export const pulledPoint = (
  current: Point,
  free: Point,
  rect: Rect,
  deltaMs: number,
): Point => {
  const toX = free.x + (rect.x + rect.w / 2 - free.x) * CAPTURE_PULL;
  const toY = free.y + (rect.y + rect.h / 2 - free.y) * CAPTURE_PULL;
  const step = 1 - Math.pow(1 - PULL_EASE, Math.max(deltaMs, 1) / FRAME_MS);
  return {
    x: current.x + (toX - current.x) * step,
    y: current.y + (toY - current.y) * step,
  };
};
