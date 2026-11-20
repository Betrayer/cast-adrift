import type { SectorMotif, SectorShape } from "@/data/sectors";
import type { RngStream } from "@/services/rng";
import {
  byLaneThenId,
  edgeKey,
  nearestInLane,
  type EdgeMark,
  type HoleSpot,
  type MapNode,
  type NodeId,
  type SpotId,
  type WormholeEdge,
} from "@/game/map/types";

const BAND_DEPTH_SHALLOW = 2;
const BAND_DEPTH_DEEP = 3;

export const BAND_DEPTHS: readonly [number, number] = [
  BAND_DEPTH_SHALLOW,
  BAND_DEPTH_DEEP,
];
const BAND_GATE_MARGIN = 2;
const BAND_BOSS_MARGIN = 4;

export interface HoleBuild {
  marks: Record<string, EdgeMark>;
  wormholes: Record<string, WormholeEdge>;
  spots: HoleSpot[];
  rows: readonly [number, number] | null;
}

export const emptyHoleBuild = (): HoleBuild => ({
  marks: {},
  wormholes: {},
  spots: [],
  rows: null,
});

export const bandRowSet = (
  rows: readonly [number, number] | null,
): Set<number> => {
  const out = new Set<number>();
  if (rows === null) return out;
  for (let row = rows[0]; row <= rows[1]; row += 1) out.add(row);
  return out;
};

const spotIdFor = (seed: NodeId): SpotId => `spot:${seed}`;

export const bandWindowOf = (
  shape: Pick<SectorShape, "gateRow" | "bossRow">,
): readonly [number, number] => [
  shape.gateRow + BAND_GATE_MARGIN,
  shape.bossRow - BAND_BOSS_MARGIN,
];

export const carveBand = (
  nodes: readonly MapNode[],
  edges: readonly [NodeId, NodeId][],
  rng: RngStream,
  motif: Extract<SectorMotif, { m: "blackHoles" }>,
  shape: SectorShape,
): HoleBuild => {
  const build = emptyHoleBuild();
  const [lo, hi] = bandWindowOf(shape);
  const room = hi - lo + 1;
  const deep = rng.next() < motif.deepChance;
  const depth =
    deep && room >= BAND_DEPTH_DEEP ? BAND_DEPTH_DEEP : BAND_DEPTH_SHALLOW;
  if (room < depth) return build;
  const start = rng.int(lo, hi - depth + 1);
  const end = start + depth - 1;
  const members = nodes
    .filter((node) => node.row >= start && node.row <= end)
    .sort((a, b) => a.row - b.row || byLaneThenId(a, b));
  const first = members[0];
  if (first === undefined) return build;
  const spot = spotIdFor(first.id);
  for (const node of members) {
    node.hole = true;
    node.spot = spot;
  }
  build.spots.push({
    id: spot,
    nodes: members.map((node) => node.id),
    rows: [start, end],
    lanes: [0, shape.lanes - 1],
  });
  build.rows = [start, end];
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const farRim = nodes.filter((node) => node.row === end + 1);
  for (const [from, to] of edges) {
    const source = byId.get(from);
    if (byId.get(to)?.hole !== true || source === undefined) continue;
    if (source.hole === true) continue;
    const bypass = nearestInLane(farRim, source.lane);
    if (bypass === undefined) throw new Error(`${spot} has no far rim`);
    build.marks[edgeKey(from, to)] = "wormhole";
    build.wormholes[edgeKey(from, to)] = { from, hole: to, bypass: bypass.id };
  }
  return build;
};
