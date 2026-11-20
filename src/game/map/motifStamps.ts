import type { SectorMotif, SectorShape } from "@/data/sectors";
import type { RngStream } from "@/services/rng";
import {
  edgeKey,
  START_ROW,
  type EdgeMark,
  type MapNode,
  type NodeId,
  type NodeType,
} from "@/game/map/types";

const applyCache = (
  nodes: MapNode[],
  rng: RngStream,
  motif: Extract<SectorMotif, { m: "cache" }>,
): void => {
  const pool = rng
    .shuffle(
      nodes.filter(
        (node) =>
          node.type === "battle" && node.hole !== true && node.row > 1,
      ),
    )
    .slice(0, motif.count);
  for (const node of pool) node.cache = true;
};

const PROCESSION_PERIOD = 2;

const applyProcession = (
  nodes: MapNode[],
  rng: RngStream,
  shape: SectorShape,
): void => {
  const offset = rng.int(0, shape.lanes - 1);
  const phase = rng.int(0, PROCESSION_PERIOD - 1);
  for (const node of nodes) {
    if (node.row === START_ROW || node.row === shape.bossRow) continue;
    if (node.row === shape.gateRow) continue;
    if (node.hole === true) continue;
    if (node.row % PROCESSION_PERIOD !== phase) continue;
    if (node.lane === (node.row + offset) % shape.lanes) {
      node.blessing = "blessed";
    } else if (node.lane === (node.row + offset + 2) % shape.lanes) {
      node.blessing = "cursed";
    }
  }
};

const COLLAPSIBLE: readonly NodeType[] = ["event", "anomaly"];

const applyCollapse = (
  nodes: MapNode[],
  rng: RngStream,
  shape: SectorShape,
  motif: Extract<SectorMotif, { m: "collapse" }>,
  band: ReadonlySet<number>,
): void => {
  const rows = rng
    .shuffle(
      Array.from({ length: shape.bossRow - 3 }, (_, i) => i + 2).filter(
        (row) => row !== shape.gateRow && !band.has(row),
      ),
    )
    .slice(0, motif.rows);
  for (const node of nodes) {
    if (rows.includes(node.row)) node.unstable = true;
  }
  const remaining = new Map<NodeType, number>();
  for (const node of nodes) {
    remaining.set(node.type, (remaining.get(node.type) ?? 0) + 1);
  }
  let budget = motif.rows;
  for (const node of rng.shuffle(nodes)) {
    if (budget <= 0) break;
    if (node.unstable !== true) continue;
    if (!COLLAPSIBLE.includes(node.type)) continue;
    if ((remaining.get(node.type) ?? 0) <= 1) continue;
    if (rng.next() >= motif.chance) continue;
    remaining.set(node.type, (remaining.get(node.type) ?? 1) - 1);
    node.type = "battle";
    budget -= 1;
  }
};

const causalityRows = (
  rng: RngStream,
  shape: SectorShape,
  count: number,
  taken: ReadonlySet<number>,
): number[] =>
  rng
    .shuffle(
      Array.from({ length: shape.bossRow - 2 }, (_, i) => i + 2).filter(
        (row) => row !== shape.gateRow && !taken.has(row),
      ),
    )
    .slice(0, count);

const markedRows = (
  nodes: readonly MapNode[],
  key: "inverted" | "storm",
): Set<number> => {
  const out = new Set<number>();
  for (const node of nodes) {
    if (node[key] === true) out.add(node.row);
  }
  return out;
};

const applyCausality = (
  nodes: MapNode[],
  rng: RngStream,
  shape: SectorShape,
  count: number,
  key: "inverted" | "storm",
  taken: ReadonlySet<number>,
): void => {
  const rows = causalityRows(rng, shape, count, taken);
  for (const node of nodes) {
    if (rows.includes(node.row)) node[key] = true;
  }
};

const applyMineEdges = (
  edges: readonly [NodeId, NodeId][],
  byId: ReadonlyMap<NodeId, MapNode>,
  rng: RngStream,
  motif: Extract<SectorMotif, { m: "mineEdges" }>,
  shape: SectorShape,
): Record<string, EdgeMark> => {
  const marks: Record<string, EdgeMark> = {};
  const freeExits = new Map<NodeId, number>();
  for (const [from, to] of edges) {
    if (byId.get(to)?.hole === true) continue;
    freeExits.set(from, (freeExits.get(from) ?? 0) + 1);
  }
  const crossing = edges.filter(([a, b]) => {
    const na = byId.get(a);
    const nb = byId.get(b);
    return (
      na !== undefined &&
      nb !== undefined &&
      na.hole !== true &&
      nb.hole !== true &&
      na.lane !== nb.lane &&
      nb.row !== shape.gateRow &&
      nb.row !== shape.bossRow
    );
  });
  let placed = 0;
  for (const [a, b] of rng.shuffle(crossing)) {
    if (placed >= motif.count) break;
    if ((freeExits.get(a) ?? 0) <= 1) continue;
    marks[edgeKey(a, b)] = "mine";
    freeExits.set(a, (freeExits.get(a) ?? 1) - 1);
    placed += 1;
  }
  return marks;
};

export const applyMotifs = (
  nodes: MapNode[],
  edges: readonly [NodeId, NodeId][],
  rng: RngStream,
  shape: SectorShape,
  band: ReadonlySet<number>,
): Record<string, EdgeMark> => {
  let marks: Record<string, EdgeMark> = {};
  const byId = new Map(nodes.map((node) => [node.id, node]));
  for (const motif of shape.motifs) {
    switch (motif.m) {
      case "cache":
        applyCache(nodes, rng, motif);
        break;
      case "procession":
        applyProcession(nodes, rng, shape);
        break;
      case "collapse":
        applyCollapse(nodes, rng, shape, motif, band);
        break;
      case "mineEdges":
        marks = {
          ...marks,
          ...applyMineEdges(edges, byId, rng, motif, shape),
        };
        break;
      case "inversion":
        applyCausality(nodes, rng, shape, motif.rows, "inverted", band);
        break;
      case "storm":
        applyCausality(
          nodes,
          rng,
          shape,
          motif.rows,
          "storm",
          new Set([...band, ...markedRows(nodes, "inverted")]),
        );
        break;
      case "blackHoles":
      case "riftSplit":
        break;
    }
  }
  return marks;
};
