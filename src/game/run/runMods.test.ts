import { describe, expect, it } from "vitest";
import { CHART_NODES, CHART_NODE_BY_ID } from "@/data/chart";
import { chartNodeCost } from "@/game/chart/cost";
import {
  chartHasTrait,
  computeChartMods,
  computeRunMods,
  runHasTrait,
} from "@/game/run/runMods";

const modOf = (id: string, key: "scrapMultPct" | "hullMaxDelta"): number =>
  computeChartMods([id])[key];

describe("chart mods aggregation", () => {
  it("sums a chart node's mods", () => {
    const node = CHART_NODES.find(
      (n) =>
        n.constellation === "yellow" &&
        n.scaledBy === undefined &&
        (n.mods?.scrapMultPct ?? 0) > 0,
    );
    expect(node).toBeDefined();
    if (node === undefined) return;
    expect(modOf(node.id, "scrapMultPct")).toBe(node.mods?.scrapMultPct);
    expect(computeChartMods([]).scrapMultPct).toBe(0);
  });

  it("computeRunMods merges perk and chart mods", () => {
    const nodes = CHART_NODES.filter(
      (n) =>
        n.constellation === "yellow" &&
        n.scaledBy === undefined &&
        (n.mods?.scrapMultPct ?? 0) > 0,
    ).slice(0, 2);
    expect(nodes.length).toBeGreaterThan(1);
    const expected = nodes.reduce(
      (sum, n) => sum + (n.mods?.scrapMultPct ?? 0),
      0,
    );
    const mods = computeRunMods(
      [],
      nodes.map((n) => n.id),
    );
    expect(mods.scrapMultPct).toBe(expected);
  });

  it("chart mods default to zero when picks are empty", () => {
    expect(computeRunMods([], []).scrapMultPct).toBe(0);
  });
});

describe("confluence scaling", () => {
  it("pays nothing until the partner school is five points deep", () => {
    const node = CHART_NODE_BY_ID.get("grey-c1");
    expect(node?.scaledBy?.school).toBe("black");
    expect(computeChartMods(["grey-c1"]).hullMaxDelta).toBe(0);
  });

  it("pays one step per five points, and stops at the cap", () => {
    const black = CHART_NODES.filter((n) => n.constellation === "black")
      .sort((a, b) => a.depth - b.depth)
      .map((n) => n.id);
    const some: string[] = [];
    let spent = 0;
    for (const id of black) {
      if (spent >= 5) break;
      some.push(id);
      spent += chartNodeCost(id);
    }
    const oneStep =
      computeChartMods(["grey-c1", ...some]).hullMaxDelta -
      computeChartMods(some).hullMaxDelta;
    expect(oneStep).toBe(1);

    const capped =
      computeChartMods(["grey-c1", ...black]).hullMaxDelta -
      computeChartMods(black).hullMaxDelta;
    expect(capped).toBe(5);
  });
});

describe("chart traits", () => {
  it("detects keystone traits from picks", () => {
    expect(chartHasTrait(["black-key1"], "obsidianPact")).toBe(true);
    expect(chartHasTrait(["grey-key1"], "singleCast")).toBe(true);
    expect(chartHasTrait(["yellow-key1"], "coldLogic")).toBe(true);
    expect(chartHasTrait([], "obsidianPact")).toBe(false);
  });

  it("runHasTrait unions perk and chart traits", () => {
    expect(runHasTrait([], ["grey-key1"], "singleCast")).toBe(true);
    expect(runHasTrait([], [], "singleCast")).toBe(false);
  });
});
