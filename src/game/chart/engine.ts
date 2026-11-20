import {
  CHART_NODES,
  CHART_NODE_BY_ID,
  chartNeighbors,
  isEntryNode,
} from "@/data/chart";
import {
  bonusChartPoints,
  RESET_DISCOUNT_LEVEL,
  RESET_DISCOUNT_PCT,
} from "@/data/milestones";
import { chartCostOf, chartNodeCost, resetCost } from "@/game/chart/cost";
import { MAX_LEVEL } from "@/game/xp";
import type { ChartNodeDef, Constellation } from "@/data/chart";
import type { SlotId } from "@/types/battle";
import type { School } from "@/types/content";

export const RESPEC_SHARD_COST = 20;

export const respecCost = (id: string): number =>
  RESPEC_SHARD_COST * chartNodeCost(id);

export const chartPointsByConstellation = (
  picks: readonly string[],
): ReadonlyMap<Constellation, number> => {
  const points = new Map<Constellation, number>();
  for (const id of picks) {
    const node = CHART_NODE_BY_ID.get(id);
    if (node === undefined) continue;
    points.set(
      node.constellation,
      (points.get(node.constellation) ?? 0) + chartNodeCost(id),
    );
  }
  return points;
};

export const chartPointsIn = (
  picks: readonly string[],
  school: School,
): number => chartPointsByConstellation(picks).get(school) ?? 0;

export const confluenceSteps = (
  picks: readonly string[],
  node: ChartNodeDef,
): number => {
  const scaling = node.scaledBy;
  if (scaling === undefined) return 1;
  const invested = Math.min(
    scaling.max,
    chartPointsIn(picks, scaling.school),
  );
  return Math.floor(invested / scaling.per);
};

export const meetsRequirement = (
  node: ChartNodeDef,
  picks: readonly string[],
): boolean => {
  const need = node.requires?.pointsIn;
  if (need === undefined) return true;
  return Object.entries(need).every(
    ([school, points]) => chartPointsIn(picks, school as School) >= points,
  );
};

export const chartResetCost = (
  level: number,
  picks: readonly string[],
): number => {
  const base = resetCost(pointsSpent(picks));
  if (level < RESET_DISCOUNT_LEVEL) return base;
  return Math.round((base * (100 - RESET_DISCOUNT_PCT)) / 100);
};

export const POINTS_PER_LEVEL = 2;

export const pointsTotal = (level: number): number =>
  POINTS_PER_LEVEL * Math.min(MAX_LEVEL, level) + bonusChartPoints(level);

export const levelUpPoints = (fromLevel: number, toLevel: number): number =>
  POINTS_PER_LEVEL *
  (Math.min(MAX_LEVEL, toLevel) - Math.min(MAX_LEVEL, fromLevel));

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
  if (!meetsRequirement(node, picks)) return false;
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

const hasRequirement = (id: string): boolean =>
  CHART_NODE_BY_ID.get(id)?.requires !== undefined;

export const heldRequirements = (
  picks: readonly string[],
): ReadonlySet<string> => {
  const pending = picks.filter(hasRequirement);
  const settled = picks.filter((id) => !hasRequirement(id));
  const held = new Set<string>();
  let progressed = true;
  while (pending.length > 0 && progressed) {
    progressed = false;
    for (const id of [...pending]) {
      const node = CHART_NODE_BY_ID.get(id);
      if (node === undefined || !meetsRequirement(node, settled)) continue;
      settled.push(id);
      held.add(id);
      pending.splice(pending.indexOf(id), 1);
      progressed = true;
    }
  }
  return held;
};

export const requirementsHold = (picks: readonly string[]): boolean => {
  const held = heldRequirements(picks);
  return picks.every((id) => !hasRequirement(id) || held.has(id));
};

export const canDeallocate = (
  id: string,
  picks: readonly string[],
): boolean => {
  if (!picks.includes(id)) return false;
  const rest = picks.filter((p) => p !== id);
  if (!picksConnected(rest)) return false;
  const after = heldRequirements(rest);
  return [...heldRequirements(picks)].every(
    (held) => held === id || after.has(held),
  );
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
  const blocked = new Set(
    CHART_NODES.filter(
      (node) =>
        !owned.has(node.id) &&
        node.id !== target &&
        !meetsRequirement(node, picks),
    ).map((node) => node.id),
  );
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
      if (settled.has(next) || blocked.has(next)) continue;
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

export const pickedChain = (
  target: string,
  picks: readonly string[],
): string[] => {
  const owned = new Set(picks);
  owned.add(target);
  const start = CHART_NODES.find(
    (node) => node.entry === true && owned.has(node.id),
  )?.id;
  if (start === undefined) return [];
  const from = new Map<string, string | null>([[start, null]]);
  const queue: string[] = [start];
  for (let head = 0; head < queue.length; head += 1) {
    const current = queue[head];
    if (current === undefined || current === target) break;
    for (const next of chartNeighbors(current)) {
      if (!owned.has(next) || from.has(next)) continue;
      from.set(next, current);
      queue.push(next);
    }
  }
  if (!from.has(target)) return [];
  const chain: string[] = [];
  let cursor: string | null | undefined = target;
  while (cursor !== null && cursor !== undefined) {
    chain.unshift(cursor);
    cursor = from.get(cursor);
  }
  return chain;
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
