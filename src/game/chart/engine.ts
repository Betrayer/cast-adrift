import {
  CHART_NODES,
  CHART_NODE_BY_ID,
  chartNeighbors,
  isEntryNode,
} from "@/data/chart";
import { bonusChartPoints, FREE_RESPEC_LEVEL } from "@/data/milestones";
import { chartCostOf, chartNodeCost } from "@/game/chart/cost";
import { MAX_LEVEL } from "@/game/xp";
import type { SlotId } from "@/types/battle";

export const RESPEC_SHARD_COST = 20;

export const respecCost = (level: number, id: string): number =>
  level >= FREE_RESPEC_LEVEL ? 0 : RESPEC_SHARD_COST * chartNodeCost(id);

export const pointsTotal = (level: number): number =>
  Math.min(MAX_LEVEL, level) + bonusChartPoints(level);

export const pointsSpent = (picks: readonly string[]): number =>
  chartCostOf(picks);

export const pointsAvailable = (
  level: number,
  picks: readonly string[],
): number => pointsTotal(level) - pointsSpent(picks);

export const isOverBudget = (
  level: number,
  picks: readonly string[],
): boolean => pointsAvailable(level, picks) < 0;

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
  pointsAvailable(level, picks) >= chartNodeCost(id) &&
  isAllocatable(id, picks);

export const picksConnected = (picks: readonly string[]): boolean => {
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
  return picksConnected(picks.filter((p) => p !== id));
};

export interface ChartPath {
  ids: string[];
  cost: number;
}

export const pathTo = (
  target: string,
  picks: readonly string[],
): ChartPath | null => {
  if (!CHART_NODE_BY_ID.has(target)) return null;
  const owned = new Set(picks);
  if (owned.has(target)) return { ids: [], cost: 0 };
  const dist = new Map<string, number>();
  const from = new Map<string, string>();
  const settled = new Set<string>();
  for (const id of picks) dist.set(id, 0);
  for (const node of CHART_NODES) {
    if (node.entry !== true || owned.has(node.id)) continue;
    dist.set(node.id, chartNodeCost(node.id));
  }
  for (;;) {
    let current: string | undefined;
    let best = Infinity;
    for (const [id, d] of dist) {
      if (settled.has(id) || d >= best) continue;
      best = d;
      current = id;
    }
    if (current === undefined) break;
    settled.add(current);
    if (current === target) break;
    for (const next of chartNeighbors(current)) {
      if (settled.has(next)) continue;
      const candidate = best + (owned.has(next) ? 0 : chartNodeCost(next));
      const known = dist.get(next);
      if (known !== undefined && known <= candidate) continue;
      dist.set(next, candidate);
      from.set(next, current);
    }
  }
  const cost = dist.get(target);
  if (cost === undefined || !settled.has(target)) return null;
  const ids: string[] = [];
  let cursor: string | undefined = target;
  while (cursor !== undefined) {
    if (!owned.has(cursor)) ids.unshift(cursor);
    cursor = from.get(cursor);
  }
  return { ids, cost };
};

export const hubBudgetBonus = (picks: readonly string[]): number =>
  picks.reduce(
    (sum, id) => sum + (CHART_NODE_BY_ID.get(id)?.budgetDelta ?? 0),
    0,
  );

export const chartSlotTierDelta = (
  picks: readonly string[],
): Partial<Record<SlotId, number>> => {
  const out: Partial<Record<SlotId, number>> = {};
  for (const id of picks) {
    const deltas = CHART_NODE_BY_ID.get(id)?.slotTierDelta;
    if (deltas === undefined) continue;
    for (const [slot, delta] of Object.entries(deltas) as [SlotId, number][]) {
      out[slot] = (out[slot] ?? 0) + delta;
    }
  }
  return out;
};
