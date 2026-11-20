import { CHART_NODES, HUB_BUDGET_NODE_ID } from "@/data/chart/nodes";
import type { ChartNodeDef } from "@/data/chart/types";
import type { School } from "@/types/content";

export type { ChartNodeDef, ChartNodeKind, Constellation } from "@/data/chart/types";
export { CHART_NODES, HUB_BUDGET_NODE_ID };

export const CHART_NODE_BY_ID: ReadonlyMap<string, ChartNodeDef> = new Map(
  CHART_NODES.map((n) => [n.id, n]),
);

const buildEdges = (): [ChartNodeDef, ChartNodeDef][] => {
  const seen = new Set<string>();
  const edges: [ChartNodeDef, ChartNodeDef][] = [];
  for (const node of CHART_NODES) {
    for (const link of node.links) {
      const other = CHART_NODE_BY_ID.get(link);
      if (other === undefined) continue;
      const key = [node.id, link].sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push([node, other]);
    }
  }
  return edges;
};

export const CHART_EDGES: readonly (readonly [ChartNodeDef, ChartNodeDef])[] =
  buildEdges();

const buildAdjacency = (): Map<string, string[]> => {
  const adj = new Map<string, string[]>();
  const add = (a: string, b: string): void => {
    const list = adj.get(a) ?? [];
    if (!list.includes(b)) list.push(b);
    adj.set(a, list);
  };
  for (const node of CHART_NODES) {
    if (!adj.has(node.id)) adj.set(node.id, []);
    for (const link of node.links) {
      add(node.id, link);
      add(link, node.id);
    }
  }
  return adj;
};

export const CHART_ADJACENCY: ReadonlyMap<string, readonly string[]> =
  buildAdjacency();

export const chartNeighbors = (id: string): readonly string[] =>
  CHART_ADJACENCY.get(id) ?? [];

export const isEntryNode = (id: string): boolean =>
  CHART_NODE_BY_ID.get(id)?.entry === true;

export const chartSpine = (school: School): string[] => {
  const ids: string[] = [];
  let cursor: string | undefined = `${school}-key1`;
  while (cursor !== undefined) {
    ids.unshift(cursor);
    const node: ChartNodeDef | undefined = CHART_NODE_BY_ID.get(cursor);
    if (node === undefined || node.kind === "gate") break;
    cursor = node.links[0];
  }
  return ids;
};
