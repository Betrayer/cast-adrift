import {
  CHART_NODE_BY_ID,
  chartNeighbors,
  HUB_BUDGET_NODE_ID,
  isEntryNode,
} from "@/data/chart";
import { MAX_LEVEL } from "@/game/xp";

export const RESPEC_SHARD_COST = 20;

export const pointsSpent = (picks: readonly string[]): number => picks.length;

export const pointsAvailable = (
  level: number,
  picks: readonly string[],
): number => Math.min(MAX_LEVEL, level) - picks.length;

export const isAllocatable = (
  id: string,
  picks: readonly string[],
): boolean => {
  const node = CHART_NODE_BY_ID.get(id);
  if (node === undefined) return false;
  if (picks.includes(id)) return false;
  if (node.entry === true) return true;
  return chartNeighbors(id).some((n) => picks.includes(n));
};

export const canAllocate = (
  id: string,
  level: number,
  picks: readonly string[],
): boolean =>
  pointsAvailable(level, picks) > 0 && isAllocatable(id, picks);

const allConnectedToEntry = (picks: readonly string[]): boolean => {
  if (picks.length === 0) return true;
  const set = new Set(picks);
  const visited = new Set<string>();
  const queue: string[] = [];
  for (const p of picks) {
    if (isEntryNode(p)) {
      visited.add(p);
      queue.push(p);
    }
  }
  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur === undefined) break;
    for (const n of chartNeighbors(cur)) {
      if (set.has(n) && !visited.has(n)) {
        visited.add(n);
        queue.push(n);
      }
    }
  }
  return picks.every((p) => visited.has(p));
};

export const canDeallocate = (
  id: string,
  picks: readonly string[],
): boolean => {
  if (!picks.includes(id)) return false;
  return allConnectedToEntry(picks.filter((p) => p !== id));
};

export const hubBudgetBonus = (picks: readonly string[]): number =>
  picks.includes(HUB_BUDGET_NODE_ID) ? 1 : 0;
