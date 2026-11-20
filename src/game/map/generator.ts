import { motifIn, sectorDef, type SectorShape } from "@/data/sectors";
import type { RngStream } from "@/services/rng";
import { bypassEdgesOf, mostElitesOnAPath } from "@/game/map/elitePath";
import {
  bandRowSet,
  carveBand,
  emptyHoleBuild,
  type HoleBuild,
} from "@/game/map/holeBand";
import { applyMotifs } from "@/game/map/motifStamps";
import { buildPockets } from "@/game/map/pockets";
import {
  bandBridges,
  bossLaneFor,
  edgeKey,
  nodeId,
  START_LANE,
  START_NODE_ID,
  START_ROW,
  type MapGraph,
  type MapNode,
  type MapShape,
  type NodeId,
  type NodeType,
} from "@/game/map/types";

export { START_NODE_ID };

const WALKER_COUNT = 6;
const MAX_TYPE_ATTEMPTS = 40;
const FIRST_ELITE_ROW = 3;
const FIRST_REST_ROW = 4;
const BEACON_START_FRACTION = 0.33;
const BEACON_END_FRACTION = 0.73;

export interface MapGenOptions {
  bossAsGate?: boolean;
  noShops?: boolean;
  eliteLine?: number;
}

interface Skeleton {
  nodes: Map<NodeId, MapNode>;
  edges: [NodeId, NodeId][];
  startId: NodeId;
  bossId: NodeId;
}

const shapeOf = (sector: number): SectorShape => sectorDef(sector).shape;

export const mapShapeOf = (sector: number): MapShape => {
  const shape = shapeOf(sector);
  return {
    bossRow: shape.bossRow,
    gateRow: shape.gateRow,
    lanes: shape.lanes,
  };
};

const splitSideOf = (lane: number, lanes: number): 0 | 1 =>
  lane < Math.floor(lanes / 2) ? 0 : 1;

const sideRange = (side: 0 | 1, lanes: number): [number, number] => {
  const mid = Math.floor(lanes / 2);
  return side === 0 ? [0, mid - 1] : [mid, lanes - 1];
};

const buildSkeleton = (
  rng: RngStream,
  shape: SectorShape,
  options: MapGenOptions,
): Skeleton => {
  const nodes = new Map<NodeId, MapNode>();
  const edgeKeys = new Set<string>();
  const edges: [NodeId, NodeId][] = [];
  const split = motifIn(shape, "riftSplit");
  const bossLane = bossLaneFor(shape);

  const ensure = (row: number, lane: number, type: NodeType): NodeId => {
    const id = nodeId(row, lane);
    if (!nodes.has(id)) nodes.set(id, { id, row, lane, type });
    return id;
  };

  const link = (from: NodeId, to: NodeId): void => {
    const key = edgeKey(from, to);
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edges.push([from, to]);
  };

  const startId = ensure(START_ROW, START_LANE, "start");

  const gateCount = rng.int(1, 2);
  const gateLanes = rng
    .shuffle(Array.from({ length: shape.lanes }, (_, i) => i))
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
    lane: rng.int(0, shape.lanes - 1),
    cell: startId,
  }));

  const laneBounds = (row: number, lane: number): [number, number] => {
    if (split === undefined || row < split.from || row > split.to) {
      return [0, shape.lanes - 1];
    }
    return sideRange(splitSideOf(lane, shape.lanes), shape.lanes);
  };

  for (let row = 1; row <= shape.bossRow; row += 1) {
    for (const walker of walkers) {
      let lane: number;
      let type: NodeType;
      if (row === shape.bossRow) {
        lane = bossLane;
        type = options.bossAsGate === true ? "miniboss" : "boss";
      } else if (row === shape.gateRow) {
        lane = nearestGateLane(walker.lane);
        type = "miniboss";
      } else {
        const drift = rng.next() < shape.branchiness ? rng.pick([-1, 1]) : 0;
        const [lo, hi] = laneBounds(row, walker.lane);
        lane = Math.max(lo, Math.min(hi, walker.lane + drift));
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
    bossId: nodeId(shape.bossRow, bossLane),
  };
};

interface TypeSlot {
  type: NodeType;
  minRow: number;
  maxRow: number;
}

const buildQuota = (
  rng: RngStream,
  shape: SectorShape,
  options: MapGenOptions,
): TypeSlot[] => {
  const quotas = shape.quotas;
  const last = shape.bossRow - 1;
  const slots: TypeSlot[] = [];
  const push = (
    type: NodeType,
    count: number,
    minRow: number,
    maxRow: number,
  ): void => {
    for (let i = 0; i < count; i += 1) slots.push({ type, minRow, maxRow });
  };
  push(
    "beacon",
    quotas.beacons,
    Math.round(shape.bossRow * BEACON_START_FRACTION),
    Math.round(shape.bossRow * BEACON_END_FRACTION),
  );
  const restSpan = Math.max(1, last - 1 - FIRST_REST_ROW);
  for (let i = 0; i < quotas.shipyards; i += 1) {
    const lo = FIRST_REST_ROW + Math.floor((restSpan * i) / quotas.shipyards);
    const hi =
      FIRST_REST_ROW +
      Math.floor((restSpan * (i + 1)) / quotas.shipyards);
    push("shipyard", 1, lo, Math.max(lo, hi));
  }
  push(
    "elite",
    rng.int(quotas.elites[0], quotas.elites[1]),
    FIRST_ELITE_ROW,
    last,
  );
  push("anomaly", quotas.anomalies, 1, last);
  if (options.noShops !== true) push("shop", quotas.shops, 1, last);
  push("event", rng.int(quotas.events[0], quotas.events[1]), 1, last);
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
  shape: SectorShape,
  options: MapGenOptions,
): Map<NodeId, NodeType> | null => {
  const assigned = new Map<NodeId, NodeType>();
  const adj = buildAdjacency(skeleton.edges);
  const candidates = [...skeleton.nodes.values()].filter(
    (node) => node.type === "battle" && node.hole !== true,
  );
  const slots = buildQuota(rng, shape, options);

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

export const bossReachOf = (
  nodes: readonly MapNode[],
  edges: readonly [NodeId, NodeId][],
  bossId: NodeId,
  bridges: readonly [NodeId, NodeId][] = [],
): NodeId[] => {
  const holes = new Set(
    nodes.filter((node) => node.hole === true).map((node) => node.id),
  );
  const back = new Map<NodeId, NodeId[]>();
  for (const [a, b] of [...edges, ...bridges]) {
    if (holes.has(a) || holes.has(b)) continue;
    back.set(b, [...(back.get(b) ?? []), a]);
  }
  const seen = new Set<NodeId>([bossId]);
  const queue: NodeId[] = [bossId];
  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur === undefined) break;
    for (const prev of back.get(cur) ?? []) {
      if (seen.has(prev)) continue;
      seen.add(prev);
      queue.push(prev);
    }
  }
  return [...seen].sort();
};

