import { SCHOOL_ORDER } from "@/data/schools";
import { chartPointsByConstellation } from "@/game/chart/engine";
import type { School } from "@/types/content";

export const GLOW_FLOOR = 0.06;

export const GLOW_STEP = 0.02;

export const GLOW_POINTS_CAP = 12;

export const glowFor = (points: number): number =>
  GLOW_FLOOR + GLOW_STEP * Math.min(GLOW_POINTS_CAP, Math.max(0, points));

export interface ChartGlow {
  schools: Readonly<Record<School, number>>;
  hub: number;
}

export const chartGlow = (picks: readonly string[]): ChartGlow => {
  const points = chartPointsByConstellation(picks);
  const schools = Object.fromEntries(
    SCHOOL_ORDER.map((school) => [school, glowFor(points.get(school) ?? 0)]),
  ) as Record<School, number>;
  return { schools, hub: glowFor(points.get("hub") ?? 0) };
};
