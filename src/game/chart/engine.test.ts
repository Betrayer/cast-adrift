import { describe, expect, it } from "vitest";
import {
  CHART_NODES,
  CHART_NODE_BY_ID,
  chartNeighbors,
  isEntryNode,
} from "@/data/chart";
import { chartNodeCost } from "@/game/chart/cost";
import {
  canAllocate,
  canDeallocate,
  hubBudgetBonus,
  isAllocatable,
  isOverBudget,
  pathTo,
  pointsAvailable,
  pointsSpent,
  pointsTotal,
  respecCost,
  RESPEC_SHARD_COST,
} from "@/game/chart/engine";

describe("chart data", () => {
  it("has exactly 240 nodes, 24 minors, 32 notables, 8 keystones", () => {
    expect(CHART_NODES.length).toBe(240);
    expect(CHART_NODES.filter((n) => n.kind === "minor").length).toBe(24);
    expect(CHART_NODES.filter((n) => n.kind === "notable").length).toBe(32);
    expect(CHART_NODES.filter((n) => n.kind === "keystone").length).toBe(8);
  });

  it("draws at least 100 distinct small payloads", () => {
    const key = (n: (typeof CHART_NODES)[number]): string =>
      JSON.stringify([n.mods ?? null, n.effects ?? null, n.traits ?? null, n.fx ?? null]);
    const smalls = CHART_NODES.filter((n) => n.kind === "small");
    expect(new Set(smalls.map(key)).size).toBeGreaterThanOrEqual(100);
  });

  it("never joins two nodes that carry the same payload", () => {
    const key = (n: (typeof CHART_NODES)[number]): string =>
      JSON.stringify([n.mods ?? null, n.effects ?? null, n.traits ?? null, n.fx ?? null]);
    for (const node of CHART_NODES) {
      for (const other of chartNeighbors(node.id)) {
        const neighbour = CHART_NODE_BY_ID.get(other);
        if (neighbour === undefined) continue;
        expect(key(neighbour), `${node.id} ~ ${other}`).not.toBe(key(node));
      }
    }
  });

  it("has no no-op node", () => {
    const noop = CHART_NODES.filter(
      (n) =>
        n.effects === undefined &&
        n.mods === undefined &&
        n.traits === undefined &&
        n.hubBudget !== true &&
        n.budgetDelta === undefined &&
        n.slotTierDelta === undefined,
    );
    expect(noop).toEqual([]);
  });

  it("all links resolve to real nodes", () => {
    for (const node of CHART_NODES) {
      for (const link of node.links) {
        expect(CHART_NODE_BY_ID.has(link)).toBe(true);
      }
    }
  });

  it("has one door per line: seven gates and the hub core", () => {
    const entries = CHART_NODES.filter((n) => n.entry === true).map((n) => n.id);
    expect(entries).toHaveLength(8);
    expect(entries).toContain("hub-i0");
    const schools = ["red", "blue", "green", "yellow", "black", "grey", "prismatic"];
    for (const school of schools) expect(entries).toContain(`${school}-gate`);
  });
});

