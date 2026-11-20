import type { ChartNodeKind } from "@/data/chart/types";
import { createStream, type RngStream } from "@/services/rng";
import type { School } from "@/types/content";
import {
  DEG,
  LAYOUT_CENTRE,
  distance,
  midpoint,
  placeHub,
  polar,
  pushedOut,
  spokeAngle,
  squashed,
  squashedAxes,
  unit,
} from "./geometry";
import { PORTRAIT, occupancy, warpPoint, type Occupancy } from "./place";
import type { ArmSkeleton, ChartSkeleton } from "./skeleton";
import type { ChartDecor, LayoutParts, Point, SchoolRegion } from "./types";

export const CONSTELLATION_SEEDS: Readonly<Record<School, number>> = {
  red: 104,
  blue: 116,
  green: 109,
  yellow: 106,
  black: 120,
  grey: 102,
  prismatic: 125,
};

export const CONSTELLATIONS = {
  ring: 540,
  disc: 200,
  stepMin: 50,
  stepMax: 70,
  turn: 0.8,
  lateral: 42,
  tries: 64,
  sideTurns: [0, 25, -25, 50, -50, 80, -80, 115, -115, 150, -150] as readonly number[],
  sideScales: [1, 1.3, 1.6] as readonly number[],
  nexusPush: 0.03,
  nexusSteps: 24,
  labelGap: 58,
  spike: 22,
  gridRadii: [180, 360, 540, 720] as readonly number[],
  meridians: 6,
} as const;

const kindOf = (skeleton: ChartSkeleton, id: string): ChartNodeKind =>
  skeleton.kinds.get(id) ?? "small";

const screen = (design: Point): Point =>
  warpPoint(LAYOUT_CENTRE, design, PORTRAIT);

const orient = (a: Point, b: Point, c: Point): number =>
  (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);

export const segmentsCross = (a: Point, b: Point, c: Point, d: Point): boolean =>
  orient(c, d, a) * orient(c, d, b) < 0 && orient(a, b, c) * orient(a, b, d) < 0;

interface Segment {
  from: Point;
  to: Point;
}

interface Figure {
  centre: Point;
  rng: RngStream;
  taken: Occupancy;
  segments: Segment[];
}

interface Walker {
  design: Point;
  dir: number;
}

const CROSSING_PENALTY = -1000;

const score = (figure: Figure, from: Point, to: Point, kind: ChartNodeKind): number =>
  figure.segments.some((segment) => segmentsCross(from, to, segment.from, segment.to))
    ? CROSSING_PENALTY + figure.taken.margin(to, kind)
    : figure.taken.margin(to, kind);

const stride = (figure: Figure, walker: Walker, kind: ChartNodeKind): Walker => {
  const from = screen(walker.design);
  let best: Walker | null = null;
  let bestScore = -Infinity;
  for (let attempt = 0; attempt < CONSTELLATIONS.tries; attempt += 1) {
    let dir = walker.dir + (figure.rng.next() - 0.5) * 2 * CONSTELLATIONS.turn;
    const length =
      CONSTELLATIONS.stepMin +
      figure.rng.next() * (CONSTELLATIONS.stepMax - CONSTELLATIONS.stepMin);
    let design = polar(walker.design, dir, length);
    if (distance(design, figure.centre) > CONSTELLATIONS.disc) {
      const back = unit({
        x: design.x - figure.centre.x,
        y: design.y - figure.centre.y,
      });
      design = {
        x: figure.centre.x + back.x * CONSTELLATIONS.disc,
        y: figure.centre.y + back.y * CONSTELLATIONS.disc,
      };
      dir =
        Math.atan2(figure.centre.y - design.y, figure.centre.x - design.x) +
        (figure.rng.next() - 0.5);
    }
    const value = score(figure, from, screen(design), kind);
    if (value >= 0) return { design, dir };
    if (value > bestScore) {
      bestScore = value;
      best = { design, dir };
    }
  }
  return best ?? walker;
};

const beside = (
  figure: Figure,
  anchor: Point,
  heading: number,
  side: number,
  length: number,
  kind: ChartNodeKind,
): Point => {
  const from = screen(anchor);
  let best = from;
  let bestScore = -Infinity;
  for (const scale of CONSTELLATIONS.sideScales) {
    for (const turn of CONSTELLATIONS.sideTurns) {
      const angle = heading + side * (Math.PI / 2 + turn * DEG);
      const candidate = screen(polar(anchor, angle, length * scale));
      const value = score(figure, from, candidate, kind);
      if (value >= 0) return candidate;
      if (value > bestScore) {
        bestScore = value;
        best = candidate;
      }
    }
  }
  return best;
};

