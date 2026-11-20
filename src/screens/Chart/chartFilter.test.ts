import { describe, expect, it } from "vitest";
import { CHART_NODE_BY_ID, CHART_NODES } from "@/data/chart";
import type { ChartNodeDef } from "@/data/chart/types";
import {
  CHART_FILTER_CONSTELLATIONS,
  CHART_FILTER_KINDS,
  chartFilterCount,
  EMPTY_CHART_FILTER,
  matchesChartFilter,
} from "@/screens/Chart/chartFilter";

const reads = {
  title: (node: ChartNodeDef) => (node.id === "red-gate" ? "Kindling Gate" : `${node.constellation} node`),
  available: (id: string) => id === "red-gate" || id === "blue-gate",
};

const node = (id: string): ChartNodeDef => {
  const found = CHART_NODE_BY_ID.get(id);
  if (found === undefined) throw new Error(id);
  return found;
};

describe("matchesChartFilter", () => {
  it("lets every node through an empty filter", () => {
    expect(CHART_NODES.every((each) => matchesChartFilter(each, EMPTY_CHART_FILTER, reads))).toBe(true);
    expect(chartFilterCount(EMPTY_CHART_FILTER)).toBe(0);
  });

  it("joins the groups with AND and the chips inside a group with OR", () => {
    const filter = { ...EMPTY_CHART_FILTER, constellations: ["red", "blue"] as const, kinds: ["gate"] as const };
    expect(matchesChartFilter(node("red-gate"), filter, reads)).toBe(true);
    expect(matchesChartFilter(node("blue-gate"), filter, reads)).toBe(true);
    expect(matchesChartFilter(node("green-gate"), filter, reads)).toBe(false);
    expect(CHART_NODES.filter((each) => matchesChartFilter(each, filter, reads)).length).toBe(2);
    expect(chartFilterCount(filter)).toBe(3);
  });

  it("searches names without minding case or spaces around the query", () => {
    const filter = { ...EMPTY_CHART_FILTER, text: "  kindling " };
    expect(CHART_NODES.filter((each) => matchesChartFilter(each, filter, reads)).map((each) => each.id)).toEqual(["red-gate"]);
    expect(chartFilterCount({ ...EMPTY_CHART_FILTER, text: "   " })).toBe(0);
  });

  it("keeps only what can be bought now when asked", () => {
    const filter = { ...EMPTY_CHART_FILTER, availableOnly: true };
    expect(CHART_NODES.filter((each) => matchesChartFilter(each, filter, reads)).map((each) => each.id).sort()).toEqual([
      "blue-gate",
      "red-gate",
    ]);
  });

  it("offers a chip for every constellation and kind the chart holds", () => {
    expect(new Set(CHART_NODES.map((each) => each.constellation))).toEqual(new Set(CHART_FILTER_CONSTELLATIONS));
    expect(new Set(CHART_NODES.map((each) => each.kind))).toEqual(new Set(CHART_FILTER_KINDS));
  });
});
