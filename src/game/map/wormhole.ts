import {
  nearestInLane,
  nodeById,
  spotOf,
  wormholeFor,
  type MapGraph,
  type MapNode,
  type NodeId,
} from "@/game/map/types";

export type ThrowDirection = "forward" | "backward";

export type ThrowFallback = "none" | "nearest" | "stalled";

export interface ThrowSource {
  int: (min: number, max: number) => number;
}

export interface ThrowRequest {
  map: MapGraph;
  from: NodeId;
  hole: NodeId;
  visited: readonly NodeId[];
  rides: number;
}

export interface WormholeThrow {
  from: NodeId;
  hole: NodeId;
  landing: NodeId | null;
  extra: number;
  laneShift: number;
  direction: ThrowDirection;
  rows: number;
  gentle: boolean;
  fallback: ThrowFallback;
}

export const GENTLE_RIDES = 2;

export const EXTRA_ROWS_FACES = 6;

export const LANE_SHIFT_FACES = 9;

const EXTRA_ROWS_BY_FACE: readonly number[] = [0, 0, 0, 1, 1, 2];

const LANE_SHIFT_BY_FACE: readonly number[] = [0, 0, 0, -1, -1, 1, 1, -2, 2];

export const MAX_EXTRA_ROWS = Math.max(...EXTRA_ROWS_BY_FACE);

export const MAX_LANE_SHIFT = Math.max(
  ...LANE_SHIFT_BY_FACE.map((shift) => Math.abs(shift)),
);

export const extraRowsFor = (face: number): number =>
  EXTRA_ROWS_BY_FACE[face - 1] ?? 0;

export const laneShiftFor = (face: number): number =>
  LANE_SHIFT_BY_FACE[face - 1] ?? 0;

export const isGentleRide = (rides: number): boolean => rides < GENTLE_RIDES;

export const farRimRowFor = (map: MapGraph, hole: NodeId): number | null => {
  const spot = spotOf(map, hole);
  return spot === undefined ? null : spot.rows[1] + 1;
};

export const openLandings = (
  map: MapGraph,
  from: NodeId,
  visited: readonly NodeId[],
): MapNode[] => {
  const cleared = new Set(visited);
  const reach = new Set(map.bossReach);
  return map.nodes.filter(
    (node) =>
      node.id !== from &&
      node.hole !== true &&
      node.pocket !== true &&
      node.row !== map.shape.bossRow &&
      !cleared.has(node.id) &&
      reach.has(node.id),
  );
};

const landingFrom = (
  open: readonly MapNode[],
  row: number,
  lane: number,
): MapNode | undefined =>
  nearestInLane(
    open.filter((node) => node.row === row),
    lane,
  );

export const rollThrow = (
  request: ThrowRequest,
  source: ThrowSource,
): WormholeThrow => {
  const { map, from, hole, visited, rides } = request;
  const gentle = isGentleRide(rides);
  const extra = gentle ? 0 : extraRowsFor(source.int(1, EXTRA_ROWS_FACES));
  const laneShift = gentle
    ? 0
    : laneShiftFor(source.int(1, LANE_SHIFT_FACES));
  const origin = nodeById(map).get(from);
  const base = farRimRowFor(map, hole);

  const settle = (
    landing: MapNode | undefined,
    fallback: ThrowFallback,
  ): WormholeThrow => ({
    from,
    hole,
    landing: landing?.id ?? null,
    extra,
    laneShift,
    direction: "forward",
    rows:
      landing === undefined || origin === undefined
        ? 0
        : landing.row - origin.row,
    gentle,
    fallback: landing === undefined ? "stalled" : fallback,
  });

  if (origin === undefined || base === null) return settle(undefined, "stalled");
  const open = openLandings(map, from, visited);
  const target = base + extra;
  const lane = origin.lane + laneShift;
  const aimed = landingFrom(open, target, lane);
  if (aimed !== undefined) return settle(aimed, "none");
  for (let row = target - 1; row >= base; row -= 1) {
    const nearer = landingFrom(open, row, lane);
    if (nearer !== undefined) return settle(nearer, "nearest");
  }
  for (let row = target + 1; row < map.shape.bossRow; row += 1) {
    const further = landingFrom(open, row, lane);
    if (further !== undefined) return settle(further, "nearest");
  }
  return settle(undefined, "stalled");
};

const STILL_SOURCE: ThrowSource = { int: (min) => min };

export const softLandThrow = (
  map: MapGraph,
  from: NodeId,
  hole: NodeId,
  visited: readonly NodeId[],
): WormholeThrow =>
  rollThrow({ map, from, hole, visited, rides: 0 }, STILL_SOURCE);

export const bypassTargetFor = (
  map: MapGraph,
  from: NodeId,
  hole: NodeId,
  visited: readonly NodeId[],
): NodeId | null => {
  const cleared = new Set(visited);
  const byId = nodeById(map);
  const legal = (id: NodeId): boolean =>
    !cleared.has(id) && byId.get(id)?.hole !== true;
  const declared = wormholeFor(map, from, hole)?.bypass;
  if (declared !== undefined && legal(declared)) return declared;
  const origin = byId.get(from);
  const base = farRimRowFor(map, hole);
  if (origin === undefined || base === null) return null;
  const rim = map.nodes.filter(
    (node) => node.row === base && node.pocket !== true && legal(node.id),
  );
  return nearestInLane(rim, origin.lane)?.id ?? null;
};

export const canBypass = (
  map: MapGraph,
  from: NodeId,
  hole: NodeId,
  visited: readonly NodeId[],
): boolean =>
  wormholeFor(map, from, hole) !== undefined &&
  bypassTargetFor(map, from, hole, visited) !== null;
