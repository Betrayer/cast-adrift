import { describe, expect, it } from "vitest";
import {
  CHART_NODES,
  CHART_NODE_BY_ID,
  chartNeighbors,
  isEntryNode,
} from "@/data/chart";
import { chartCostOf, chartNodeCost, CORE_NODE_ID } from "@/game/chart/cost";
import {
  canAllocate,
  canDeallocate,
  chartPointsIn,
  chartResetCost,
  hubBudgetBonus,
  isAllocatable,
  isOverBudget,
  meetsRequirement,
  pathTo,
  pickedChain,
  pointsAvailable,
  pointsSpent,
  pointsTotal,
  requirementsHold,
  respecCost,
  RESPEC_SHARD_COST,
} from "@/game/chart/engine";

const CORE = [CORE_NODE_ID];

const payloadKey = (n: (typeof CHART_NODES)[number]): string =>
  JSON.stringify([
    n.mods ?? null,
    n.effects ?? null,
    n.traits ?? null,
    n.fx ?? null,
  ]);

describe("chart data", () => {
  it("has 246 nodes: 14 confluence, 7 nexus, 25 notables, 8 keystones", () => {
    expect(CHART_NODES.length).toBe(246);
    expect(CHART_NODES.filter((n) => n.kind === "confluence").length).toBe(14);
    expect(CHART_NODES.filter((n) => n.kind === "nexus").length).toBe(7);
    expect(CHART_NODES.filter((n) => n.kind === "notable").length).toBe(25);
    expect(CHART_NODES.filter((n) => n.kind === "keystone").length).toBe(8);
  });

  it("draws at least 100 distinct small payloads", () => {
    const smalls = CHART_NODES.filter((n) => n.kind === "small");
    expect(new Set(smalls.map(payloadKey)).size).toBeGreaterThanOrEqual(100);
  });

  it("never joins two nodes that carry the same payload", () => {
    for (const node of CHART_NODES) {
      for (const other of chartNeighbors(node.id)) {
        const neighbour = CHART_NODE_BY_ID.get(other);
        if (neighbour === undefined) continue;
        expect(payloadKey(neighbour), `${node.id} ~ ${other}`).not.toBe(
          payloadKey(node),
        );
      }
    }
  });

  it("never repeats a payload twice inside one branch", () => {
    const branches = new Map<string, Map<string, string>>();
    for (const node of CHART_NODES) {
      if (node.kind !== "small" || node.constellation === "hub") continue;
      const seen = branches.get(node.constellation) ?? new Map<string, string>();
      const key = payloadKey(node);
      expect(seen.get(key), `${node.id} repeats`).toBeUndefined();
      seen.set(key, node.id);
      branches.set(node.constellation, seen);
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
        expect(CHART_NODE_BY_ID.has(link), `${node.id} -> ${link}`).toBe(true);
      }
    }
  });

  it("opens one door, and it is the core", () => {
    const entries = CHART_NODES.filter((n) => n.entry === true).map((n) => n.id);
    expect(entries).toEqual([CORE_NODE_ID]);
    for (const school of ["red", "blue", "green", "yellow", "black", "grey"]) {
      expect(entries).not.toContain(`${school}-gate`);
    }
  });
});