const elitesOnBestPath = (
  skeleton: Skeleton,
  assignment: ReadonlyMap<NodeId, NodeType>,
  holes: HoleBuild,
): number => {
  const typed = [...skeleton.nodes.values()].map((node) => ({
    ...node,
    type: assignment.get(node.id) ?? node.type,
  }));
  return mostElitesOnAPath(
    typed,
    [...skeleton.edges, ...bypassEdgesOf(holes.wormholes)],
    skeleton.startId,
    skeleton.bossId,
  );
};

export const generateSectorMap = (
  rng: RngStream,
  sector = 1,
  options: MapGenOptions = {},
): MapGraph => {
  const shape = shapeOf(sector);
  const skeleton = buildSkeleton(rng, shape, options);
  const holeMotif = motifIn(shape, "blackHoles");
  const holes: HoleBuild =
    holeMotif === undefined
      ? emptyHoleBuild()
      : carveBand(
          [...skeleton.nodes.values()],
          skeleton.edges,
          rng,
          holeMotif,
          shape,
        );

  const line = options.eliteLine ?? 0;
  let assignment: Map<NodeId, NodeType> | null = null;
  let bestLine = -1;
  for (let attempt = 0; attempt < MAX_TYPE_ATTEMPTS; attempt += 1) {
    const drawn = tryAssignTypes(skeleton, rng, shape, options);
    if (drawn === null) continue;
    if (line <= 0) {
      assignment = drawn;
      break;
    }
    const reached = elitesOnBestPath(skeleton, drawn, holes);
    if (reached > bestLine) {
      assignment = drawn;
      bestLine = reached;
    }
    if (reached >= line) break;
  }

  const nodes: MapNode[] = [...skeleton.nodes.values()]
    .map((node) => {
      const type = assignment?.get(node.id);
      const withType = type === undefined ? { ...node } : { ...node, type };
      return withType.type === "anomaly"
        ? { ...withType, tierWindow: shape.anomalyTiers }
        : withType;
    })
    .sort((a, b) => a.row - b.row || a.lane - b.lane);

  const bandRows = bandRowSet(holes.rows);
  const marks = applyMotifs(nodes, skeleton.edges, rng, shape, bandRows);
  const pockets = buildPockets(
    nodes,
    rng,
    shape,
    options.noShops === true,
    holes.rows,
  );

  const allNodes = [...nodes, ...pockets.nodes].sort(
    (a, b) => a.row - b.row || a.lane - b.lane,
  );
  const allEdges = [...skeleton.edges, ...pockets.edges];

  return {
    nodes: allNodes,
    edges: allEdges,
    shape: mapShapeOf(sector),
    edgeMarks: { ...marks, ...holes.marks, ...pockets.marks },
    wormholes: holes.wormholes,
    spots: holes.spots,
    bossReach: bossReachOf(
      allNodes,
      allEdges,
      skeleton.bossId,
      bandBridges(allNodes, holes.rows),
    ),
  };
};

export const bossNodeIdFor = (sector: number): NodeId =>
  nodeId(shapeOf(sector).bossRow, bossLaneFor(mapShapeOf(sector)));
