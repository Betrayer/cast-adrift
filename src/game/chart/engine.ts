import { CHART_NODE_BY_ID, chartNeighbors, isEntryNode } from "@/data/chart";
import { MAX_LEVEL } from "@/game/xp";
import type { SlotId } from "@/types/battle";

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

// «Инженерный отсек» adds a hangar slot, «Prism Cascade» takes two away; both
// are the same signed delta so the budget stays one number.
export const hubBudgetBonus = (picks: readonly string[]): number =>
  picks.reduce(
    (sum, id) => sum + (CHART_NODE_BY_ID.get(id)?.budgetDelta ?? 0),
    0,
  );

// «Iron Doctrine» is the only chart node that shrinks a slot cap; the run merges
// this with the mutator deltas before the battle is built.
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