const drawFigure = (
  skeleton: ChartSkeleton,
  arm: ArmSkeleton,
  axis: number,
  taken: Occupancy,
  segments: Segment[],
  pos: Map<string, Point>,
  decor: ChartDecor[],
): Point[] => {
  const centre = polar(LAYOUT_CENTRE, axis, CONSTELLATIONS.ring);
  const figure: Figure = {
    centre,
    rng: createStream(CONSTELLATION_SEEDS[arm.school]),
    taken,
    segments,
  };
  let walker: Walker = {
    design: polar(centre, axis + Math.PI, CONSTELLATIONS.disc),
    dir: axis,
  };
  const trail: Point[] = [];
  const place = (id: string, point: Point, parent: Point | null): void => {
    taken.add(point, kindOf(skeleton, id));
    pos.set(id, point);
    if (parent !== null) segments.push({ from: parent, to: point });
  };
  arm.spine.forEach((id, depth) => {
    if (depth > 0) walker = stride(figure, walker, kindOf(skeleton, id));
    const point = screen(walker.design);
    place(id, point, trail[trail.length - 1] ?? null);
    trail.push(point);
    (arm.sides.get(id) ?? []).forEach((side, slot) => {
      place(
        side,
        beside(
          figure,
          walker.design,
          walker.dir,
          slot % 2 === 0 ? -1 : 1,
          CONSTELLATIONS.lateral,
          kindOf(skeleton, side),
        ),
        point,
      );
    });
  });
  const anchor = trail[trail.length - 1] ?? null;
  arm.tips.forEach((tip, slot) => {
    const kind = kindOf(skeleton, tip);
    const point =
      slot === 0
        ? screen(stride(figure, walker, kind).design)
        : beside(figure, walker.design, walker.dir, 1, CONSTELLATIONS.lateral * 1.2, kind);
    place(tip, point, anchor);
    trail.push(point);
    decor.push({ kind: "spike", school: arm.school, at: point, size: CONSTELLATIONS.spike });
  });
  for (const depth of [3, 6, 9]) {
    const from = trail[depth];
    const to = trail[Math.max(0, depth - 2 - Math.floor(figure.rng.next() * 2))];
    if (from === undefined || to === undefined) continue;
    decor.push({ kind: "figure", school: arm.school, from, to });
  }
  return trail;
};

export const constellationsLayout = (skeleton: ChartSkeleton): LayoutParts => {
  const pos = new Map<string, Point>();
  placeHub(skeleton, LAYOUT_CENTRE, pos);
  const taken = occupancy();
  for (const [id, point] of pos) taken.add(point, kindOf(skeleton, id));
  const decor: ChartDecor[] = [];
  const regions: SchoolRegion[] = [];
  const count = skeleton.arms.length;

  CONSTELLATIONS.gridRadii.forEach((radius, index) => {
    const axes = squashedAxes(radius, PORTRAIT);
    decor.push({
      kind: "orbit",
      centre: LAYOUT_CENTRE,
      rx: axes.rx,
      ry: axes.ry,
      major: index === CONSTELLATIONS.gridRadii.length - 1,
    });
  });
  const reach =
    (CONSTELLATIONS.gridRadii[CONSTELLATIONS.gridRadii.length - 1] ?? 720) + 40;
  for (let i = 0; i < CONSTELLATIONS.meridians; i += 1) {
    const angle = (i * Math.PI) / CONSTELLATIONS.meridians;
    decor.push({
      kind: "meridian",
      from: squashed(LAYOUT_CENTRE, angle, reach, PORTRAIT),
      to: squashed(LAYOUT_CENTRE, angle + Math.PI, reach, PORTRAIT),
    });
  }

  const segments: Segment[] = [];
  for (const arm of skeleton.arms) {
    const axis = spokeAngle(arm.index, count);
    const trail = drawFigure(skeleton, arm, axis, taken, segments, pos, decor);
    const centre = screen(polar(LAYOUT_CENTRE, axis, CONSTELLATIONS.ring));
    const rim = screen(
      polar(LAYOUT_CENTRE, axis, CONSTELLATIONS.ring + CONSTELLATIONS.disc),
    );
    const outward = unit({ x: rim.x - LAYOUT_CENTRE.x, y: rim.y - LAYOUT_CENTRE.y });
    decor.push({
      kind: "label",
      school: arm.school,
      at: {
        x: rim.x + outward.x * CONSTELLATIONS.labelGap,
        y: rim.y + outward.y * CONSTELLATIONS.labelGap,
      },
    });
    regions.push({
      school: arm.school,
      angle: axis,
      centre,
      rx: distance(centre, rim),
      ry: distance(centre, rim),
      rotation: axis,
      backbone: trail,
    });
  }

  for (const nexus of skeleton.nexus) {
    const endA = pos.get(nexus.ends[0]);
    const endB = pos.get(nexus.ends[1]);
    if (endA === undefined || endB === undefined) continue;
    const mid = midpoint(endA, endB);
    let best = pushedOut(LAYOUT_CENTRE, mid, 1);
    let bestCost = Infinity;
    for (let step = 0; step < CONSTELLATIONS.nexusSteps; step += 1) {
      const point = pushedOut(LAYOUT_CENTRE, mid, 1 + step * CONSTELLATIONS.nexusPush);
      const margin = taken.margin(point, "nexus");
      const crossings = segments.filter(
        (segment) =>
          segmentsCross(point, endA, segment.from, segment.to) ||
          segmentsCross(point, endB, segment.from, segment.to),
      ).length;
      const cost = (margin < 0 ? 1000 : 0) + crossings * 10 + step * 0.1;
      if (cost < bestCost) {
        bestCost = cost;
        best = point;
      }
    }
    taken.add(best, "nexus");
    pos.set(nexus.id, best);
  }
  return { pos, decor, regions };
};