describe("chart allocation engine", () => {
  it("opens from the core alone, and every gate is walked to", () => {
    expect(isAllocatable(CORE_NODE_ID, [])).toBe(true);
    expect(isAllocatable("red-gate", [])).toBe(false);
    expect(isAllocatable("red-s1", CORE)).toBe(false);
    const toGate = pathTo("red-gate", CORE);
    expect(toGate).not.toBeNull();
    expect(toGate?.ids[toGate.ids.length - 1]).toBe("red-gate");
  });

  it("adjacency gate: cannot allocate a node not adjacent to any pick", () => {
    const far = CHART_NODES.find(
      (n) =>
        n.constellation === "black" &&
        !chartNeighbors(n.id).includes("red-gate"),
    );
    expect(far).toBeDefined();
    if (far !== undefined) {
      expect(isAllocatable(far.id, ["red-gate"])).toBe(false);
    }
  });

  it("gives the core away for nothing and charges two levels a point", () => {
    expect(chartNodeCost(CORE_NODE_ID)).toBe(0);
    expect(pointsSpent(CORE)).toBe(0);
    expect(pointsTotal(1)).toBe(2);
    expect(pointsAvailable(5, CORE)).toBe(10);
    expect(canAllocate(CORE_NODE_ID, 1, [])).toBe(true);
  });

  it("points accounting: available = the pool minus the real cost", () => {
    const owned = [...CORE, "hub-i1", "hub-i2"];
    expect(pointsSpent(owned)).toBe(2);
    expect(pointsAvailable(3, owned)).toBe(4);
  });

  it("refuses a node the remaining points cannot cover", () => {
    const owned = [...CORE, "hub-i1"];
    expect(chartNodeCost("hub-i2")).toBe(1);
    expect(canAllocate("hub-i2", 1, owned)).toBe(true);
    expect(canAllocate("hub-i2", 0, [...owned, "hub-i2", "hub-i3"])).toBe(false);
  });

  it("flags a profile whose picks now cost more than its pool", () => {
    const owned = [...CORE, "hub-i1", "hub-i2", "hub-i3"];
    expect(pointsSpent(owned)).toBe(3);
    expect(isOverBudget(2, owned)).toBe(false);
    expect(isOverBudget(1, owned)).toBe(true);
    expect(pointsAvailable(1, owned)).toBe(-1);
  });

  it("orphan guard: removing a cut vertex is forbidden, a leaf is allowed", () => {
    const picks = [...CORE, "hub-i1", "hub-i2"];
    expect(canDeallocate("hub-i2", picks)).toBe(true);
    expect(canDeallocate("hub-i1", picks)).toBe(false);
  });

  it("counts a school's investment from its own constellation only", () => {
    expect(chartPointsIn([...CORE, "hub-i1"], "red")).toBe(0);
    const red = ["red-gate", "red-s1", "red-s2"];
    expect(chartPointsIn(red, "red")).toBe(chartCostOf(red));
    expect(chartPointsIn(["nexus-red-blue"], "red")).toBe(0);
  });

  it("keeps a keystone shut until the branch is 45 points deep", () => {
    const keystone = CHART_NODE_BY_ID.get("red-key1");
    expect(keystone).toBeDefined();
    if (keystone === undefined) return;
    expect(keystone.requires?.pointsIn.red).toBe(45);
    expect(meetsRequirement(keystone, ["red-gate"])).toBe(false);
    const deep = CHART_NODES.filter((n) => n.constellation === "red").map(
      (n) => n.id,
    );
    expect(meetsRequirement(keystone, deep)).toBe(true);
  });

  it("keeps a nexus shut until both of its schools are 12 deep", () => {
    const nexus = CHART_NODE_BY_ID.get("nexus-red-blue");
    expect(nexus).toBeDefined();
    if (nexus === undefined) return;
    expect(nexus.requires?.pointsIn).toEqual({ red: 12, blue: 12 });
    const redOnly = CHART_NODES.filter((n) => n.constellation === "red").map(
      (n) => n.id,
    );
    expect(meetsRequirement(nexus, redOnly)).toBe(false);
    const both = [
      ...redOnly,
      ...CHART_NODES.filter((n) => n.constellation === "blue").map((n) => n.id),
    ];
    expect(meetsRequirement(nexus, both)).toBe(true);
  });

  it("prices the cheapest path to a node the player does not own", () => {
    expect(pathTo(CORE_NODE_ID, [])).toEqual({ ids: [CORE_NODE_ID], cost: 0 });
    expect(pathTo(CORE_NODE_ID, CORE)).toEqual({ ids: [], cost: 0 });
    expect(pathTo("__nosuchnode__", [])).toBeNull();
    const gate = pathTo("red-gate", CORE);
    expect(gate?.cost).toBeGreaterThan(0);
  });

  it("sums real costs, not hops, and never routes through a shut keystone", () => {
    const key = pathTo("red-key1", CORE);
    expect(key).not.toBeNull();
    expect(key?.ids).toContain("red-gate");
    expect(key?.cost).toBeGreaterThan(chartNodeCost("red-key1"));
  });

  it("charges the respec by the point, at every level", () => {
    expect(respecCost("hub-i1")).toBe(RESPEC_SHARD_COST);
    expect(respecCost("red-key1")).toBe(RESPEC_SHARD_COST * 6);
    expect(respecCost(CORE_NODE_ID)).toBe(0);
  });

  it("halves the full reset at L50 and not before", () => {
    const picks = [...CORE, "hub-i1", "hub-i2", "hub-i3", "hub-i4"];
    expect(chartResetCost(49, picks)).toBe(chartResetCost(1, picks));
    expect(chartResetCost(50, picks)).toBe(
      Math.round(chartResetCost(49, picks) / 2),
    );
  });

  it("adds the milestone grants to the chart pool", () => {
    expect(pointsTotal(9)).toBe(18);
    expect(pointsTotal(10)).toBe(22);
    expect(pointsTotal(20)).toBe(45);
    expect(pointsTotal(35)).toBe(79);
    expect(pointsTotal(50)).toBe(115);
  });

  it("respec of a lone core pick is allowed", () => {
    expect(canDeallocate(CORE_NODE_ID, CORE)).toBe(true);
    expect(isEntryNode(CORE_NODE_ID)).toBe(true);
  });

  it("hub budget notable grants +1", () => {
    expect(hubBudgetBonus([])).toBe(0);
    expect(hubBudgetBonus(["hub-o12"])).toBe(1);
  });
});

const walkTo = (targets: readonly string[], start: readonly string[]): string[] => {
  let picks = [...start];
  for (const target of targets) {
    for (const id of pathTo(target, picks)?.ids ?? []) {
      expect(isAllocatable(id, picks), `${target} via ${id}`).toBe(true);
      picks = [...picks, id];
    }
  }
  return picks;
};

