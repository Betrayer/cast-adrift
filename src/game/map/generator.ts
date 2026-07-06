import type { RngStream } from "@/services/rng";
import {
  BOSS_ROW,
  GATE_ROW,
  LANE_COUNT,
  nodeId,
  ROW_COUNT,
  START_ROW,
  type MapGraph,
  type MapNode,
  type NodeId,
  type NodeType,
} from "@/game/map/types";

export const START_LANE = 1;
export const BOSS_LANE = 1;
const WALKER_COUNT = 6;
const MAX_TYPE_ATTEMPTS = 40;

const clampLane = (lane: number): number =>
  Math.max(0, Math.min(LANE_COUNT - 1, lane));

interface Skeleton {
  nodes: Map<NodeId, MapNode>;
  edges: [NodeId, NodeId][];
  startId: NodeId;
  bossId: NodeId;
}

const buildSkeleton = (rng: RngStream): Skeleton => {
  const nodes = new Map<NodeId, MapNode>();
  const edgeKeys = new Set<string>();
  const edges: [NodeId, NodeId][] = [];

  const ensure = (row: number, lane: number, type: NodeType): NodeId => {
    const id = nodeId(row, lane);
    if (!nodes.has(id)) nodes.set(id, { id, row, lane, type });
    return id;
  };

  const link = (from: NodeId, to: NodeId): void => {
    const key = `${from}->${to}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edges.push([from, to]);
  };

  const startId = ensure(START_ROW, START_LANE, "start");

  const gateCount = rng.int(1, 2);
  const gateLanes = rng
    .shuffle([0, 1, 2, 3])
    .slice(0, gateCount)
    .sort((a, b) => a - b);

  const nearestGateLane = (lane: number): number => {
    let best = gateLanes[0] ?? START_LANE;
    let bestDist = Math.abs(lane - best);
    for (const gl of gateLanes) {
      const dist = Math.abs(lane - gl);
      if (dist < bestDist) {
        best = gl;
        bestDist = dist;
      }
    }
    return best;
  };

  const walkers = Array.from({ length: WALKER_COUNT }, () => ({
    lane: rng.int(0, LANE_COUNT - 1),
    cell: startId,
  }));

  for (let row = 1; row <= BOSS_ROW; row += 1) {
    for (const walker of walkers) {
      let lane: number;
      let type: NodeType;
      if (row === BOSS_ROW) {
        lane = BOSS_LANE;
        type = "boss";
      } else if (row === GATE_ROW) {
        lane = nearestGateLane(walker.lane);
        type = "miniboss";
      } else {
        lane = clampLane(walker.lane + rng.pick([-1, 0, 1]));
        type = "battle";
      }
      const cell = ensure(row, lane, type);
      link(walker.cell, cell);
      walker.lane = lane;
      walker.cell = cell;
    }
  }

  return {
    nodes,
    edges,
    startId,
    bossId: nodeId(BOSS_ROW, BOSS_LANE),
  };
};

interface TypeSlot {
  type: NodeType;
  minRow: number;
  maxRow: number;
}

const buildQuota = (rng: RngStream): TypeSlot[] => {
  const eliteCount = rng.int(2, 3);
  const eventCount = rng.int(4, 5);
  const slots: TypeSlot[] = [];
  const push = (type: NodeType, count: number, minRow: number, maxRow: number) => {
    for (let i = 0; i < count; i += 1) slots.push({ type, minRow, maxRow });
  };
  push("beacon", 1, 5, 11);
  // One shipyard per half within DESIGN §9.1's rows 4-13 (rest cadence, not metric-tuned).
  push("shipyard", 1, 4, 8);
  push("shipyard", 1, 8, 13);
  push("elite", eliteCount, 3, 14);
  push("anomaly", 2, 1, 14);
  push("shop", 2, 1, 14);
  push("event", eventCount, 1, 14);
  return slots;
};

const buildAdjacency = (
  edges: readonly [NodeId, NodeId][],
): Map<NodeId, Set<NodeId>> => {
  const adj = new Map<NodeId, Set<NodeId>>();
  const add = (a: NodeId, b: NodeId): void => {
    const set = adj.get(a) ?? new Set<NodeId>();
    set.add(b);
    adj.set(a, set);
  };
  for (const [a, b] of edges) {
    add(a, b);
    add(b, a);
  }
  return adj;
};

const tryAssignTypes = (
  skeleton: Skeleton,
  rng: RngStream,
): Map<NodeId, NodeType> | null => {
  const assigned = new Map<NodeId, NodeType>();
  const adj = buildAdjacency(skeleton.edges);
  const candidates = [...skeleton.nodes.values()].filter(
    (node) => node.type === "battle",
  );
  const slots = buildQuota(rng);

  const conflicts = (node: MapNode, type: NodeType): boolean => {
    const neighbors = adj.get(node.id);
    if (neighbors === undefined) return false;
    for (const neighborId of neighbors) {
      if (assigned.get(neighborId) === type) return true;
    }
    return false;
  };

  for (const slot of slots) {
    const pool = rng
      .shuffle(candidates)
      .filter(
        (node) =>
          !assigned.has(node.id) &&
          node.row >= slot.minRow &&
          node.row <= slot.maxRow &&
          !conflicts(node, slot.type),
      );
    const chosen = pool[0];
    if (chosen === undefined) return null;
    assigned.set(chosen.id, slot.type);
  }

  return assigned;
};

export const generateSectorMap = (rng: RngStream, sector = 1): MapGraph => {
  void sector;
  const skeleton = buildSkeleton(rng);

  let assignment: Map<NodeId, NodeType> | null = null;
  for (let attempt = 0; attempt < MAX_TYPE_ATTEMPTS; attempt += 1) {
    assignment = tryAssignTypes(skeleton, rng);
    if (assignment !== null) break;
  }

  const nodes: MapNode[] = [...skeleton.nodes.values()]
    .map((node) => {
      const type = assignment?.get(node.id);
      return type === undefined ? node : { ...node, type };
    })
    .sort((a, b) => a.row - b.row || a.lane - b.lane);

  return { nodes, edges: skeleton.edges };
};

export const START_NODE_ID = nodeId(START_ROW, START_LANE);
export const BOSS_NODE_ID = nodeId(BOSS_ROW, BOSS_LANE);
export const MAP_ROW_COUNT = ROW_COUNT;
