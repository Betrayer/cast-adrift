import { describe, expect, it } from "vitest";
import { CHART_NODES, CHART_NODE_BY_ID, chartSpine } from "@/data/chart";
import {
  chartCostOf,
  chartNodeCost,
  CORE_NODE_ID,
  resetCost,
  smallTier,
} from "@/game/chart/cost";

const SCHOOLS = ["red", "blue", "green", "yellow", "black", "grey"] as const;

describe("the branch is one spine and its twigs", () => {
  it("gives every school thirty nodes, and prismatic thirty-one for its pair", () => {
    for (const school of SCHOOLS) {
      const nodes = CHART_NODES.filter((n) => n.constellation === school);
      expect(nodes, school).toHaveLength(30);
    }
    expect(
      CHART_NODES.filter((n) => n.constellation === "prismatic"),
    ).toHaveLength(31);
  });

  it("walks the spine from the gate to the keystone twelve deep", () => {
    for (const school of [...SCHOOLS, "prismatic"] as const) {
      const ids = chartSpine(school);
      expect(ids, school).toHaveLength(13);
      expect(ids[0], school).toBe(`${school}-gate`);
      expect(
        ids.map((id) => CHART_NODE_BY_ID.get(id)?.depth),
        school,
      ).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    }
  });

  it("puts three notables and two confluence nodes on every branch", () => {
    for (const school of [...SCHOOLS, "prismatic"] as const) {
      const nodes = CHART_NODES.filter((n) => n.constellation === school);
      expect(nodes.filter((n) => n.kind === "notable"), school).toHaveLength(3);
      expect(
        nodes.filter((n) => n.kind === "confluence"),
        school,
      ).toHaveLength(2);
      expect(nodes.filter((n) => n.kind === "small"), school).toHaveLength(23);
      expect(nodes.filter((n) => n.kind === "gate"), school).toHaveLength(1);
    }
  });

  it("opens exactly one door, and it is the core", () => {
    const entries = CHART_NODES.filter((n) => n.entry === true);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.id).toBe(CORE_NODE_ID);
  });
});

describe("small tiers", () => {
  it("bands the first three steps, then three, then three, then the rest", () => {
    expect([1, 2, 3].map(smallTier)).toEqual([1, 1, 1]);
    expect([4, 5, 6].map(smallTier)).toEqual([2, 2, 2]);
    expect([7, 8, 9].map(smallTier)).toEqual([3, 3, 3]);
    expect([10, 11, 12, 40].map(smallTier)).toEqual([4, 4, 4, 4]);
  });
});

describe("node cost", () => {
  it("prices by kind and by how far down the spine it sits", () => {
    const fixtures: readonly [string, number][] = [
      [CORE_NODE_ID, 0],
      ["hub-i6", 1],
      ["hub-o0", 1],
      ["hub-o12", 2],
      ["red-gate", 2],
      ["red-s1", 1],
      ["red-not1", 2],
      ["red-not2", 3],
      ["red-not3", 4],
      ["red-c1", 3],
      ["red-c2", 4],
      ["red-key1", 6],
      ["prismatic-key1", 6],
      ["prismatic-key2", 6],
      ["nexus-red-blue", 6],
    ];
    for (const [id, cost] of fixtures) {
      expect(chartNodeCost(id), id).toBe(cost);
    }
  });

  it("charges a deeper small more than a shallower one, in every branch", () => {
    for (const school of [...SCHOOLS, "prismatic"] as const) {
      const smalls = CHART_NODES.filter(
        (n) => n.constellation === school && n.kind === "small",
      );
      for (const small of smalls) {
        expect(chartNodeCost(small.id), small.id).toBe(
          smallTier(small.depth),
        );
      }
    }
  });

  it("prices an unknown node at nothing", () => {
    expect(chartNodeCost("__nosuchnode__")).toBe(0);
    expect(chartCostOf([])).toBe(0);
  });

  it("prices a school branch at 84 and prismatic at 90", () => {
    const totals = new Map<string, number>();
    for (const node of CHART_NODES) {
      totals.set(
        node.constellation,
        (totals.get(node.constellation) ?? 0) + chartNodeCost(node.id),
      );
    }
    for (const school of SCHOOLS) expect(totals.get(school), school).toBe(84);
    expect(totals.get("prismatic")).toBe(90);
    expect(totals.get("hub")).toBe(31);
    expect(totals.get("nexus")).toBe(42);
    expect(chartCostOf(CHART_NODES.map((n) => n.id))).toBe(667);
  });

  it("keeps the spine to a keystone at 37 points in every branch", () => {
    for (const school of [...SCHOOLS, "prismatic"] as const) {
      const ids = chartSpine(school);
      expect(chartCostOf(ids), school).toBe(37);
    }
  });
});

describe("the price of clearing the whole chart", () => {
  it("is moderate at three picks and felt at forty", () => {
    expect(resetCost(4)).toBe(10);
    expect(resetCost(12)).toBe(32);
    expect(resetCost(30)).toBe(86);
    expect(resetCost(60)).toBe(193);
    expect(resetCost(115)).toBe(446);
  });

  it("never falls below what it cost at a smaller spend", () => {
    let previous = 0;
    for (let spent = 0; spent <= 115; spent += 1) {
      const price = resetCost(spent);
      expect(price, String(spent)).toBeGreaterThanOrEqual(previous);
      previous = price;
    }
  });
});
