import { describe, expect, it } from "vitest";
import {
  CHART_NODES,
  CHART_NODE_BY_ID,
  chartNeighbors,
  isEntryNode,
} from "@/data/chart";
import {
  canAllocate,
  canDeallocate,
  hubBudgetBonus,
  isAllocatable,
  pointsAvailable,
} from "@/game/chart/engine";

describe("chart data", () => {
  it("has exactly 220 nodes, 32 notables, 8 keystones", () => {
    expect(CHART_NODES.length).toBe(220);
    expect(CHART_NODES.filter((n) => n.kind === "notable").length).toBe(32);
    expect(CHART_NODES.filter((n) => n.kind === "keystone").length).toBe(8);
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

  it("has at least one entry node per gate + hub inner ring", () => {
    expect(CHART_NODES.filter((n) => n.entry === true).length).toBe(19);
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

  it("points accounting: available = level - picks.length", () => {
    expect(pointsAvailable(5, [])).toBe(5);
    expect(pointsAvailable(5, ["a", "b"])).toBe(3);
    expect(canAllocate("red-gate", 1, [])).toBe(true);
    expect(canAllocate("red-gate", 0, [])).toBe(false);
  });

  it("orphan guard: removing a cut vertex is forbidden, a leaf is allowed", () => {
    expect(chartNeighbors("red-s1")).toContain("red-gate");
    expect(chartNeighbors("red-s4")).toContain("red-s1");
    const picks = ["red-gate", "red-s1", "red-s4"];
    expect(canDeallocate("red-s4", picks)).toBe(true);
    expect(canDeallocate("red-s1", picks)).toBe(false);
    expect(canDeallocate("red-gate", picks)).toBe(false);
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
