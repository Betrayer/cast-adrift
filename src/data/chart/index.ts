import { CHART_NODES, HUB_BUDGET_NODE_ID } from "@/data/chart/nodes";
import type { ChartNodeDef } from "@/data/chart/types";

export type { ChartNodeDef, ChartNodeKind, Constellation } from "@/data/chart/types";
export { CHART_NODES, HUB_BUDGET_NODE_ID };

export const CHART_NODE_BY_ID: ReadonlyMap<string, ChartNodeDef> = new Map(
  CHART_NODES.map((n) => [n.id, n]),
);

// The 220-node layout runs past the old fixed 0..1000 canvas, so the screen
// takes its viewBox from the data rather than from a constant.
const CHART_PAD = 40;

export const CHART_BOUNDS = ((): {
  x: number;
  y: number;
  w: number;
  h: number;
} => {
  const xs = CHART_NODES.map((n) => n.pos.x);
  const ys = CHART_NODES.map((n) => n.pos.y);
  const minX = Math.min(...xs) - CHART_PAD;
  const minY = Math.min(...ys) - CHART_PAD;
  return {
    x: minX,
    y: minY,
    w: Math.max(...xs) + CHART_PAD - minX,
    h: Math.max(...ys) + CHART_PAD - minY,
  };
})();

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
