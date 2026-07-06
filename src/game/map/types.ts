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

export const SPECIAL_NODE_TYPES: readonly NodeType[] = [
  "shipyard",
  "shop",
  "elite",
  "event",
  "anomaly",
  "beacon",
];

export type NodeId = string;

export interface MapNode {
  id: NodeId;
  row: number;
  lane: number;
  type: NodeType;
}

export interface MapGraph {
  nodes: MapNode[];
  edges: [NodeId, NodeId][];
}

export const START_ROW = 0;
export const GATE_ROW = 8;
export const BOSS_ROW = 15;
export const ROW_COUNT = 16;
export const LANE_COUNT = 4;

export const nodeId = (row: number, lane: number): NodeId =>
  `r${String(row)}l${String(lane)}`;

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

export const incomingEdges = (map: MapGraph, to: NodeId): NodeId[] =>
  map.edges.filter(([, b]) => b === to).map(([a]) => a);

export const areConnected = (
  map: MapGraph,
  from: NodeId,
  to: NodeId,
): boolean => map.edges.some(([a, b]) => a === from && b === to);
