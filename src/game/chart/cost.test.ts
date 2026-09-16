import { describe, expect, it } from "vitest";
import { CHART_NODES } from "@/data/chart";
import {
  branchDepth,
  chartCostOf,
  chartNodeCost,
  depthTier,
  KIND_SURCHARGE,
  MAX_NODE_COST,
  MIN_NODE_COST,
} from "@/game/chart/cost";

describe("branch depth", () => {
  it("puts every entry node at the head of its line", () => {
    for (const node of CHART_NODES) {
      if (node.entry !== true) continue;
      expect(branchDepth(node.id), node.id).toBe(0);
    }
  });

  it("walks the hub as a ring from its single core, not twelve doors", () => {
    expect(branchDepth("hub-i0")).toBe(0);
    expect(branchDepth("hub-i1")).toBe(1);
    expect(branchDepth("hub-i3")).toBe(3);
    expect(branchDepth("hub-i6")).toBe(6);
    expect(branchDepth("hub-o0")).toBe(1);
    expect(branchDepth("hub-o12")).toBe(4);
    const hub = CHART_NODES.filter((n) => n.constellation === "hub");
    expect(hub.filter((n) => n.entry === true)).toHaveLength(1);
    expect(Math.max(...hub.map((n) => branchDepth(n.id)))).toBe(7);
  });

  it("walks a school constellation from its gate to its keystone", () => {
    const walk: readonly [string, number][] = [
      ["red-gate", 0],
      ["red-s1", 1],
      ["red-min1", 1],
      ["red-not1", 2],
      ["red-min2", 3],
      ["red-not2", 4],
      ["red-min3", 5],
      ["red-not3", 6],
      ["red-min4", 7],
      ["red-not4", 8],
      ["red-s19", 9],
      ["red-s22", 10],
      ["red-key1", 12],
    ];
    for (const [id, depth] of walk) expect(branchDepth(id), id).toBe(depth);
  });

  it("keeps the prismatic line three deep", () => {
    expect(branchDepth("prismatic-gate")).toBe(0);
    expect(branchDepth("prismatic-not1")).toBe(1);
    expect(branchDepth("prismatic-not3")).toBe(2);
    expect(branchDepth("prismatic-key1")).toBe(3);
    expect(branchDepth("prismatic-key2")).toBe(3);
  });

  it("never leaves a node off its own line", () => {
    const named = new Set(CHART_NODES.map((n) => n.id));
    for (const id of named) {
      expect(Number.isInteger(branchDepth(id)), id).toBe(true);
    }
  });
});

describe("depth tiers", () => {
  it("charges one point for the first three steps, two to six, three beyond", () => {
    expect([0, 1, 2, 3].map(depthTier)).toEqual([1, 1, 1, 1]);
    expect([4, 5, 6].map(depthTier)).toEqual([2, 2, 2]);
    expect([7, 8, 11, 12, 40].map(depthTier)).toEqual([3, 3, 3, 3, 3]);
  });
});

describe("node cost", () => {
  it("is depth tier plus the big-node surcharge", () => {
    const fixtures: readonly [string, number][] = [
      ["hub-i0", 1],
      ["hub-i6", 2],
      ["hub-o0", 1],
      ["hub-o12", 3],
      ["red-gate", 2],
      ["red-s1", 1],
      ["red-min1", 2],
      ["red-not1", 2],
      ["red-min2", 2],
      ["red-not2", 3],
      ["red-min3", 3],
      ["red-not3", 3],
      ["red-min4", 4],
      ["red-not4", 4],
      ["red-s19", 3],
      ["red-key1", 5],
      ["prismatic-gate", 2],
      ["prismatic-not1", 2],
      ["prismatic-key1", 3],
      ["prismatic-key2", 3],
    ];
    for (const [id, cost] of fixtures) {
      expect(chartNodeCost(id), id).toBe(cost);
    }
  });

  it("recomputes every fixture from the formula it documents", () => {
    for (const node of CHART_NODES) {
      expect(chartNodeCost(node.id), node.id).toBe(
        depthTier(branchDepth(node.id)) + KIND_SURCHARGE[node.kind],
      );
    }
  });

  it("stays inside the 1-5 range on every node", () => {
    for (const node of CHART_NODES) {
      const cost = chartNodeCost(node.id);
      expect(cost, node.id).toBeGreaterThanOrEqual(MIN_NODE_COST);
      expect(cost, node.id).toBeLessThanOrEqual(MAX_NODE_COST);
    }
  });

  it("prices an unknown node at nothing", () => {
    expect(chartNodeCost("__nosuchnode__")).toBe(0);
    expect(chartCostOf([])).toBe(0);
  });

  it("prices the whole chart at 570 points across the documented spread", () => {
    expect(chartCostOf(CHART_NODES.map((n) => n.id))).toBe(570);
    const hist = new Map<number, number>();
    for (const node of CHART_NODES) {
      const cost = chartNodeCost(node.id);
      hist.set(cost, (hist.get(cost) ?? 0) + 1);
    }
    expect([...hist].sort((a, b) => a[0] - b[0])).toEqual([
      [1, 49],
      [2, 76],
      [3, 97],
      [4, 12],
      [5, 6],
    ]);
  });

  it("prices each line as a whole", () => {
    const totals = new Map<string, number>();
    for (const node of CHART_NODES) {
      totals.set(
        node.constellation,
        (totals.get(node.constellation) ?? 0) + chartNodeCost(node.id),
      );
    }
    expect(totals.get("hub")).toBe(49);
    expect(totals.get("red")).toBe(84);
    expect(totals.get("prismatic")).toBe(17);
    for (const school of ["red", "blue", "green", "yellow", "black", "grey"]) {
      expect(totals.get(school), school).toBe(84);
    }
  });
});
