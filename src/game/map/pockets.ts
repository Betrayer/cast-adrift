import { motifIn, type SectorShape } from "@/data/sectors";
import type { RngStream } from "@/services/rng";
import {
  edgeKey,
  nodeId,
  type EdgeMark,
  type MapNode,
  type NodeId,
} from "@/game/map/types";

const MAX_ANOMALY_TIER = 5;

const pocketTierWindow = (
  window: readonly [number, number],
): readonly [number, number] => [
  Math.min(MAX_ANOMALY_TIER, window[0] + 1),
  Math.min(MAX_ANOMALY_TIER, window[1] + 1),
];

const POCKET_DEPTH = 2;
const POCKET_SPAN = POCKET_DEPTH + 1;

export interface PocketBuild {
  nodes: MapNode[];
  edges: [NodeId, NodeId][];
  marks: Record<string, EdgeMark>;
}

export const buildPockets = (
  nodes: readonly MapNode[],
  rng: RngStream,
  shape: SectorShape,
  noShops: boolean,
  band: readonly [number, number] | null,
): PocketBuild => {
  const build: PocketBuild = { nodes: [], edges: [], marks: {} };
  const lane = shape.lanes;
  const count = rng.int(shape.pockets[0], shape.pockets[1]);
  const split = motifIn(shape, "riftSplit");
  const table = shape.pocketTable.filter(
    ([type]) => !noShops || type !== "shop",
  );
  const byRow = new Map<number, MapNode[]>();
  for (const node of nodes) {
    if (node.hole === true) continue;
    byRow.set(node.row, [...(byRow.get(node.row) ?? []), node]);
  }
  const usable = (row: number): boolean =>
    row >= 1 &&
    row + POCKET_SPAN <= shape.bossRow - 1 &&
    !(row < shape.gateRow && row + POCKET_SPAN >= shape.gateRow) &&
    (split === undefined || row + POCKET_SPAN < split.from || row > split.to) &&
    (band === null || row + POCKET_SPAN <= band[0] - 1 || row >= band[1] + 1);
  const taken: number[] = [];
  const rows = rng
    .shuffle(Array.from({ length: shape.bossRow }, (_, i) => i))
    .filter(usable);

  for (const row of rows) {
    if (build.nodes.length >= count * POCKET_DEPTH) break;
    if (taken.some((r) => Math.abs(r - row) < POCKET_SPAN)) continue;
    const entry = rng.shuffle(byRow.get(row) ?? [])[0];
    const rejoin = rng.shuffle(byRow.get(row + POCKET_SPAN) ?? [])[0];
    if (entry === undefined || rejoin === undefined) continue;
    taken.push(row);
    const fight: MapNode = {
      id: nodeId(row + 1, lane),
      row: row + 1,
      lane,
      type: "battle",
      pocket: true,
    };
    const rewardType = rng.weighted(table);
    const reward: MapNode = {
      id: nodeId(row + 2, lane),
      row: row + 2,
      lane,
      type: rewardType,
      pocket: true,
      ...(rewardType === "anomaly"
        ? { tierWindow: pocketTierWindow(shape.anomalyTiers) }
        : {}),
    };
    build.nodes.push(fight, reward);
    build.edges.push(
      [entry.id, fight.id],
      [fight.id, reward.id],
      [reward.id, rejoin.id],
    );
    build.marks[edgeKey(entry.id, fight.id)] = "pocket";
  }
  return build;
};
