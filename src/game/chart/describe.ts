import type { ChartNodeDef } from "@/data/chart";
import { ZERO_PERK_MODS, type PerkMods } from "@/data/perks/types";
import type { SlotId } from "@/types/battle";

type Translate = (key: string, opts?: Record<string, unknown>) => string;

export interface ChartLine {
  text: string;
  drawback: boolean;
}

const MOD_ORDER: readonly (keyof PerkMods)[] = [
  "hullMaxDelta",
  "hullMaxPct",
  "battleEndHeal",
  "chargeCapDelta",
  "setCompleteCharge",
  "markBonusDelta",
  "jamPowerDelta",
  "growthCapDelta",
  "enginesThresholdDelta",
  "rerollSizeDelta",
  "extraRerolls",
  "reserveDelta",
  "blueReserveDelta",
  "nudgeCostDelta",
  "battleStartScrap",
  "scrapPerKill",
  "scrapMultPct",
  "shopDiscountPct",
  "freeShopRerolls",
  "xpMultPct",
  "tideEffectDelta",
  "moduleSlotDelta",
];

const MISSING_MODS = (Object.keys(ZERO_PERK_MODS) as (keyof PerkMods)[]).filter(
  (key) => !MOD_ORDER.includes(key),
);

export const UNDESCRIBED_MOD_KEYS: readonly (keyof PerkMods)[] = MISSING_MODS;

const LOWER_IS_BETTER: ReadonlySet<keyof PerkMods> = new Set([
  "nudgeCostDelta",
  "tideEffectDelta",
]);

const SLOT_ORDER: readonly SlotId[] = [
  "weaponA",
  "weaponB",
  "spinal",
  "shields",
  "shieldsB",
  "engines",
  "sensors",
  "reactor",
  "repairBay",
];

const signed = (n: number): string => (n > 0 ? `+${String(n)}` : String(n));

export const chartNodeTitle = (node: ChartNodeDef, t: Translate): string => {
  if (node.name !== undefined) return t(node.name);
  return t("meta:chart.smallTitle", {
    school: t(`meta:constellation.${node.constellation}`),
  });
};

export const chartNodeLines = (
  node: ChartNodeDef,
  t: Translate,
): ChartLine[] => {
  const lines: ChartLine[] = [];
  if (node.mods !== undefined) {
    for (const key of MOD_ORDER) {
      const value = node.mods[key];
      if (value === undefined || value === 0) continue;
      lines.push({
        text: t(`meta:chartFx.mod.${key}`, { n: signed(value) }),
        drawback: LOWER_IS_BETTER.has(key) ? value > 0 : value < 0,
      });
    }
  }
  if (node.fx !== undefined) lines.push({ text: t(node.fx), drawback: false });
  if (node.traits !== undefined) {
    for (const trait of node.traits) {
      lines.push({
        text: t(`meta:chartFx.trait.${trait}`),
        drawback: false,
      });
    }
  }
  if (node.hubBudget === true) {
    lines.push({ text: t("meta:chartFx.hubBudget"), drawback: false });
  }
  if (node.budgetDelta !== undefined && node.budgetDelta !== 0) {
    lines.push({
      text: t("meta:chartFx.budgetDelta", { n: signed(node.budgetDelta) }),
      drawback: node.budgetDelta < 0,
    });
  }
  if (node.slotTierDelta !== undefined) {
    for (const slot of SLOT_ORDER) {
      const delta = node.slotTierDelta[slot];
      if (delta === undefined || delta === 0) continue;
      lines.push({
        text: t("meta:chartFx.slotTier", {
          slot: t(`battle:slot.${slot}`),
          n: signed(delta),
        }),
        drawback: delta < 0,
      });
    }
  }
  return lines;
};

export const chartNodeTexts = (node: ChartNodeDef, t: Translate): string[] =>
  chartNodeLines(node, t).map((line) => line.text);
