import { sectorDef, type SectorMotif, type SectorShape } from "@/data/sectors";
import type { RngStream } from "@/services/rng";
import {
  bossLaneFor,
  edgeKey,
  nodeId,
  pocketLaneFor,
  START_LANE,
  START_NODE_ID,
  START_ROW,
  type EdgeMark,
  type MapGraph,
  type MapNode,
  type MapShape,
  type NodeId,
  type NodeType,
} from "@/game/map/types";

export { START_LANE, START_NODE_ID };

const WALKER_COUNT = 6;
const MAX_TYPE_ATTEMPTS = 40;
const FIRST_ELITE_ROW = 3;
const FIRST_REST_ROW = 4;
const BEACON_START_FRACTION = 0.33;
const BEACON_END_FRACTION = 0.73;

export interface MapGenOptions {
  // Drift never ends: the last row becomes a second mini-boss gate, and
  // clearing it hands the run to the next sector instead of the finale.
  bossAsGate?: boolean;
  noShops?: boolean;
}

interface Skeleton {
  nodes: Map<NodeId, MapNode>;
  edges: [NodeId, NodeId][];
  startId: NodeId;
  bossId: NodeId;
}

export const shapeOf = (sector: number): SectorShape => sectorDef(sector).shape;

export const mapShapeOf = (sector: number): MapShape => {
  const shape = shapeOf(sector);
  return {
    bossRow: shape.bossRow,
    gateRow: shape.gateRow,
    lanes: shape.lanes,
  };
};

const motifOf = <K extends SectorMotif["m"]>(
  shape: SectorShape,
  kind: K,
): Extract<SectorMotif, { m: K }> | undefined =>
  shape.motifs.find((motif): motif is Extract<SectorMotif, { m: K }> =>
    motif.m === kind,
  );

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
  const split = motifOf(shape, "riftSplit");
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

