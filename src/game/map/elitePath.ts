import {
  bossLaneFor,
  nodeId,
  START_NODE_ID,
  type MapGraph,
  type MapNode,
  type NodeId,
  type WormholeEdge,
} from "@/game/map/types";

export const bypassEdgesOf = (
  wormholes: Readonly<Record<string, WormholeEdge>>,
): [NodeId, NodeId][] =>
  Object.values(wormholes).map((record): [NodeId, NodeId] => [record.from, record.bypass]);

export const mostElitesOnAPath = (
  nodes: readonly MapNode[],
  edges: readonly (readonly [NodeId, NodeId])[],
  startId: NodeId,
  bossId: NodeId,
): number => {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const next = new Map<NodeId, NodeId[]>();
  for (const [from, to] of edges) next.set(from, [...(next.get(from) ?? []), to]);
  const best = new Map<NodeId, number>([[startId, 0]]);
  const order = nodes
    .filter((node) => node.hole !== true)
    .sort((a, b) => a.row - b.row);
  for (const node of order) {
    const here = best.get(node.id);
    if (here === undefined) continue;
    for (const id of next.get(node.id) ?? []) {
      const target = byId.get(id);
      if (target === undefined || target.hole === true) continue;
      const score = here + (target.type === "elite" ? 1 : 0);
      if ((best.get(id) ?? -1) < score) best.set(id, score);
    }
  }
  return best.get(bossId) ?? 0;
};

export const mostElitesOnMap = (map: MapGraph): number =>
  mostElitesOnAPath(
    map.nodes,
    [...map.edges, ...bypassEdgesOf(map.wormholes)],
    START_NODE_ID,
    nodeId(map.shape.bossRow, bossLaneFor(map.shape)),
  );
