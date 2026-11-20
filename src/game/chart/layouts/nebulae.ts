import {
  LAYOUT_CENTRE,
  along,
  normalOf,
  placeHub,
  resampleByLength,
  spokeAngle,
  squashed,
  unit,
} from "./geometry";
import {
  PORTRAIT,
  armStationCount,
  placeArmOnStations,
  placeNexus,
} from "./place";
import type { ChartSkeleton } from "./skeleton";
import type { ChartDecor, LayoutParts, Point, SchoolRegion } from "./types";

export const NEBULAE = {
  ring: 460,
  half: 190,
  sway: 40,
  waves: 1.6,
  lateral: 28,
  samples: 90,
  blobPad: 56,
  labelGap: 60,
  threadRadius: 360,
  threadBow: 0.72,
} as const;

export const nebulaeLayout = (skeleton: ChartSkeleton): LayoutParts => {
  const pos = new Map<string, Point>();
  placeHub(skeleton, LAYOUT_CENTRE, pos);
  const decor: ChartDecor[] = [];
  const regions: SchoolRegion[] = [];
  const count = skeleton.arms.length;
  const wedge = (2 * Math.PI) / Math.max(1, count);

  for (let i = 0; i < count; i += 1) {
    const a = spokeAngle(i, count);
    const b = spokeAngle(i + 1, count);
    decor.push({
      kind: "thread",
      from: squashed(LAYOUT_CENTRE, a, NEBULAE.threadRadius, PORTRAIT),
      via: squashed(
        LAYOUT_CENTRE,
        a + wedge / 2,
        NEBULAE.threadRadius * NEBULAE.threadBow,
        PORTRAIT,
      ),
      to: squashed(LAYOUT_CENTRE, b, NEBULAE.threadRadius, PORTRAIT),
    });
  }

  for (const arm of skeleton.arms) {
    const base = spokeAngle(arm.index, count);
    const clusterCentre = squashed(LAYOUT_CENTRE, base, NEBULAE.ring, PORTRAIT);
    const axis = unit({
      x: clusterCentre.x - LAYOUT_CENTRE.x,
      y: clusterCentre.y - LAYOUT_CENTRE.y,
    });
    const across = normalOf(axis);
    const curve = Array.from({ length: NEBULAE.samples + 1 }, (_, s) => {
      const t = s / NEBULAE.samples;
      const offset = -NEBULAE.half + t * 2 * NEBULAE.half;
      const sway = Math.sin(t * Math.PI * NEBULAE.waves) * NEBULAE.sway;
      return {
        x: clusterCentre.x + axis.x * offset + across.x * sway,
        y: clusterCentre.y + axis.y * offset + across.y * sway,
      };
    });
    const stations = resampleByLength(curve, armStationCount(arm));
    placeArmOnStations(arm, stations, NEBULAE.lateral, pos);
    decor.push({
      kind: "label",
      school: arm.school,
      at: along(clusterCentre, axis, NEBULAE.half + NEBULAE.labelGap),
    });
    regions.push({
      school: arm.school,
      angle: base,
      centre: clusterCentre,
      rx: NEBULAE.half + NEBULAE.blobPad,
      ry: NEBULAE.sway + NEBULAE.lateral + NEBULAE.blobPad,
      rotation: Math.atan2(axis.y, axis.x),
      backbone: curve,
    });
  }

  placeNexus(skeleton, LAYOUT_CENTRE, pos);
  decor.push({
    kind: "beam",
    at: LAYOUT_CENTRE,
    length: NEBULAE.ring + NEBULAE.half,
  });
  return { pos, decor, regions };
};
