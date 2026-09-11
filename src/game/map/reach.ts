import {
  nodeById,
  type MapGraph,
  type MapNode,
  type NodeId,
  type NodeType,
} from "@/game/map/types";

export interface ReachStep {
  node: MapNode;
  rows: number;
}

const adjacency = (map: MapGraph): ReadonlyMap<NodeId, NodeId[]> => {
  const out = new Map<NodeId, NodeId[]>();
  for (const [from, to] of map.edges) {
    const list = out.get(from);
    if (list === undefined) out.set(from, [to]);
    else list.push(to);
  }
  return out;
};

export const forwardReach = (
  map: MapGraph,
  from: NodeId,
  visited: readonly NodeId[] = [],
): ReadonlyMap<NodeId, number> => {
  const byId = nodeById(map);
  if (byId.get(from) === undefined) return new Map();
  const cleared = new Set(visited);
  const links = adjacency(map);
  const depth = new Map<NodeId, number>([[from, 0]]);
  const queue: NodeId[] = [from];
  for (let head = 0; head < queue.length; head += 1) {
    const id = queue[head];
    if (id === undefined) continue;
    const rows = depth.get(id) ?? 0;
    for (const next of links.get(id) ?? []) {
      if (depth.has(next)) continue;
      if (cleared.has(next)) continue;
      if (byId.get(next)?.hole === true) continue;
      depth.set(next, rows + 1);
      queue.push(next);
    }
  }
  return depth;
};

export const STATION_TYPES: readonly NodeType[] = [
  "shop",
  "shipyard",
  "beacon",
];

export const isStationNode = (node: MapNode): boolean =>
  STATION_TYPES.includes(node.type);

export const forwardStations = (
  map: MapGraph,
  from: NodeId,
  visited: readonly NodeId[] = [],
): readonly ReachStep[] => {
  const reach = forwardReach(map, from, visited);
  const byId = nodeById(map);
  const out: ReachStep[] = [];
  for (const [id, rows] of reach) {
    if (rows < 1) continue;
    const node = byId.get(id);
    if (node === undefined) continue;
    if (!isStationNode(node)) continue;
    if (node.row === map.shape.bossRow) continue;
    out.push({ node, rows });
  }
  return out.sort(
    (a, b) =>
      a.rows - b.rows ||
      (a.node.id < b.node.id ? -1 : a.node.id > b.node.id ? 1 : 0),
  );
};
