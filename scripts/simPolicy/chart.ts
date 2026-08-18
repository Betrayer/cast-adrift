import { CHART_NODES, CHART_NODE_BY_ID } from "../../src/data/chart";
import type { ChartNodeDef } from "../../src/data/chart/types";
import type { PerkMods } from "../../src/data/perks/types";
import { canAllocate, pointsTotal } from "../../src/game/chart/engine";
import { computeChartMods } from "../../src/game/run/runMods";

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

const KIND_VALUE: Record<string, number> = {
  small: 0.2,
  minor: 0.6,
  notable: 1.4,
  keystone: 3,
};

const nodeValue = (def: ChartNodeDef): number => {
  const mods = computeChartMods([def.id]);
  let score = KIND_VALUE[def.kind] ?? 0.2;
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

export const buildChartPicks = (level: number): string[] => {
  const budget = pointsTotal(level);
  const picks: string[] = [];
  for (let step = 0; step < budget; step += 1) {
    let best: ChartNodeDef | undefined;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (const def of CHART_NODES) {
      if (!canAllocate(def.id, level, picks)) continue;
      const score = nodeValue(def);
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

export const chartPickNames = (picks: readonly string[]): string[] =>
  picks.map((id) => CHART_NODE_BY_ID.get(id)?.kind ?? "?");