const refundWhileAllowed = (
  picks: readonly string[],
  candidates: readonly string[],
): string[] => {
  let rest = [...picks];
  for (let refunded = true; refunded; ) {
    refunded = false;
    for (const id of candidates) {
      if (!rest.includes(id) || !canDeallocate(id, rest)) continue;
      rest = rest.filter((pick) => pick !== id);
      refunded = true;
    }
  }
  return rest;
};

const schoolIds = (school: string): string[] =>
  CHART_NODES.filter(
    (n) => n.constellation === school && n.kind !== "keystone",
  ).map((n) => n.id);

describe("the path preview only walks nodes that could open", () => {
  it("routes around a nexus whose second school is empty", () => {
    const picks = walkTo(["red-not3"], CORE);
    expect(chartPointsIn(picks, "blue")).toBe(0);
    expect(isAllocatable("nexus-red-blue", picks)).toBe(false);
    const route = pathTo("blue-not3", picks);
    expect(route?.ids).not.toContain("nexus-red-blue");
    expect(route?.ids).toContain("blue-gate");
    expect(route?.cost).toBe(24);
  });

  it("still prices a shut target, whose requirement the card prints", () => {
    const route = pathTo("nexus-red-blue", walkTo(["red-not3"], CORE));
    expect(route?.ids).toEqual(["nexus-red-blue"]);
    expect(route?.cost).toBe(chartNodeCost("nexus-red-blue"));
  });

  it("never offers a route through a locked node, from any single line", () => {
    for (const school of ["red", "blue", "green", "yellow", "black", "grey", "prismatic"]) {
      const picks = walkTo([`${school}-not3`], CORE);
      for (const node of CHART_NODES) {
        const route = pathTo(node.id, picks);
        if (route === null) continue;
        let walked = [...picks];
        for (const id of route.ids.slice(0, -1)) {
          expect(isAllocatable(id, walked), `${school} -> ${node.id} via ${id}`).toBe(
            true,
          );
          walked = [...walked, id];
        }
      }
    }
  });
});

describe("a refund may not break a held requirement", () => {
  it("keeps a held keystone's branch 45 deep without counting the keystone", () => {
    const red = schoolIds("red");
    const picks = [...new Set([...walkTo(["red-gate"], CORE), ...red])];
    expect(isAllocatable("red-key1", picks)).toBe(true);
    const held = [...picks, "red-key1"];
    const rest = refundWhileAllowed(held, red);
    expect(rest).toContain("red-key1");
    expect(
      chartPointsIn(
        rest.filter((id) => id !== "red-key1"),
        "red",
      ),
    ).toBeGreaterThanOrEqual(45);
    expect(canDeallocate("red-key1", rest)).toBe(true);
  });

  it("keeps both schools of a held nexus 12 deep", () => {
    const picks = walkTo(["red-not3", "blue-not3"], CORE);
    expect(isAllocatable("nexus-red-blue", picks)).toBe(true);
    const held = [...picks, "nexus-red-blue"];
    const rest = refundWhileAllowed(held, schoolIds("blue"));
    expect(rest).toContain("nexus-red-blue");
    expect(chartPointsIn(rest, "blue")).toBeGreaterThanOrEqual(12);
    expect(
      requirementsHold(rest.filter((id) => id !== "nexus-red-blue")),
    ).toBe(true);
  });

  it("does not freeze a profile that already holds a lapsed nexus", () => {
    const legacy = [...walkTo(["red-not3"], CORE), "hub-i1", "nexus-red-blue"];
    expect(requirementsHold(legacy)).toBe(false);
    expect(canDeallocate("hub-i1", legacy)).toBe(true);
    expect(canDeallocate("nexus-red-blue", legacy)).toBe(true);
    expect(canDeallocate("red-not3", legacy)).toBe(false);
  });

  it("never lets a pair of keystones hold each other up", () => {
    const prism: string[] = [];
    for (const id of schoolIds("prismatic")) {
      if (chartCostOf(prism) >= 40) break;
      prism.push(id);
    }
    const pair = [...prism, "prismatic-key1", "prismatic-key2"];
    expect(chartPointsIn(pair, "prismatic")).toBeGreaterThanOrEqual(45);
    expect(requirementsHold(pair)).toBe(false);
    const deep = [...schoolIds("prismatic"), "prismatic-key1", "prismatic-key2"];
    expect(requirementsHold(deep)).toBe(true);
  });
});

describe("the chain a new pick lights up", () => {
  it("walks from the core through the picks to the new node", () => {
    const picks = ["hub-i0", "hub-i11", "hub-i10", "hub-i9", "hub-o12", "red-gate"];
    expect(pickedChain("red-s1", picks)).toEqual([...picks, "red-s1"]);
  });

  it("takes the shortest owned route when the ring offers two", () => {
    const picks = ["hub-i0", "hub-i1", "hub-i2", "hub-i11"];
    expect(pickedChain("hub-i2", picks)).toEqual(["hub-i0", "hub-i1", "hub-i2"]);
  });

  it("is empty when the node hangs off nothing the player owns", () => {
    expect(pickedChain("red-key1", ["hub-i0"])).toEqual([]);
    expect(pickedChain("red-s1", [])).toEqual([]);
  });
});
