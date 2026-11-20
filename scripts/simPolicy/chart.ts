import { CHART_NODES } from "../../src/data/chart";
import type {
  ChartNodeDef,
  ChartNodeKind,
  Constellation,
} from "../../src/data/chart/types";
import type { PerkMods } from "../../src/data/perks/types";
import { chartNodeCost, CORE_NODE_ID } from "../../src/game/chart/cost";
import {
  canAllocate,
  chartPointsIn,
  pathTo,
  pointsSpent,
  pointsTotal,
} from "../../src/game/chart/engine";
import { computeChartMods } from "../../src/game/run/runMods";
import type { School } from "../../src/types/content";

const MOD_WEIGHTS: Partial<Record<keyof PerkMods, number>> = {
  hullMaxDelta: 0.2,
  hullMaxPct: 0.1,
  battleEndHeal: 0.5,
  chargeCapDelta: 0.15,
  extraRerolls: 0.7,
  reserveDelta: 0.6,
  blueReserveDelta: 0.3,
  markBonusDelta: 0.5,
  jamPowerDelta: 0.3,
  evasionDelta: 0.05,
  growthCapDelta: 0.25,
  scrapMultPct: 0.05,
  scrapPerKill: 0.2,
  setCompleteCharge: 0.2,
  battleStartScrap: 0.08,
  tideEffectDelta: -0.9,
  nudgeCostDelta: -0.7,
  moduleSlotDelta: 1.5,
  shopDiscountPct: 0.04,
  freeShopRerolls: 0.2,
  rerollSizeDelta: 0.4,
  xpMultPct: 0,
};

const KIND_VALUE: Readonly<Record<ChartNodeKind, number>> = {
  small: 0.2,
  gate: 0.4,
  confluence: 1.2,
  notable: 1.4,
  nexus: 3,
  keystone: 3,
};

const nodeValue = (def: ChartNodeDef): number => {
  const mods = computeChartMods([def.id]);
  let score = KIND_VALUE[def.kind];
  for (const [key, weight] of Object.entries(MOD_WEIGHTS)) {
    score += mods[key as keyof PerkMods] * (weight ?? 0);
  }
  score += (def.traits?.length ?? 0) * 1.2;
  score += (def.effects?.length ?? 0) * 0.6;
  score += Object.keys(def.slotTierDelta ?? {}).length * 0.8;
  score += def.hubBudget === true ? 1 : 0;
  score += (def.budgetDelta ?? 0) * 0.5;
  return score;
};

export const MID_COLLECTION_LEVEL = 25;

export const ARCHETYPE_LEVEL = 50;

export const CHART_SCHOOLS: readonly School[] = [
  "red",
  "blue",
  "green",
  "yellow",
  "black",
  "grey",
  "prismatic",
];

export const HALF_BRANCH_POINTS = 12;

export const SPREAD_THIRD_POINTS = 10;

const byDepth = (a: ChartNodeDef, b: ChartNodeDef): number =>
  a.depth - b.depth ||
  chartNodeCost(a.id) - chartNodeCost(b.id) ||
  a.id.localeCompare(b.id);

const branchNodes = (constellation: Constellation): ChartNodeDef[] =>
  CHART_NODES.filter(
    (n) => n.constellation === constellation && n.kind !== "keystone",
  ).sort(byDepth);

const keystonesOf = (school: School): string[] =>
  CHART_NODES.filter(
    (n) => n.constellation === school && n.kind === "keystone",
  ).map((n) => n.id);

export const extendPicks = (
  picks: string[],
  target: string,
  budget: number,
): boolean => {
  if (picks.includes(target)) return true;
  const path = pathTo(target, picks);
  if (path === null) return false;
  if (pointsSpent(picks) + path.cost > budget) return false;
  picks.push(...path.ids);
  return true;
};

const investIn = (
  picks: string[],
  school: School,
  points: number,
  budget: number,
): void => {
  for (const node of branchNodes(school)) {
    if (chartPointsIn(picks, school) >= points) return;
    if (picks.includes(node.id)) continue;
    const path = pathTo(node.id, picks);
    if (path === null) continue;
    const inSchool = path.ids.filter(
      (id) => CHART_NODES.find((n) => n.id === id)?.constellation === school,
    );
    const added = inSchool.reduce((sum, id) => sum + chartNodeCost(id), 0);
    if (chartPointsIn(picks, school) + added > points) continue;
    extendPicks(picks, node.id, budget);
  }
};