export const buildQuota = (
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
  // «Глушь» keeps the shipyards — a run with no repairs at all is unwinnable —
  // and takes the markets instead.
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
    (node) => node.type === "battle",
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

const applyCache = (
  nodes: MapNode[],
  rng: RngStream,
  motif: Extract<SectorMotif, { m: "cache" }>,
): void => {
  const pool = rng
    .shuffle(nodes.filter((node) => node.type === "battle" && node.row > 1))
    .slice(0, motif.count);
  for (const node of pool) node.cache = true;
};

const PROCESSION_PERIOD = 2;

const applyProcession = (
  nodes: MapNode[],
  rng: RngStream,
  shape: SectorShape,
): void => {
  const offset = rng.int(0, shape.lanes - 1);
  const phase = rng.int(0, PROCESSION_PERIOD - 1);
  for (const node of nodes) {
    if (node.row === START_ROW || node.row === shape.bossRow) continue;
    if (node.row === shape.gateRow) continue;
    if (node.row % PROCESSION_PERIOD !== phase) continue;
    if (node.lane === (node.row + offset) % shape.lanes) {
      node.blessing = "blessed";
    } else if (node.lane === (node.row + offset + 2) % shape.lanes) {
      node.blessing = "cursed";
    }
  }
};

const COLLAPSIBLE: readonly NodeType[] = ["event", "anomaly"];

const applyCollapse = (
  nodes: MapNode[],
  rng: RngStream,
  shape: SectorShape,
  motif: Extract<SectorMotif, { m: "collapse" }>,
): void => {
  const rows = rng
    .shuffle(
      Array.from({ length: shape.bossRow - 3 }, (_, i) => i + 2).filter(
        (row) => row !== shape.gateRow,
      ),
    )
    .slice(0, motif.rows);
  for (const node of nodes) {
    if (rows.includes(node.row)) node.unstable = true;
  }
  const remaining = new Map<NodeType, number>();
  for (const node of nodes) {
    remaining.set(node.type, (remaining.get(node.type) ?? 0) + 1);
  }
  let budget = motif.rows;
  for (const node of rng.shuffle(nodes)) {
    if (budget <= 0) break;
    if (node.unstable !== true) continue;
    if (!COLLAPSIBLE.includes(node.type)) continue;
    if ((remaining.get(node.type) ?? 0) <= 1) continue;
    if (rng.next() >= motif.chance) continue;
    remaining.set(node.type, (remaining.get(node.type) ?? 1) - 1);
    node.type = "battle";
    budget -= 1;
  }
};

const applyMineEdges = (
  edges: readonly [NodeId, NodeId][],
  byId: ReadonlyMap<NodeId, MapNode>,
  rng: RngStream,
  motif: Extract<SectorMotif, { m: "mineEdges" }>,
  shape: SectorShape,
): Record<string, EdgeMark> => {
  const marks: Record<string, EdgeMark> = {};
  const freeExits = new Map<NodeId, number>();
  for (const [from] of edges) {
    freeExits.set(from, (freeExits.get(from) ?? 0) + 1);
  }
  const crossing = edges.filter(([a, b]) => {
    const na = byId.get(a);
    const nb = byId.get(b);
    return (
      na !== undefined &&
      nb !== undefined &&
      na.lane !== nb.lane &&
      nb.row !== shape.gateRow &&
      nb.row !== shape.bossRow
    );
  });
  let placed = 0;
  for (const [a, b] of rng.shuffle(crossing)) {
    if (placed >= motif.count) break;
    if ((freeExits.get(a) ?? 0) <= 1) continue;
    marks[edgeKey(a, b)] = "mine";
    freeExits.set(a, (freeExits.get(a) ?? 1) - 1);
    placed += 1;
  }
  return marks;
};

const MAX_ANOMALY_TIER = 5;

const pocketTierWindow = (
  window: readonly [number, number],
): readonly [number, number] => [
  Math.min(MAX_ANOMALY_TIER, window[0] + 1),
  Math.min(MAX_ANOMALY_TIER, window[1] + 1),
];

const POCKET_DEPTH = 2;
const POCKET_SPAN = POCKET_DEPTH + 1;

interface PocketBuild {
  nodes: MapNode[];
  edges: [NodeId, NodeId][];
  marks: Record<string, EdgeMark>;
}

const buildPockets = (
  nodes: readonly MapNode[],
  rng: RngStream,
  shape: SectorShape,
  options: MapGenOptions,
): PocketBuild => {
  const build: PocketBuild = { nodes: [], edges: [], marks: {} };
  const lane = shape.lanes;
  const count = rng.int(shape.pockets[0], shape.pockets[1]);
  const split = motifOf(shape, "riftSplit");
  const table = shape.pocketTable.filter(
    ([type]) => options.noShops !== true || type !== "shop",
  );
  const byRow = new Map<number, MapNode[]>();
  for (const node of nodes) {
    byRow.set(node.row, [...(byRow.get(node.row) ?? []), node]);
  }
  const usable = (row: number): boolean =>
    row >= 1 &&
    row + POCKET_SPAN <= shape.bossRow - 1 &&
    !(row < shape.gateRow && row + POCKET_SPAN >= shape.gateRow) &&
    (split === undefined || row + POCKET_SPAN < split.from || row > split.to);
  const taken: number[] = [];
  const rows = rng
    .shuffle(Array.from({ length: shape.bossRow }, (_, i) => i))
    .filter(usable);

  for (const row of rows) {
    if (build.nodes.length >= count * POCKET_DEPTH) break;
    if (taken.some((r) => Math.abs(r - row) < POCKET_SPAN)) continue;
    const entry = rng.shuffle(byRow.get(row) ?? [])[0];
    const rejoin = rng.shuffle(byRow.get(row + POCKET_SPAN) ?? [])[0];
    if (entry === undefined || rejoin === undefined) continue;
    taken.push(row);
    const fight: MapNode = {
      id: nodeId(row + 1, lane),
      row: row + 1,
      lane,
      type: "battle",
      pocket: true,
    };
    const rewardType = rng.weighted(table);
    const reward: MapNode = {
      id: nodeId(row + 2, lane),
      row: row + 2,
      lane,
      type: rewardType,
      pocket: true,
      ...(rewardType === "anomaly"
        ? { tierWindow: pocketTierWindow(shape.anomalyTiers) }
        : {}),
    };
    build.nodes.push(fight, reward);
    build.edges.push(
      [entry.id, fight.id],
      [fight.id, reward.id],
      [reward.id, rejoin.id],
    );
    build.marks[edgeKey(entry.id, fight.id)] = "pocket";
  }
  return build;
};

const applyMotifs = (
  nodes: MapNode[],
  edges: readonly [NodeId, NodeId][],
  rng: RngStream,
  shape: SectorShape,
): Record<string, EdgeMark> => {
  let marks: Record<string, EdgeMark> = {};
  const byId = new Map(nodes.map((node) => [node.id, node]));
  for (const motif of shape.motifs) {
    switch (motif.m) {
      case "cache":
        applyCache(nodes, rng, motif);
        break;
      case "procession":
        applyProcession(nodes, rng, shape);
        break;
      case "collapse":
        applyCollapse(nodes, rng, shape, motif);
        break;
      case "mineEdges":
        marks = {
          ...marks,
          ...applyMineEdges(edges, byId, rng, motif, shape),
        };
        break;
      case "riftSplit":
        break;
    }
  }
  return marks;
};

export const generateSectorMap = (
  rng: RngStream,
  sector = 1,
  options: MapGenOptions = {},
): MapGraph => {
  const shape = shapeOf(sector);
  const skeleton = buildSkeleton(rng, shape, options);

  let assignment: Map<NodeId, NodeType> | null = null;
  for (let attempt = 0; attempt < MAX_TYPE_ATTEMPTS; attempt += 1) {
    assignment = tryAssignTypes(skeleton, rng, shape, options);
    if (assignment !== null) break;
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

  const edgeMarks = applyMotifs(nodes, skeleton.edges, rng, shape);
  const pockets = buildPockets(nodes, rng, shape, options);

  return {
    nodes: [...nodes, ...pockets.nodes].sort(
      (a, b) => a.row - b.row || a.lane - b.lane,
    ),
    edges: [...skeleton.edges, ...pockets.edges],
    shape: mapShapeOf(sector),
    edgeMarks: { ...edgeMarks, ...pockets.marks },
  };
};

export const bossNodeIdFor = (sector: number): NodeId =>
  nodeId(shapeOf(sector).bossRow, bossLaneFor(mapShapeOf(sector)));

export const pocketLaneOf = (sector: number): number =>
  pocketLaneFor(mapShapeOf(sector));