describe("chart allocation engine", () => {
  it("entry nodes are allocatable from empty; non-entry require an allocated neighbor", () => {
    expect(isAllocatable("red-gate", [])).toBe(true);
    expect(isAllocatable("red-s1", [])).toBe(false);
    expect(isAllocatable("red-s1", ["red-gate"])).toBe(true);
  });

  it("adjacency gate: cannot allocate a node not adjacent to any pick", () => {
    const far = CHART_NODES.find(
      (n) =>
        n.entry !== true &&
        n.constellation === "black" &&
        !chartNeighbors(n.id).includes("red-gate"),
    );
    expect(far).toBeDefined();
    if (far !== undefined) expect(isAllocatable(far.id, ["red-gate"])).toBe(false);
  });

  it("points accounting: available = level - the real cost of the picks", () => {
    expect(pointsAvailable(5, [])).toBe(5);
    expect(pointsSpent(["red-gate", "red-min1"])).toBe(4);
    expect(pointsAvailable(6, ["red-gate", "red-min1"])).toBe(2);
    expect(canAllocate("red-gate", 2, [])).toBe(true);
    expect(canAllocate("red-gate", 1, [])).toBe(false);
    expect(canAllocate("hub-i0", 1, [])).toBe(true);
  });

  it("refuses a node the remaining points cannot cover", () => {
    const owned = ["red-gate", "red-min1", "red-not1", "red-min2"];
    expect(pointsSpent(owned)).toBe(8);
    expect(chartNodeCost("red-not2")).toBe(3);
    expect(canAllocate("red-not2", 10, owned)).toBe(false);
    expect(canAllocate("red-not2", 11, owned)).toBe(true);
    expect(isAllocatable("red-not2", owned)).toBe(true);
  });

  it("flags a profile whose picks now cost more than its pool", () => {
    const owned = ["red-gate", "red-min1", "red-not1"];
    expect(pointsSpent(owned)).toBe(6);
    expect(isOverBudget(6, owned)).toBe(false);
    expect(isOverBudget(5, owned)).toBe(true);
    expect(pointsAvailable(5, owned)).toBe(-1);
  });

  it("orphan guard: removing a cut vertex is forbidden, a leaf is allowed", () => {
    expect(chartNeighbors("red-s1")).toContain("red-gate");
    expect(chartNeighbors("red-s3")).toContain("red-s1");
    const picks = ["red-gate", "red-s1", "red-s3"];
    expect(canDeallocate("red-s3", picks)).toBe(true);
    expect(canDeallocate("red-s1", picks)).toBe(false);
    expect(canDeallocate("red-gate", picks)).toBe(false);
  });

  it("prices the cheapest path to a node the player does not own", () => {
    expect(pathTo("red-gate", [])).toEqual({ ids: ["red-gate"], cost: 2 });
    const two = pathTo("red-s1", []);
    expect(two?.cost).toBe(3);
    expect(two?.ids).toEqual(["red-gate", "red-s1"]);
    expect(pathTo("red-s1", ["red-gate", "red-s1"])).toEqual({ ids: [], cost: 0 });
    expect(pathTo("red-s1", ["red-gate"])).toEqual({ ids: ["red-s1"], cost: 1 });
    expect(pathTo("__nosuchnode__", [])).toBeNull();
  });

  it("sums real costs, not hops, and routes around the dear nodes", () => {
    const spine = pathTo("red-not4", []);
    expect(spine?.ids.length).toBe(9);
    expect(spine?.cost).toBe(25);
    const key = pathTo("red-key1", []);
    expect(key?.ids.length).toBe(13);
    expect(key?.cost).toBe(31);
    expect(key?.ids).not.toContain("red-min1");
    expect(pathTo("hub-o12", [])?.cost).toBe(5);
  });

  it("reaches every keystone inside the L50 pool, three of them together", () => {
    expect(pathTo("prismatic-key1", [])?.cost).toBe(8);
    expect(pathTo("prismatic-key2", [])?.cost).toBe(9);
    const first = pathTo("prismatic-key1", [])?.ids ?? [];
    const second = pathTo("prismatic-key2", first)?.ids ?? [];
    const pair = [...first, ...second];
    expect(pointsSpent(pair)).toBe(15);
    const third = pathTo("red-key1", pair)?.ids ?? [];
    expect(pointsSpent([...pair, ...third])).toBe(46);
    expect(pointsTotal(50)).toBe(52);
  });

  it("charges the respec by the point, and nothing once L50 lands", () => {
    expect(respecCost(49, "red-s1")).toBe(RESPEC_SHARD_COST);
    expect(respecCost(49, "red-key1")).toBe(RESPEC_SHARD_COST * 5);
    expect(respecCost(50, "red-key1")).toBe(0);
  });

  it("adds the L35 milestone points to the chart pool", () => {
    expect(pointsAvailable(34, [])).toBe(34);
    expect(pointsAvailable(35, [])).toBe(37);
  });

  it("respec of a lone entry pick is allowed", () => {
    expect(canDeallocate("red-gate", ["red-gate"])).toBe(true);
    expect(isEntryNode("red-gate")).toBe(true);
  });

  it("hub budget notable grants +1", () => {
    expect(hubBudgetBonus([])).toBe(0);
    expect(hubBudgetBonus(["hub-o12"])).toBe(1);
  });
});
