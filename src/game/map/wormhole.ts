import {
  edgeKey,
  nodeById,
  outgoingEdges,
  wormholeFor,
  type MapGraph,
  type MapNode,
  type NodeId,
} from "@/game/map/types";

export type ThrowDirection = "forward" | "backward";

export type ThrowFallback = "none" | "direction" | "nearest" | "stalled";

export interface ThrowSource {
  int: (min: number, max: number) => number;
  pick: <T>(arr: readonly T[]) => T;
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
  budget: number;
  direction: ThrowDirection;
  cost: number;
  rows: number;
  gentle: boolean;
  fallback: ThrowFallback;
}

export const GENTLE_RIDES = 2;
export const MAX_BUDGET = 5;
export const GENTLE_BUDGET = 2;
export const ROW_STEP_COST = 1;
export const LANE_STEP_COST = 0.5;

export const isGentleRide = (rides: number): boolean => rides < GENTLE_RIDES;

export const budgetCapFor = (rides: number): number =>
  isGentleRide(rides) ? GENTLE_BUDGET : MAX_BUDGET;

export const throwCost = (from: MapNode, to: MapNode): number =>
  Math.abs(to.row - from.row) * ROW_STEP_COST +
  Math.abs(to.lane - from.lane) * LANE_STEP_COST;

const byCostThenId = (
  origin: MapNode,
): ((a: MapNode, b: MapNode) => number) =>
  (a, b) =>
    throwCost(origin, a) - throwCost(origin, b) ||
    (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

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
      node.row !== map.shape.bossRow &&
      !cleared.has(node.id) &&
      reach.has(node.id),
  );
};

export const landingCandidates = (
  map: MapGraph,
  from: NodeId,
  visited: readonly NodeId[],
  budget: number,
  direction: ThrowDirection,
): MapNode[] => {
  const origin = nodeById(map).get(from);
  if (origin === undefined) return [];
  return openLandings(map, from, visited).filter((node) => {
    const delta = node.row - origin.row;
    if (direction === "forward" ? delta <= 0 : delta >= 0) return false;
    return throwCost(origin, node) <= budget;
  });
};

const flip = (direction: ThrowDirection): ThrowDirection =>
  direction === "forward" ? "backward" : "forward";

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
  const spare = outgoingEdges(map, from)
    .filter((id) => id !== hole && legal(id))
    .sort((a, b) => {
      const marked = (id: NodeId): number =>
        map.edgeMarks[edgeKey(from, id)] === undefined ? 0 : 1;
      return marked(a) - marked(b) || (a < b ? -1 : a > b ? 1 : 0);
    });
  return spare[0] ?? null;
};

export const rollThrow = (
  request: ThrowRequest,
  source: ThrowSource,
): WormholeThrow => {
  const { map, from, hole, visited, rides } = request;
  const gentle = isGentleRide(rides);
  const budget = source.int(1, budgetCapFor(rides));
  const direction: ThrowDirection = gentle
    ? "forward"
    : source.int(0, 1) === 0
      ? "forward"
      : "backward";
  const origin = nodeById(map).get(from);

  const settle = (
    landing: MapNode | undefined,
    fallback: ThrowFallback,
  ): WormholeThrow => ({
    from,
    hole,
    landing: landing?.id ?? null,
    budget,
    direction,
    cost:
      landing === undefined || origin === undefined
        ? 0
        : throwCost(origin, landing),
    rows:
      landing === undefined || origin === undefined
        ? 0
        : landing.row - origin.row,
    gentle,
    fallback: landing === undefined ? "stalled" : fallback,
  });

  if (origin === undefined) return settle(undefined, "stalled");

  const aimed = landingCandidates(map, from, visited, budget, direction);
  if (aimed.length > 0) return settle(source.pick(aimed), "none");

  const turned = landingCandidates(
    map,
    from,
    visited,
    budget,
    flip(direction),
  );
  if (turned.length > 0) return settle(source.pick(turned), "direction");

  const open = openLandings(map, from, visited);
  const ahead = open
    .filter((node) => node.row > origin.row)
    .sort(byCostThenId(origin));
  if (ahead.length > 0) return settle(ahead[0], "nearest");

  const anywhere = [...open].sort(byCostThenId(origin));
  return settle(anywhere[0], "nearest");
};
