import { smallTier } from "@/data/chart/types";
import {
  LAYOUT_CENTRE,
  fmtPoint,
  placeHub,
  sideSlot,
  spokeAngle,
  squashed,
  squashedAxes,
  tipSide,
} from "./geometry";
import { PORTRAIT, placeNexus } from "./place";
import type { ChartSkeleton } from "./skeleton";
import type { ChartDecor, LayoutParts, Point, SchoolRegion } from "./types";

export const RINGS = {
  gateRadius: 160,
  step: 34,
  tierGap: 26,
  spread: 0.28,
  tipSpread: 0.13,
  wedgeFill: 0.92,
  labelGap: 52,
} as const;

const KEYSTONE_DEPTH = 12;

export const ringTier = (depth: number): number =>
  depth <= 0 ? 0 : depth >= KEYSTONE_DEPTH ? 5 : smallTier(depth);

export const ringRadius = (depth: number): number =>
  RINGS.gateRadius + depth * RINGS.step + ringTier(depth) * RINGS.tierGap;

const at = (angle: number, radius: number): Point =>
  squashed(LAYOUT_CENTRE, angle, radius, PORTRAIT);

const wedgePath = (from: number, to: number, inner: number, outer: number): string => {
  const outerAxes = squashedAxes(outer, PORTRAIT);
  const innerAxes = squashedAxes(inner, PORTRAIT);
  return [
    `M${fmtPoint(at(from, inner))}`,
    `L${fmtPoint(at(from, outer))}`,
    `A${outerAxes.rx.toFixed(1)},${outerAxes.ry.toFixed(1)} 0 0 1 ${fmtPoint(at(to, outer))}`,
    `L${fmtPoint(at(to, inner))}`,
    `A${innerAxes.rx.toFixed(1)},${innerAxes.ry.toFixed(1)} 0 0 0 ${fmtPoint(at(from, inner))}`,
    "Z",
  ].join(" ");
};

const bandRadius = (tier: number): number => {
  const depths = Array.from({ length: KEYSTONE_DEPTH + 1 }, (_, d) => d).filter(
    (d) => ringTier(d) === tier,
  );
  const total = depths.reduce((sum, d) => sum + ringRadius(d), 0);
  return depths.length === 0 ? 0 : total / depths.length;
};

export const ringsLayout = (skeleton: ChartSkeleton): LayoutParts => {
  const pos = new Map<string, Point>();
  placeHub(skeleton, LAYOUT_CENTRE, pos);
  const decor: ChartDecor[] = [];
  const regions: SchoolRegion[] = [];
  const count = skeleton.arms.length;
  const wedge = (2 * Math.PI) / Math.max(1, count);

  for (let tier = 0; tier <= 5; tier += 1) {
    const axes = squashedAxes(bandRadius(tier), PORTRAIT);
    decor.push({
      kind: "orbit",
      centre: LAYOUT_CENTRE,
      rx: axes.rx,
      ry: axes.ry,
      major: tier === 0 || tier === 5,
    });
  }

  const inner = RINGS.gateRadius - 24;
  const outer = ringRadius(KEYSTONE_DEPTH) + 30;
  for (const arm of skeleton.arms) {
    const base = spokeAngle(arm.index, count);
    const half = (wedge / 2) * RINGS.wedgeFill;
    decor.push({
      kind: "wedge",
      school: arm.school,
      path: wedgePath(base - half, base + half, inner, outer),
    });
    arm.spine.forEach((id, depth) => {
      const radius = ringRadius(depth);
      pos.set(id, at(base, radius));
      (arm.sides.get(id) ?? []).forEach((side, slot) => {
        pos.set(side, at(base + sideSlot(slot) * RINGS.spread * wedge, radius));
      });
    });
    arm.tips.forEach((tip, slot) => {
      const offset = tipSide(slot, arm.tips.length) * RINGS.tipSpread * wedge;
      pos.set(tip, at(base + offset, ringRadius(KEYSTONE_DEPTH)));
    });
    const label = at(base, outer + RINGS.labelGap);
    decor.push({ kind: "label", school: arm.school, at: label });
    const backbone = arm.spine
      .map((id) => pos.get(id))
      .filter((point): point is Point => point !== undefined);
    regions.push({
      school: arm.school,
      angle: base,
      centre: at(base, (inner + outer) / 2),
      rx: (outer - inner) / 2,
      ry: half * ((inner + outer) / 2),
      rotation: base,
      backbone,
    });
  }

  placeNexus(skeleton, LAYOUT_CENTRE, pos);
  return { pos, decor, regions };
};
