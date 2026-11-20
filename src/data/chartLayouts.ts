import type { ChartLayoutId } from "@/types";
import type { LocKey } from "@/types/content";

export interface ChartLayoutDef {
  id: ChartLayoutId;
  name: LocKey;
  desc: LocKey;
}

export const DEFAULT_CHART_LAYOUT: ChartLayoutId = "spiral";

export const CHART_LAYOUTS: readonly ChartLayoutDef[] = [
  {
    id: "spiral",
    name: "settings:chartLayout.spiral.name",
    desc: "settings:chartLayout.spiral.desc",
  },
  {
    id: "rings",
    name: "settings:chartLayout.rings.name",
    desc: "settings:chartLayout.rings.desc",
  },
  {
    id: "constellations",
    name: "settings:chartLayout.constellations.name",
    desc: "settings:chartLayout.constellations.desc",
  },
  {
    id: "nebulae",
    name: "settings:chartLayout.nebulae.name",
    desc: "settings:chartLayout.nebulae.desc",
  },
];

export const CHART_LAYOUT_IDS: readonly ChartLayoutId[] = CHART_LAYOUTS.map(
  (def) => def.id,
);

export const isChartLayoutId = (value: unknown): value is ChartLayoutId =>
  typeof value === "string" &&
  CHART_LAYOUT_IDS.includes(value as ChartLayoutId);
