import { CHART_NODES, CHART_NODE_BY_ID, chartNeighbors } from "@/data/chart";
import type { ChartNodeKind } from "@/data/chart";

export const GATE_SURCHARGE = 1;

export const KIND_SURCHARGE: Readonly<Record<ChartNodeKind, number>> = {
  small: 0,
  gate: GATE_SURCHARGE,
  minor: 1,
  notable: 1,
  keystone: 2,
};

export const MID_TIER_DEPTH = 4;
export const DEEP_TIER_DEPTH = 7;

export const MIN_NODE_COST = 1;
export const MAX_NODE_COST = 5;

export const depthTier = (depth: number): number =>
  depth >= DEEP_TIER_DEPTH ? 3 : depth >= MID_TIER_DEPTH ? 2 : 1;

const buildBranchDepth = (): ReadonlyMap<string, number> => {
  const depth = new Map<string, number>();
  const lines = new Map<string, string[]>();
  for (const node of CHART_NODES) {
    const line = lines.get(node.constellation) ?? [];
    line.push(node.id);
    lines.set(node.constellation, line);
  }
  for (const ids of lines.values()) {
    const inLine = new Set(ids);
    const queue: string[] = [];
    for (const id of ids) {
      if (CHART_NODE_BY_ID.get(id)?.entry !== true) continue;
      depth.set(id, 0);
      queue.push(id);
    }
    let head = 0;
    while (head < queue.length) {
      const current = queue[head];
      head += 1;
      if (current === undefined) continue;
      const next = (depth.get(current) ?? 0) + 1;
      for (const neighbor of chartNeighbors(current)) {
        if (!inLine.has(neighbor) || depth.has(neighbor)) continue;
        depth.set(neighbor, next);
        queue.push(neighbor);
      }
    }
  }
  return depth;
};

const BRANCH_DEPTH = buildBranchDepth();

export const branchDepth = (id: string): number => BRANCH_DEPTH.get(id) ?? 0;

export const chartNodeCost = (id: string): number => {
  const node = CHART_NODE_BY_ID.get(id);
  if (node === undefined) return 0;
  return depthTier(branchDepth(id)) + KIND_SURCHARGE[node.kind];
};

export const chartCostOf = (picks: readonly string[]): number =>
  picks.reduce((sum, id) => sum + chartNodeCost(id), 0);
