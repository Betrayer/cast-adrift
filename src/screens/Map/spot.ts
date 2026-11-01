import {
  areConnected,
  nodeById,
  wormholeFor,
  type HoleSpot,
  type MapGraph,
  type MapNode,
  type NodeId,
} from "@/game/map/types";
import { canBypass } from "@/game/map/wormhole";
import { bypassLethal, bypassPctFor, holeTollFor } from "@/game/run/motifs";
import type { LocKey } from "@/types/content";
import { ROW_GAP, SIDE_MARGIN, type MapGeometry } from "./mapGeometry";

export const SPOT_UNIT = 100;
export const SPOT_MIN_RADIUS = 30;

const SPOT_PAD = 12;
const SPOT_FIT = Math.SQRT2;
const SPOT_EDGE = 2;

export interface SpotEllipse {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export const spotEllipse = (
  geo: MapGeometry,
  nodes: readonly MapNode[],
): SpotEllipse | null => {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const node of nodes) {
    const radius = geo.radius(node);
    const x = geo.nodeX(node);
    const y = geo.nodeY(node);
    minX = Math.min(minX, x - radius);
    maxX = Math.max(maxX, x + radius);
    minY = Math.min(minY, y - radius);
    maxY = Math.max(maxY, y + radius);
  }
  if (minX > maxX) return null;
  const cx = (minX + maxX) / 2;
  const room = Math.max(SPOT_MIN_RADIUS, Math.min(cx, geo.viewW - cx) - SPOT_EDGE);
  return {
    cx,
    cy: (minY + maxY) / 2,
    rx: Math.min(
      room,
      Math.max(SPOT_MIN_RADIUS, ((maxX - minX) / 2) * SPOT_FIT + SPOT_PAD),
    ),
    ry: Math.max(SPOT_MIN_RADIUS, ((maxY - minY) / 2) * SPOT_FIT + SPOT_PAD),
  };
};

export interface SpotHorizon {
  side: "near" | "far";
  x1: number;
  x2: number;
  y: number;
}

export const bandHorizons = (
  geo: MapGeometry,
  spot: HoleSpot,
  lanes: number,
  topVisibleRow: number,
): SpotHorizon[] => {
  if (spot.lanes[0] !== 0 || spot.lanes[1] !== lanes - 1) return [];
  const x1 = geo.laneX(0) - SIDE_MARGIN / 2;
  const x2 = geo.laneX(lanes - 1) + SIDE_MARGIN / 2;
  const near: SpotHorizon = {
    side: "near",
    x1,
    x2,
    y: geo.rowY(spot.rows[0]) + ROW_GAP / 2,
  };
  if (topVisibleRow < spot.rows[1]) return [near];
  return [near, { side: "far", x1, x2, y: geo.rowY(spot.rows[1]) - ROW_GAP / 2 }];
};

export const sharesSpot = (a: MapNode, b: MapNode): boolean =>
  a.spot !== undefined && a.spot === b.spot;

export const isDrawableEdge = (
  a: MapNode,
  b: MapNode,
  visible: ReadonlySet<NodeId>,
): boolean => visible.has(a.id) && visible.has(b.id) && !sharesSpot(a, b);

export const spotMembers = (
  spot: HoleSpot,
  byId: ReadonlyMap<NodeId, MapNode>,
  visible: ReadonlySet<NodeId>,
): MapNode[] =>
  spot.nodes
    .map((id) => byId.get(id))
    .filter((node): node is MapNode => node !== undefined && visible.has(node.id));

export const spotEntryFor = (
  map: MapGraph,
  from: NodeId,
  spot: HoleSpot,
  visited: readonly NodeId[],
): NodeId | null => {
  const byId = nodeById(map);
  const lane = byId.get(from)?.lane ?? 0;
  const laneOf = (id: NodeId): number => byId.get(id)?.lane ?? 0;
  const entries = spot.nodes
    .filter((id) => wormholeFor(map, from, id) !== undefined && !visited.includes(id))
    .sort(
      (a, b) =>
        Math.abs(laneOf(a) - lane) - Math.abs(laneOf(b) - lane) ||
        (a < b ? -1 : a > b ? 1 : 0),
    );
  return entries[0] ?? null;
};

export interface BypassOffer {
  offered: boolean;
  lethal: boolean;
  toll: number;
  pct: number;
}

export const bypassOfferFor = (
  map: MapGraph,
  from: NodeId,
  hole: NodeId,
  visited: readonly NodeId[],
  sector: number,
  hull: number,
  hullMax: number = hull,
): BypassOffer => {
  const offered = canBypass(map, from, hole, visited);
  const toll = holeTollFor(sector, hullMax);
  return {
    offered,
    lethal: offered && bypassLethal(hull, toll),
    toll,
    pct: Math.round(bypassPctFor(sector) * 100),
  };
};

export const adjacentBypassOffer = (
  map: MapGraph,
  from: NodeId,
  node: MapNode,
  visited: readonly NodeId[],
  sector: number,
  hull: number,
  hullMax: number = hull,
): BypassOffer | null =>
  node.hole !== true || !areConnected(map, from, node.id)
    ? null
    : bypassOfferFor(map, from, node.id, visited, sector, hull, hullMax);

export type BypassState = "none" | "lethal" | "cost";

export const bypassState = (offer: BypassOffer): BypassState =>
  !offer.offered ? "none" : offer.lethal ? "lethal" : "cost";

const BYPASS_COPY: Record<BypassState, LocKey> = {
  none: "run:hole.bypassNone",
  lethal: "run:hole.bypassLethal",
  cost: "run:hole.bypassCost",
};

export const bypassCopyKey = (offer: BypassOffer): LocKey =>
  BYPASS_COPY[bypassState(offer)];

export const bypassCopyVars = (offer: BypassOffer): { n: number; pct: number } => ({
  n: offer.toll,
  pct: offer.pct,
});

export const bypassTollMark = (offer: BypassOffer): string =>
  String(offer.offered ? offer.toll : -1);
