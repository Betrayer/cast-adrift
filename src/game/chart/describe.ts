import type { ChartNodeDef } from "@/data/chart";
import type { PerkMods } from "@/data/perks/types";

type Translate = (key: string, opts?: Record<string, unknown>) => string;

const MOD_KEYS: readonly (keyof PerkMods)[] = [
  "scrapMultPct",
  "shopDiscountPct",
  "hullMaxDelta",
  "chargeCapDelta",
  "battleStartScrap",
  "rerollSizeDelta",
  "nudgeCostDelta",
  "reserveDelta",
  "blueReserveDelta",
  "jamPowerDelta",
  "growthCapDelta",
  "enginesThresholdDelta",
  "markBonusDelta",
  "battleEndHeal",
];

const signed = (n: number): string => (n > 0 ? `+${String(n)}` : String(n));

export const chartNodeTitle = (node: ChartNodeDef, t: Translate): string => {
  if (node.name !== undefined) return t(node.name);
  return t("meta:chart.smallTitle", {
    school: t(`meta:constellation.${node.constellation}`),
  });
};

export const chartNodeLines = (node: ChartNodeDef, t: Translate): string[] => {
  const lines: string[] = [];
  if (node.mods !== undefined) {
    for (const key of MOD_KEYS) {
      const value = node.mods[key];
      if (value !== undefined && value !== 0) {
        lines.push(t(`meta:chartFx.mod.${key}`, { n: signed(value) }));
      }
    }
  }
  if (node.fx !== undefined) lines.push(t(node.fx));
  if (node.traits !== undefined) {
    for (const trait of node.traits) {
      lines.push(t(`meta:chartFx.trait.${trait}`));
    }
  }
  if (node.hubBudget === true) lines.push(t("meta:chartFx.hubBudget"));
  return lines;
};
