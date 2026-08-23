import { sectorDef } from "../../src/data/sectors";
import {
  edgeKey,
  edgeMarkFor,
  outgoingEdges,
  type MapGraph,
  type MapNode,
  type NodeType,
} from "../../src/game/map/types";
import { isGentleRide } from "../../src/game/map/wormhole";
import {
  INTERFERENCE_STREAK_THRESHOLD,
  interferenceStacksForStreak,
} from "../../src/game/run/interference";

export const PATH_PRIORITY: readonly NodeType[] = [
  "shipyard",
  "shop",
  "event",
  "anomaly",
  "beacon",
  "battle",
  "elite",
  "miniboss",
  "boss",
  "start",
];

export const priorityOf = (type: NodeType): number => {
  const index = PATH_PRIORITY.indexOf(type);
  return index < 0 ? PATH_PRIORITY.length : index;
};

export const POCKET_HULL_PCT = 60;
export const MINE_PENALTY = 0.5;
export const CURSED_PENALTY = 0.75;
export const BLESSED_BONUS = 0.25;
export const CACHE_BONUS = 0.4;
export const UNSTABLE_PENALTY = 0.6;
export const INVERTED_PENALTY = 0.8;
export const STORM_PENALTY = 0.8;
export const ANOMALY_STREAK_PULL = 1.2;
export const HOLE_PENALTY = 0.5;
export const HOLE_PULL = 0.3;
export const HOLE_GENTLE_PULL = 1.2;
export const RIDE_HULL_FLOOR_PCT = 25;
export const POCKET_BONUS = 0.35;
export const FIGHT_TYPES: ReadonlySet<NodeType> = new Set([
  "battle",
  "elite",
  "miniboss",
  "boss",
]);
export const EXPECTED_DMG_PER_FIGHT = 7;

export interface RouteState {
  hullPct: number;
  anomalyStreak: number;
  scrap: number;
  wormholeRides: number;
}

const causalityPenalty = (node: MapNode): number =>
  (node.unstable === true ? UNSTABLE_PENALTY : 0) +
  (node.inverted === true ? INVERTED_PENALTY : 0) +
  (node.storm === true ? STORM_PENALTY : 0);

const pocketPayoff = (
  map: MapGraph,
  byId: ReadonlyMap<string, MapNode>,
  node: MapNode,
): NodeType => {
  const rewardId = outgoingEdges(map, node.id)[0];
  const reward = rewardId === undefined ? undefined : byId.get(rewardId);
  return reward?.type ?? node.type;
};

export const anomalyPull = (state: RouteState): number =>
  state.anomalyStreak + 1 >= INTERFERENCE_STREAK_THRESHOLD
    ? ANOMALY_STREAK_PULL * (1 + interferenceStacksForStreak(state.anomalyStreak + 1))
    : 0;

export const holeStandIn = (
  map: MapGraph,
  byId: ReadonlyMap<string, MapNode>,
  from: string,
  node: MapNode,
): MapNode | undefined => {
  const record = map.wormholes[edgeKey(from, node.id)];
  return record === undefined ? undefined : byId.get(record.bypass);
};

export const holeBias = (state: RouteState): number => {
  if (isGentleRide(state.wormholeRides)) return -HOLE_GENTLE_PULL;
  return state.hullPct >= RIDE_HULL_FLOOR_PCT ? -HOLE_PULL : HOLE_PENALTY;
};

export const ridesWormhole = (state: RouteState, roll: number): boolean => {
  if (isGentleRide(state.wormholeRides)) return true;
  if (state.hullPct < RIDE_HULL_FLOOR_PCT) return false;
  return roll < state.hullPct / 100;
};

export const stepCost = (
  map: MapGraph,
  byId: ReadonlyMap<string, MapNode>,
  from: string,
  node: MapNode,
  state: RouteState,
): number => {
  if (node.hole === true) {
    const standIn = holeStandIn(map, byId, from, node);
    return standIn === undefined
      ? PATH_PRIORITY.length
      : stepCost(map, byId, from, standIn, state) + holeBias(state);
  }
  const payoff = node.pocket === true ? pocketPayoff(map, byId, node) : node.type;
  const base = priorityOf(payoff);
  const blessing =
    node.blessing === "cursed"
      ? CURSED_PENALTY
      : node.blessing === "blessed"
        ? -BLESSED_BONUS
        : 0;
  return (
    base +
    blessing +
    causalityPenalty(node) +
    (node.cache === true ? -CACHE_BONUS : 0) +
    (node.pocket === true ? -POCKET_BONUS : 0) +
    (payoff === "anomaly" ? -anomalyPull(state) : 0) +
    (edgeMarkFor(map, from, node.id) === "mine" ? MINE_PENALTY : 0)
  );
};

export const greedyNext = (
  map: MapGraph,
  byId: ReadonlyMap<string, MapNode>,
  position: string,
  posRow: number,
  state: RouteState,
): MapNode | undefined => {
  const forward = outgoingEdges(map, position)
    .map((id) => byId.get(id))
    .filter((n): n is MapNode => n !== undefined && n.row > posRow);
  const byCost = (a: MapNode, b: MapNode): number =>
    stepCost(map, byId, position, a, state) -
    stepCost(map, byId, position, b, state);
  const safe = forward.filter(
    (n) => n.pocket !== true || state.hullPct >= POCKET_HULL_PCT,
  );
  return [...(safe.length > 0 ? safe : forward)].sort(byCost)[0];
};

export const fightsUntilRest = (
  map: MapGraph,
  byId: ReadonlyMap<string, MapNode>,
  position: string,
  posRow: number,
  state: RouteState,
): number => {
  let cur = position;
  let row = posRow;
  let fights = 0;
  for (let guard = 0; guard < 40; guard += 1) {
    const step = greedyNext(map, byId, cur, row, state);
    const next =
      step?.hole === true ? holeStandIn(map, byId, cur, step) : step;
    if (next === undefined || next.type === "shipyard") break;
    if (FIGHT_TYPES.has(next.type)) fights += 1;
    if (next.type === "boss") break;
    cur = next.id;
    row = next.row;
  }
  return fights;
};

export const motifsOf = (sector: number) => sectorDef(sector).shape.motifs;
