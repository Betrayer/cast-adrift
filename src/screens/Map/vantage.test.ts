import { describe, expect, it } from "vitest";
import {
  nodeById,
  type MapGraph,
  type MapNode,
  type NodeId,
} from "@/game/map/types";
import {
  isLegalNode,
  isPreviewableNode,
  isVisibleNode,
  pathEdgesTo,
  type EdgePair,
  type MapVantage,
} from "./vantage";

const node = (
  row: number,
  lane: number,
  type: MapNode["type"],
  extra: Partial<MapNode> = {},
): MapNode => ({
  id: `r${String(row)}l${String(lane)}`,
  row,
  lane,
  type,
  ...extra,
});

const MAP: MapGraph = {
  nodes: [
    node(0, 1, "start"),
    node(1, 0, "battle"),
    node(1, 1, "battle"),
    node(2, 0, "event"),
    node(2, 1, "battle", { hole: true, spot: "s" }),
    node(3, 1, "battle", { hole: true, spot: "s" }),
    node(4, 1, "boss"),
  ],
  edges: [
    ["r0l1", "r1l0"],
    ["r0l1", "r1l1"],
    ["r1l0", "r2l0"],
    ["r1l1", "r2l0"],
    ["r1l1", "r2l1"],
    ["r2l1", "r3l1"],
    ["r2l0", "r4l1"],
    ["r3l1", "r4l1"],
  ],
  shape: { bossRow: 4, gateRow: 2, lanes: 2 },
  edgeMarks: {},
  wormholes: {},
  spots: [{ id: "s", nodes: ["r2l1", "r3l1"], rows: [2, 3], lanes: [1, 1] }],
  bossReach: [],
};

const BY_ID = nodeById(MAP);

const at = (id: NodeId): MapNode => {
  const found = BY_ID.get(id);
  if (found === undefined) throw new Error(`missing node ${id}`);
  return found;
};

const BASE: MapVantage = {
  map: MAP,
  position: "r0l1",
  positionRow: 0,
  visited: ["r0l1"],
  visibleLimit: 1,
  deliveryIds: new Set<NodeId>(),
  ghostRows: 1,
};

const visibleIdsOf = (v: MapVantage): ReadonlySet<NodeId> =>
  new Set(MAP.nodes.filter((n) => isVisibleNode(v, n)).map((n) => n.id));

const pathTo = (v: MapVantage, id: NodeId): readonly EdgePair[] =>
  pathEdgesTo(v, BY_ID, at(id), visibleIdsOf(v));

describe("what the map shows from where the ship stands", () => {
  it("shows the boss through the fog", () => {
    expect(isVisibleNode(BASE, at("r4l1"))).toBe(true);
  });

  it("shows a delivery node through the fog and nothing else past it", () => {
    expect(isVisibleNode(BASE, at("r2l0"))).toBe(false);
    expect(
      isVisibleNode({ ...BASE, deliveryIds: new Set(["r2l0"]) }, at("r2l0")),
    ).toBe(true);
  });

  it("allows a jump only along an edge to a fresh, visible node ahead", () => {
    expect(isLegalNode(BASE, at("r1l0"))).toBe(true);
    expect(isLegalNode(BASE, at("r0l1"))).toBe(false);
    expect(isLegalNode(BASE, at("r2l0"))).toBe(false);
  });

  it("previews a ghost-row node only through a legal node and only while Echo lends the row", () => {
    expect(isPreviewableNode({ ...BASE, visibleLimit: 2 }, at("r2l0"))).toBe(true);
    expect(
      isPreviewableNode({ ...BASE, visibleLimit: 2, ghostRows: 0 }, at("r2l0")),
    ).toBe(false);
    expect(isPreviewableNode(BASE, at("r2l0"))).toBe(false);
  });
});

describe("the path highlight's edges", () => {
  it("lists both hops through every legal intermediate for a ghost-row node", () => {
    const lifted: MapVantage = { ...BASE, visibleLimit: 2 };
    expect(pathTo(lifted, "r2l0")).toEqual([
      ["r0l1", "r1l0"],
      ["r1l0", "r2l0"],
      ["r0l1", "r1l1"],
      ["r1l1", "r2l0"],
    ]);
    expect(pathTo(lifted, "r1l0")).toEqual([["r0l1", "r1l0"]]);
    expect(pathTo(lifted, "r4l1")).toEqual([]);
  });

  it("drops the hop that runs inside a spot", () => {
    const inBand: MapVantage = {
      ...BASE,
      position: "r1l1",
      positionRow: 1,
      visited: ["r0l1", "r1l1"],
      visibleLimit: 3,
      ghostRows: 1,
    };
    expect(isPreviewableNode(inBand, at("r3l1"))).toBe(true);
    expect(pathTo(inBand, "r3l1")).toEqual([["r1l1", "r2l1"]]);
  });
});
