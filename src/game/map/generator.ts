import { sectorDef, type SectorMotif, type SectorShape } from "@/data/sectors";
import type { RngStream } from "@/services/rng";
import {
  bossLaneFor,
  edgeKey,
  nodeId,
  START_LANE,
  START_NODE_ID,
  START_ROW,
  type EdgeMark,
  type MapGraph,
  type MapNode,
  type MapShape,
  type NodeId,
  type NodeType,
  type WormholeEdge,
} from "@/game/map/types";

export { START_LANE, START_NODE_ID };

const WALKER_COUNT = 6;
const MAX_TYPE_ATTEMPTS = 40;
const FIRST_ELITE_ROW = 3;
const FIRST_REST_ROW = 4;
const BEACON_START_FRACTION = 0.33;
const BEACON_END_FRACTION = 0.73;
const HOLE_FIRST_ROW = 4;
const HOLE_GATE_MARGIN = 3;
const HOLE_ROW_GAP = 3;
const MAX_HOLE_ATTEMPTS = 20;

export interface MapGenOptions {
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

const causalityRows = (
  rng: RngStream,
  shape: SectorShape,
  count: number,
  taken: ReadonlySet<number>,
): number[] =>
  rng
    .shuffle(
      Array.from({ length: shape.bossRow - 2 }, (_, i) => i + 2).filter(
        (row) => row !== shape.gateRow && !taken.has(row),
      ),
    )
    .slice(0, count);

const markedRows = (
  nodes: readonly MapNode[],
  key: "inverted" | "storm",
): Set<number> => {
  const out = new Set<number>();
  for (const node of nodes) {
    if (node[key] === true) out.add(node.row);
  }
  return out;
};

const applyInversion = (
  nodes: MapNode[],
  rng: RngStream,
  shape: SectorShape,
  motif: Extract<SectorMotif, { m: "inversion" }>,
): void => {
  const rows = causalityRows(rng, shape, motif.rows, new Set());
  for (const node of nodes) {
    if (rows.includes(node.row)) node.inverted = true;
  }
};

const applyStorm = (
  nodes: MapNode[],
  rng: RngStream,
  shape: SectorShape,
  motif: Extract<SectorMotif, { m: "storm" }>,
): void => {
  const rows = causalityRows(
    rng,
    shape,
    motif.rows,
    markedRows(nodes, "inverted"),
  );
  for (const node of nodes) {
    if (rows.includes(node.row)) node.storm = true;
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
    if (node.hole === true) continue;
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

interface HoleBuild {
  marks: Record<string, EdgeMark>;
  wormholes: Record<string, WormholeEdge>;
  placed: number;
}

const linkTable = (
  edges: readonly [NodeId, NodeId][],
): { incoming: Map<NodeId, NodeId[]>; outgoing: Map<NodeId, NodeId[]> } => {
  const incoming = new Map<NodeId, NodeId[]>();
  const outgoing = new Map<NodeId, NodeId[]>();
  for (const [a, b] of edges) {
    outgoing.set(a, [...(outgoing.get(a) ?? []), b]);
    incoming.set(b, [...(incoming.get(b) ?? []), a]);
  }
  return { incoming, outgoing };
};

const applyBlackHoles = (
  nodes: MapNode[],
  edges: readonly [NodeId, NodeId][],
  rng: RngStream,
  motif: Extract<SectorMotif, { m: "blackHoles" }>,
  shape: SectorShape,
  marks: Readonly<Record<string, EdgeMark>>,
): HoleBuild => {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const { incoming, outgoing } = linkTable(edges);
  const build: HoleBuild = { marks: {}, wormholes: {}, placed: 0 };
  const holes = new Set<NodeId>();
  const lastRow = Math.min(shape.bossRow - 2, shape.gateRow + HOLE_GATE_MARGIN);
  const eligible = nodes.filter(
    (node) =>
      node.type === "battle" &&
      node.pocket !== true &&
      node.cache !== true &&
      node.row >= HOLE_FIRST_ROW &&
      node.row <= lastRow &&
      node.row !== shape.gateRow,
  );
  if (eligible.length === 0) return build;

  const openExits = (from: NodeId, without: NodeId): NodeId[] =>
    (outgoing.get(from) ?? []).filter(
      (to) =>
        to !== without &&
        !holes.has(to) &&
        marks[edgeKey(from, to)] === undefined,
    );

  const accepts = (node: MapNode): boolean => {
    if (holes.has(node.id)) return false;
    for (const id of holes) {
      const other = byId.get(id);
      if (other === undefined) continue;
      if (Math.abs(other.row - node.row) < HOLE_ROW_GAP) return false;
    }
    const ins = incoming.get(node.id) ?? [];
    if (ins.length === 0) return false;
    for (const from of ins) {
      if (openExits(from, node.id).length === 0) return false;
    }
    for (const to of outgoing.get(node.id) ?? []) {
      const feeds = (incoming.get(to) ?? []).filter(
        (from) => from !== node.id && !holes.has(from),
      );
      if (feeds.length === 0) return false;
    }
    return true;
  };

  for (let placed = 0; placed < motif.count; placed += 1) {
    let chosen: MapNode | undefined;
    for (
      let attempt = 0;
      attempt < MAX_HOLE_ATTEMPTS && chosen === undefined;
      attempt += 1
    ) {
      const candidate = rng.pick(eligible);
      if (accepts(candidate)) chosen = candidate;
    }
    if (chosen === undefined) break;
    holes.add(chosen.id);
    chosen.hole = true;
    build.placed += 1;
  }

  for (const id of holes) {
    for (const from of incoming.get(id) ?? []) {
      const alternates = openExits(from, id);
      if (alternates.length === 0) continue;
      build.marks[edgeKey(from, id)] = "wormhole";
      build.wormholes[edgeKey(from, id)] = {
        from,
        hole: id,
        bypass: rng.pick(alternates),
      };
    }
  }
  return build;
};

export const bossReachOf = (
  nodes: readonly MapNode[],
  edges: readonly [NodeId, NodeId][],
  bossId: NodeId,
): NodeId[] => {
  const holes = new Set(
    nodes.filter((node) => node.hole === true).map((node) => node.id),
  );
  const back = new Map<NodeId, NodeId[]>();
  for (const [a, b] of edges) {
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

interface MotifBuild {
  marks: Record<string, EdgeMark>;
  wormholes: Record<string, WormholeEdge>;
  holesPlaced: number;
  holesWanted: number;
}

const applyMotifs = (
  nodes: MapNode[],
  edges: readonly [NodeId, NodeId][],
  rng: RngStream,
  shape: SectorShape,
): MotifBuild => {
  const build: MotifBuild = {
    marks: {},
    wormholes: {},
    holesPlaced: 0,
    holesWanted: 0,
  };
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
        build.marks = {
          ...build.marks,
          ...applyMineEdges(edges, byId, rng, motif, shape),
        };
        break;
      case "inversion":
        applyInversion(nodes, rng, shape, motif);
        break;
      case "storm":
        applyStorm(nodes, rng, shape, motif);
        break;
      case "blackHoles": {
        const holes = applyBlackHoles(
          nodes,
          edges,
          rng,
          motif,
          shape,
          build.marks,
        );
        build.marks = { ...build.marks, ...holes.marks };
        build.wormholes = { ...build.wormholes, ...holes.wormholes };
        build.holesPlaced += holes.placed;
        build.holesWanted += motif.count;
        break;
      }
      case "riftSplit":
        break;
    }
  }
  return build;
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

  const motifs = applyMotifs(nodes, skeleton.edges, rng, shape);
  const pockets = buildPockets(nodes, rng, shape, options);

  const allNodes = [...nodes, ...pockets.nodes].sort(
    (a, b) => a.row - b.row || a.lane - b.lane,
  );
  const allEdges = [...skeleton.edges, ...pockets.edges];

  return {
    nodes: allNodes,
    edges: allEdges,
    shape: mapShapeOf(sector),
    edgeMarks: { ...motifs.marks, ...pockets.marks },
    wormholes: motifs.wormholes,
    bossReach: bossReachOf(allNodes, allEdges, skeleton.bossId),
  };
};

export const bossNodeIdFor = (sector: number): NodeId =>
  nodeId(shapeOf(sector).bossRow, bossLaneFor(mapShapeOf(sector)));
