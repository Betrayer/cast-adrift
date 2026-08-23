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

export interface MapGraph {
  nodes: MapNode[];
  edges: [NodeId, NodeId][];
  shape: MapShape;
  edgeMarks: Record<string, EdgeMark>;
  wormholes: Record<string, WormholeEdge>;
  bossReach: NodeId[];
}

export const START_ROW = 0;
export const START_LANE = 1;

export const DEFAULT_SHAPE: MapShape = {
  bossRow: 15,
  gateRow: 8,
  lanes: 4,
};

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
