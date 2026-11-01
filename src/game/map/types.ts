import type { LocKey } from "@/types/content";

export type NodeType =
  | "start"
  | "battle"
  | "elite"
  | "miniboss"
  | "shop"
  | "shipyard"
  | "event"
  | "anomaly"
  | "beacon"
  | "boss";

export type NodeId = string;

export type LaneBlessing = "blessed" | "cursed";

export type EdgeMark = "mine" | "pocket" | "wormhole";

export type SpotId = string;

export interface MapNode {
  id: NodeId;
  row: number;
  lane: number;
  type: NodeType;
  pocket?: true;
  cache?: true;
  unstable?: true;
  inverted?: true;
  storm?: true;
  hole?: true;
  spot?: SpotId;
  blessing?: LaneBlessing;
  tierWindow?: readonly [number, number];
}

export interface MapShape {
  bossRow: number;
  gateRow: number;
  lanes: number;
}

export interface WormholeEdge {
  from: NodeId;
  hole: NodeId;
  bypass: NodeId;
}

export interface HoleSpot {
  id: SpotId;
  nodes: readonly NodeId[];
  rows: readonly [number, number];
  lanes: readonly [number, number];
}

export interface MapGraph {
  nodes: MapNode[];
  edges: [NodeId, NodeId][];
  shape: MapShape;
  edgeMarks: Record<string, EdgeMark>;
  wormholes: Record<string, WormholeEdge>;
  spots: readonly HoleSpot[];
  bossReach: NodeId[];
}

export const START_ROW = 0;
export const START_LANE = 1;

export const nodeId = (row: number, lane: number): NodeId =>
  `r${String(row)}l${String(lane)}`;

export const edgeKey = (from: NodeId, to: NodeId): string => `${from}->${to}`;

export const START_NODE_ID = nodeId(START_ROW, START_LANE);

export const bossLaneFor = (shape: MapShape): number =>
  Math.min(START_LANE, shape.lanes - 1);

export const pocketLaneFor = (shape: MapShape): number => shape.lanes;

export const NODE_GLYPH: Record<NodeType, LocKey> = {
  start: "run:glyph.start",
  battle: "run:glyph.battle",
  elite: "run:glyph.elite",
  miniboss: "run:glyph.miniboss",
  shop: "run:glyph.shop",
  shipyard: "run:glyph.shipyard",
  event: "run:glyph.event",
  anomaly: "run:glyph.anomaly",
  beacon: "run:glyph.beacon",
  boss: "run:glyph.boss",
};

export const nodeById = (map: MapGraph): ReadonlyMap<NodeId, MapNode> =>
  new Map(map.nodes.map((node) => [node.id, node]));

export const outgoingEdges = (map: MapGraph, from: NodeId): NodeId[] =>
  map.edges.filter(([a]) => a === from).map(([, b]) => b);

export const areConnected = (
  map: MapGraph,
  from: NodeId,
  to: NodeId,
): boolean => map.edges.some(([a, b]) => a === from && b === to);

export const edgeMarkFor = (
  map: MapGraph,
  from: NodeId,
  to: NodeId,
): EdgeMark | undefined => map.edgeMarks[edgeKey(from, to)];

export const wormholeFor = (
  map: MapGraph,
  from: NodeId,
  to: NodeId,
): WormholeEdge | undefined => map.wormholes[edgeKey(from, to)];

export const spotOf = (
  map: MapGraph,
  id: NodeId,
): HoleSpot | undefined => map.spots.find((spot) => spot.nodes.includes(id));

export interface HoleBand {
  spot: HoleSpot;
  rows: readonly [number, number];
  rim: readonly NodeId[];
  farRim: readonly NodeId[];
}

const byLane = (a: MapNode, b: MapNode): number => a.lane - b.lane;

export const byLaneThenId = (a: MapNode, b: MapNode): number =>
  a.lane - b.lane || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

export const nearestInLane = (
  candidates: readonly MapNode[],
  lane: number,
): MapNode | undefined =>
  [...candidates].sort(
    (a, b) =>
      Math.abs(a.lane - lane) - Math.abs(b.lane - lane) || byLaneThenId(a, b),
  )[0];

const mainRowIds = (nodes: readonly MapNode[], row: number): NodeId[] =>
  nodes
    .filter((node) => node.pocket !== true && node.row === row)
    .sort(byLane)
    .map((node) => node.id);

export const bandBridges = (
  nodes: readonly MapNode[],
  rows: readonly [number, number] | null,
): [NodeId, NodeId][] => {
  if (rows === null) return [];
  const far = mainRowIds(nodes, rows[1] + 1);
  return mainRowIds(nodes, rows[0] - 1).flatMap((a) =>
    far.map((b): [NodeId, NodeId] => [a, b]),
  );
};

export const bandOf = (map: MapGraph): HoleBand | null => {
  for (const spot of map.spots) {
    const [lo, hi] = spot.rows;
    const inRows = map.nodes.filter(
      (node) => node.pocket !== true && node.row >= lo && node.row <= hi,
    );
    if (inRows.length === 0) continue;
    if (!inRows.every((node) => node.hole === true && node.spot === spot.id)) {
      continue;
    }
    return {
      spot,
      rows: [lo, hi],
      rim: mainRowIds(map.nodes, lo - 1),
      farRim: mainRowIds(map.nodes, hi + 1),
    };
  }
  return null;
};
