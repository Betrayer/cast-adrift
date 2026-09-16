import {
  areConnected,
  wormholeFor,
  type HoleSpot,
  type MapGraph,
  type MapNode,
  type NodeId,
} from "@/game/map/types";
import { bypassIsLateral, canBypass } from "@/game/map/wormhole";
import { holeTollFor, holeTollWaived } from "@/game/run/motifs";
import type { LocKey } from "@/types/content";
import type { MapGeometry } from "./mapGeometry";

export const SPOT_UNIT = 100;
export const SPOT_MIN_RADIUS = 30;

const SPOT_PAD = 12;
const SPOT_FIT = Math.SQRT2;

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
  return {
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    rx: Math.max(SPOT_MIN_RADIUS, ((maxX - minX) / 2) * SPOT_FIT + SPOT_PAD),
    ry: Math.max(SPOT_MIN_RADIUS, ((maxY - minY) / 2) * SPOT_FIT + SPOT_PAD),
  };
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
  const entries = spot.nodes.filter(
    (id) => wormholeFor(map, from, id) !== undefined,
  );
  const slip = entries.find((id) => bypassIsLateral(map, from, id, visited));
  return slip ?? entries[0] ?? null;
};

export interface BypassOffer {
  offered: boolean;
  waived: boolean;
  toll: number;
}

export const bypassOfferFor = (
  map: MapGraph,
  from: NodeId,
  hole: NodeId,
  visited: readonly NodeId[],
  sector: number,
  hull: number,
): BypassOffer => {
  const offered = canBypass(map, from, hole, visited);
  const waived = offered && holeTollWaived(map, from, hole, visited);
  return { offered, waived, toll: waived ? 0 : holeTollFor(sector, hull) };
};

export const adjacentBypassOffer = (
  map: MapGraph,
  from: NodeId,
  node: MapNode,
  visited: readonly NodeId[],
  sector: number,
  hull: number,
): BypassOffer | null =>
  node.hole !== true || !areConnected(map, from, node.id)
    ? null
    : bypassOfferFor(map, from, node.id, visited, sector, hull);

export const bypassCopyKey = (offer: BypassOffer): LocKey => {
  if (!offer.offered) return "run:hole.bypassNone";
  if (offer.waived) return "run:hole.bypassDrift";
  return offer.toll > 0 ? "run:hole.bypassCost" : "run:hole.bypassFree";
};
