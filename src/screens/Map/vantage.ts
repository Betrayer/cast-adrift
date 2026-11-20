import {
  areConnected,
  type MapGraph,
  type MapNode,
  type NodeId,
} from "@/game/map/types";
import { isDrawableEdge } from "./spot";

export interface MapVantage {
  map: MapGraph;
  position: NodeId;
  positionRow: number;
  visited: readonly NodeId[];
  visibleLimit: number;
  deliveryIds: ReadonlySet<NodeId>;
  ghostRows: number;
}

export type EdgePair = readonly [NodeId, NodeId];

export const isVisibleNode = (v: MapVantage, node: MapNode): boolean =>
  node.type === "boss" ||
  v.deliveryIds.has(node.id) ||
  v.visited.includes(node.id) ||
  node.row <= v.visibleLimit;

export const isLegalNode = (v: MapVantage, node: MapNode): boolean =>
  !v.visited.includes(node.id) &&
  node.row > v.positionRow &&
  isVisibleNode(v, node) &&
  areConnected(v.map, v.position, node.id);

export const isPreviewableNode = (v: MapVantage, node: MapNode): boolean => {
  if (isLegalNode(v, node)) return true;
  if (v.ghostRows <= 0) return false;
  if (v.visited.includes(node.id)) return false;
  if (node.row !== v.positionRow + 1 + v.ghostRows) return false;
  if (!isVisibleNode(v, node)) return false;
  return v.map.nodes.some(
    (ahead) => isLegalNode(v, ahead) && areConnected(v.map, ahead.id, node.id),
  );
};

export const pathEdgesTo = (
  v: MapVantage,
  byId: ReadonlyMap<NodeId, MapNode>,
  selected: MapNode,
  visibleIds: ReadonlySet<NodeId>,
): readonly EdgePair[] => {
  if (!isPreviewableNode(v, selected)) return [];
  const pairs: EdgePair[] = areConnected(v.map, v.position, selected.id)
    ? [[v.position, selected.id]]
    : v.map.nodes
        .filter(
          (ahead) =>
            isLegalNode(v, ahead) && areConnected(v.map, ahead.id, selected.id),
        )
        .flatMap((ahead): EdgePair[] => [
          [v.position, ahead.id],
          [ahead.id, selected.id],
        ]);
  return pairs.filter(([a, b]) => {
    const na = byId.get(a);
    const nb = byId.get(b);
    return (
      na !== undefined && nb !== undefined && isDrawableEdge(na, nb, visibleIds)
    );
  });
};
