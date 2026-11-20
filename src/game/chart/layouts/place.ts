import type { ChartNodeKind } from "@/data/chart/types";
import {
  along,
  clearance,
  distance,
  midpoint,
  normalOf,
  pushedOut,
  sideSlot,
  tangentAt,
  tipSide,
  type Squash,
  squashed,
} from "./geometry";
import type { ArmSkeleton, ChartSkeleton } from "./skeleton";
import type { Point } from "./types";

export const PORTRAIT: Squash = { core: 112, kx: 0.62, ky: 1 };

export const NEXUS_PUSH = 1.08;

export const warpPoint = (centre: Point, point: Point, squash: Squash): Point =>
  squashed(
    centre,
    Math.atan2(point.y - centre.y, point.x - centre.x),
    distance(centre, point),
    squash,
  );

export const armStationCount = (arm: ArmSkeleton): number =>
  arm.spine.length + (arm.tips.length > 0 ? 1 : 0);

export const placeArmOnStations = (
  arm: ArmSkeleton,
  stations: readonly Point[],
  lateral: number,
  pos: Map<string, Point>,
): void => {
  arm.spine.forEach((id, depth) => {
    const station = stations[depth];
    if (station === undefined) return;
    pos.set(id, station);
    const normal = normalOf(tangentAt(stations, depth));
    (arm.sides.get(id) ?? []).forEach((side, slot) => {
      const reach = sideSlot(slot) * lateral;
      pos.set(side, along(station, normal, reach));
    });
  });
  const tipIndex = arm.spine.length;
  const tipStation = stations[tipIndex];
  if (tipStation === undefined) return;
  const normal = normalOf(tangentAt(stations, tipIndex));
  arm.tips.forEach((tip, slot) => {
    const reach = tipSide(slot, arm.tips.length) * lateral * 0.9;
    pos.set(tip, along(tipStation, normal, reach));
  });
};

export const placeNexus = (
  skeleton: ChartSkeleton,
  centre: Point,
  pos: Map<string, Point>,
): void => {
  for (const nexus of skeleton.nexus) {
    const a = pos.get(nexus.ends[0]);
    const b = pos.get(nexus.ends[1]);
    if (a === undefined || b === undefined) continue;
    pos.set(nexus.id, pushedOut(centre, midpoint(a, b), NEXUS_PUSH));
  }
};

export interface Occupancy {
  fits: (point: Point, kind: ChartNodeKind) => boolean;
  margin: (point: Point, kind: ChartNodeKind) => number;
  add: (point: Point, kind: ChartNodeKind) => void;
}

export const occupancy = (): Occupancy => {
  const taken: { point: Point; kind: ChartNodeKind }[] = [];
  const margin = (point: Point, kind: ChartNodeKind): number => {
    let worst = Infinity;
    for (const other of taken) {
      worst = Math.min(
        worst,
        distance(point, other.point) - clearance(kind, other.kind),
      );
    }
    return worst;
  };
  return {
    margin,
    fits: (point, kind) => margin(point, kind) >= 0,
    add: (point, kind) => {
      taken.push({ point, kind });
    },
  };
};
