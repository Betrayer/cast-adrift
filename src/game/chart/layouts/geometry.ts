import type { ChartNodeKind } from "@/data/chart/types";
import type { ChartSkeleton } from "./skeleton";
import type { Box, Point } from "./types";

export const DEG = Math.PI / 180;

export const LAYOUT_CENTRE: Point = { x: 500, y: 500 };

export const NODE_RADIUS: Readonly<Record<ChartNodeKind, number>> = {
  keystone: 13,
  nexus: 13,
  notable: 10,
  confluence: 9,
  gate: 8,
  small: 6,
};

export const MIN_SEPARATION = 14;

export const NODE_GAP = 4;

export const clearance = (a: ChartNodeKind, b: ChartNodeKind): number =>
  Math.max(MIN_SEPARATION, NODE_RADIUS[a] + NODE_RADIUS[b] + NODE_GAP);

export const HUB_INNER_RADIUS = 46;

export const HUB_OUTER_RADIUS = 92;

export const BOUNDS_PAD = 40;

export const polar = (centre: Point, angle: number, radius: number): Point => ({
  x: centre.x + radius * Math.cos(angle),
  y: centre.y + radius * Math.sin(angle),
});

export const fmtPoint = (point: Point): string =>
  `${point.x.toFixed(1)},${point.y.toFixed(1)}`;

export const tipSide = (slot: number, count: number): number =>
  count === 1 ? 0 : slot === 0 ? -1 : 1;

export interface Squash {
  core: number;
  kx: number;
  ky: number;
}

export const squashed = (
  centre: Point,
  angle: number,
  radius: number,
  squash: Squash,
): Point => {
  const reach = radius <= squash.core ? 0 : radius - squash.core;
  const inner = Math.min(radius, squash.core);
  return {
    x: centre.x + Math.cos(angle) * (inner + reach * squash.kx),
    y: centre.y + Math.sin(angle) * (inner + reach * squash.ky),
  };
};

export const squashedAxes = (
  radius: number,
  squash: Squash,
): { rx: number; ry: number } => {
  const reach = Math.max(0, radius - squash.core);
  const inner = Math.min(radius, squash.core);
  return { rx: inner + reach * squash.kx, ry: inner + reach * squash.ky };
};

export const spokeAngle = (index: number, count: number): number =>
  (-90 + (index * 360) / count) * DEG;

export const distance = (a: Point, b: Point): number =>
  Math.hypot(a.x - b.x, a.y - b.y);

export const along = (from: Point, direction: Point, length: number): Point => ({
  x: from.x + direction.x * length,
  y: from.y + direction.y * length,
});

export const unit = (vector: Point): Point => {
  const length = Math.hypot(vector.x, vector.y);
  return length === 0 ? { x: 1, y: 0 } : { x: vector.x / length, y: vector.y / length };
};

export const normalOf = (direction: Point): Point => ({
  x: -direction.y,
  y: direction.x,
});

export const midpoint = (a: Point, b: Point): Point => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
});

export const pushedOut = (centre: Point, point: Point, factor: number): Point => ({
  x: centre.x + (point.x - centre.x) * factor,
  y: centre.y + (point.y - centre.y) * factor,
});

export const resampleByLength = (
  points: readonly Point[],
  count: number,
): Point[] => {
  const first = points[0];
  if (first === undefined || count <= 0) return [];
  if (count === 1 || points.length === 1) return [first];
  const lengths = [0];
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    lengths.push((lengths[i - 1] ?? 0) + (a && b ? distance(a, b) : 0));
  }
  const total = lengths[lengths.length - 1] ?? 0;
  const out: Point[] = [];
  let segment = 1;
  for (let k = 0; k < count; k += 1) {
    const target = (total * k) / (count - 1);
    while (segment < points.length - 1 && (lengths[segment] ?? 0) < target) {
      segment += 1;
    }
    const a = points[segment - 1] ?? first;
    const b = points[segment] ?? a;
    const start = lengths[segment - 1] ?? 0;
    const span = (lengths[segment] ?? start) - start;
    const t = span <= 0 ? 0 : (target - start) / span;
    out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  return out;
};

export const tangentAt = (points: readonly Point[], index: number): Point => {
  const before = points[Math.max(0, index - 1)];
  const after = points[Math.min(points.length - 1, index + 1)];
  if (before === undefined || after === undefined) return { x: 1, y: 0 };
  return unit({ x: after.x - before.x, y: after.y - before.y });
};

export const sideSlot = (slot: number): number =>
  (slot % 2 === 0 ? -1 : 1) * (1 + Math.floor(slot / 2) * 0.9);

export const placeHub = (
  skeleton: ChartSkeleton,
  centre: Point,
  pos: Map<string, Point>,
): void => {
  for (const member of skeleton.inner) {
    pos.set(
      member.id,
      polar(centre, (member.index * 2 * Math.PI) / member.count, HUB_INNER_RADIUS),
    );
  }
  for (const member of skeleton.outer) {
    pos.set(
      member.id,
      polar(centre, (member.index * 2 * Math.PI) / member.count, HUB_OUTER_RADIUS),
    );
  }
};

export const boundsOf = (points: Iterable<Point>, pad: number): Box => {
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
  if (!Number.isFinite(minX)) return { x: 0, y: 0, w: 1, h: 1 };
  return {
    x: minX - pad,
    y: minY - pad,
    w: maxX - minX + pad * 2,
    h: maxY - minY + pad * 2,
  };
};

export const rounded = (point: Point): Point => ({
  x: Math.round(point.x * 10) / 10,
  y: Math.round(point.y * 10) / 10,
});
