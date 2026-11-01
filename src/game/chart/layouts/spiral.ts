import {
  LAYOUT_CENTRE,
  placeHub,
  resampleByLength,
  spokeAngle,
  squashed,
} from "./geometry";
import {
  PORTRAIT,
  armStationCount,
  placeArmOnStations,
  placeNexus,
} from "./place";
import type { ChartSkeleton } from "./skeleton";
import type { ChartDecor, LayoutParts, Point, SchoolRegion } from "./types";

export const SPIRAL = {
  gateRadius: 160,
  reach: 540,
  twist: 1.55,
  samples: 120,
  lateral: 28,
  dustInner: 118,
  dustReach: 600,
} as const;

const spiralPoint = (base: number, t: number, radius: number): Point =>
  squashed(LAYOUT_CENTRE, base + t * SPIRAL.twist, radius, PORTRAIT);

export const spiralLayout = (skeleton: ChartSkeleton): LayoutParts => {
  const pos = new Map<string, Point>();
  placeHub(skeleton, LAYOUT_CENTRE, pos);
  const decor: ChartDecor[] = [];
  const regions: SchoolRegion[] = [];
  const count = skeleton.arms.length;
  const span = SPIRAL.reach - SPIRAL.gateRadius;

  for (const arm of skeleton.arms) {
    const base = spokeAngle(arm.index, count);
    const curve = Array.from({ length: SPIRAL.samples + 1 }, (_, step) => {
      const t = step / SPIRAL.samples;
      return spiralPoint(base, t, SPIRAL.gateRadius + t * span);
    });
    const stations = resampleByLength(curve, armStationCount(arm));
    placeArmOnStations(arm, stations, SPIRAL.lateral, pos);

    const dustSpan = SPIRAL.dustReach - SPIRAL.dustInner;
    const dust = Array.from({ length: 41 }, (_, step) => {
      const t = step / 40;
      const radius = SPIRAL.dustInner + t * dustSpan;
      const along = (radius - SPIRAL.gateRadius) / span;
      return spiralPoint(base, along, radius);
    });
    decor.push({ kind: "dust", school: arm.school, points: dust });
    const middle = stations[Math.floor(stations.length / 2)] ?? LAYOUT_CENTRE;
    regions.push({
      school: arm.school,
      angle: base,
      centre: middle,
      rx: 120,
      ry: 60,
      rotation: base + SPIRAL.twist / 2,
      backbone: dust,
    });
  }

  placeNexus(skeleton, LAYOUT_CENTRE, pos);
  return { pos, decor, regions };
};