const fillGreedy = (picks: string[], level: number): string[] => {
  const budget = pointsTotal(level);
  for (let step = 0; step < budget; step += 1) {
    if (pointsSpent(picks) >= budget) break;
    let best: ChartNodeDef | undefined;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (const def of CHART_NODES) {
      if (!canAllocate(def.id, level, picks)) continue;
      const score = nodeValue(def) / Math.max(1, chartNodeCost(def.id));
      if (score > bestScore) {
        bestScore = score;
        best = def;
      }
    }
    if (best === undefined) break;
    picks.push(best.id);
  }
  return picks;
};

const nexusBetween = (a: School, b: School): string | undefined =>
  CHART_NODES.find(
    (n) =>
      n.kind === "nexus" &&
      n.requires?.pointsIn[a] !== undefined &&
      n.requires.pointsIn[b] !== undefined,
  )?.id;

export const monoChart = (school: School, level = ARCHETYPE_LEVEL): string[] => {
  const budget = pointsTotal(level);
  const picks = [CORE_NODE_ID];
  for (const node of branchNodes(school)) extendPicks(picks, node.id, budget);
  for (const id of keystonesOf(school)) extendPicks(picks, id, budget);
  for (const node of branchNodes("hub")) extendPicks(picks, node.id, budget);
  return picks;
};

export const dualChart = (
  first: School,
  second: School,
  level = ARCHETYPE_LEVEL,
): string[] => {
  const budget = pointsTotal(level);
  const picks = [CORE_NODE_ID];
  for (const school of [first, second]) {
    const need = Math.max(
      0,
      ...keystonesOf(school).map(
        (id) =>
          CHART_NODES.find((n) => n.id === id)?.requires?.pointsIn[school] ?? 0,
      ),
    );
    investIn(picks, school, need, budget);
    const key = keystonesOf(school)[0];
    if (key !== undefined) extendPicks(picks, key, budget);
  }
  return fillGreedy(picks, level);
};

export const spreadChart = (
  pair: readonly [School, School],
  third: School,
  level = ARCHETYPE_LEVEL,
): string[] => {
  const budget = pointsTotal(level);
  const picks = [CORE_NODE_ID];
  for (const school of pair) {
    investIn(picks, school, HALF_BRANCH_POINTS, budget);
  }
  const nexus = nexusBetween(pair[0], pair[1]);
  if (nexus !== undefined) extendPicks(picks, nexus, budget);
  investIn(picks, third, SPREAD_THIRD_POINTS, budget);
  return fillGreedy(picks, level);
};

export const hubHeavyChart = (level = ARCHETYPE_LEVEL): string[] => {
  const budget = pointsTotal(level);
  const picks = [CORE_NODE_ID];
  for (const node of branchNodes("hub")) extendPicks(picks, node.id, budget);
  return fillGreedy(picks, level);
};

export const halfBranchChart = (school: School): string[] => {
  const picks = [CORE_NODE_ID];
  investIn(picks, school, HALF_BRANCH_POINTS, Number.POSITIVE_INFINITY);
  return picks;
};

export const nexusIds = (): string[] =>
  CHART_NODES.filter((n) => n.kind === "nexus").map((n) => n.id);

export const nexusReachable = (nexus: string, level = ARCHETYPE_LEVEL): boolean => {
  const node = CHART_NODES.find((n) => n.id === nexus);
  const schools = Object.keys(node?.requires?.pointsIn ?? {}) as School[];
  const [a, b] = schools;
  if (a === undefined || b === undefined) return false;
  const budget = pointsTotal(level);
  const picks = [CORE_NODE_ID];
  for (const school of [a, b]) {
    investIn(picks, school, node?.requires?.pointsIn[school] ?? 0, budget);
  }
  return extendPicks(picks, nexus, budget);
};

export const buildChartPicks = (level: number): string[] => {
  const budget = pointsTotal(level);
  const picks: string[] = [CORE_NODE_ID];
  for (let step = 0; step < budget; step += 1) {
    if (pointsSpent(picks) >= budget) break;
    let best: ChartNodeDef | undefined;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (const def of CHART_NODES) {
      if (!canAllocate(def.id, level, picks)) continue;
      const score = nodeValue(def) / Math.max(1, chartNodeCost(def.id));
      if (score > bestScore) {
        bestScore = score;
        best = def;
      }
    }
    if (best === undefined) break;
    picks.push(best.id);
  }
  return picks;
};

