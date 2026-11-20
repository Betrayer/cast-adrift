import { CHART_NODE_BY_ID } from "@/data/chart";
import type { ChartNodeKind } from "@/data/chart";
import { smallTier } from "@/data/chart/types";

export { smallTier };

export const SMALL_TIER_COST: readonly number[] = [1, 2, 3, 4];

export const FIXED_COST: Readonly<Partial<Record<ChartNodeKind, number>>> = {
  gate: 2,
  keystone: 6,
  nexus: 6,
};

export const HUB_COST: Readonly<Record<"small" | "notable", number>> = {
  small: 1,
  notable: 2,
};

export const SPINE_NOTABLE_COST: readonly number[] = [2, 3, 4];

export const CONFLUENCE_COST: readonly number[] = [3, 4];

export const CORE_NODE_ID = "hub-i0";

export const chartNodeCost = (id: string): number => {
  if (id === CORE_NODE_ID) return 0;
  const node = CHART_NODE_BY_ID.get(id);
  if (node === undefined) return 0;
  const fixed = FIXED_COST[node.kind];
  if (fixed !== undefined) return fixed;
  if (node.constellation === "hub") {
    return node.kind === "notable" ? HUB_COST.notable : HUB_COST.small;
  }
  if (node.kind === "notable") {
    return SPINE_NOTABLE_COST[Math.floor((node.depth - 1) / 3)] ?? 4;
  }
  if (node.kind === "confluence") {
    return CONFLUENCE_COST[node.depth <= 6 ? 0 : 1] ?? 4;
  }
  return SMALL_TIER_COST[smallTier(node.depth) - 1] ?? 1;
};

export const chartCostOf = (picks: readonly string[]): number =>
  picks.reduce((sum, id) => sum + chartNodeCost(id), 0);

export const RESET_LINEAR = 2.5;
export const RESET_QUADRATIC = 0.012;

export const resetCost = (spent: number): number =>
  Math.round(RESET_LINEAR * spent + RESET_QUADRATIC * spent * spent);
