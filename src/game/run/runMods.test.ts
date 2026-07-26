import { describe, expect, it } from "vitest";
import {
  chartHasTrait,
  computeChartMods,
  computeRunMods,
  runHasTrait,
} from "@/game/run/runMods";

describe("chart mods aggregation", () => {
  it("sums a chart node's mods", () => {
    expect(computeChartMods(["yellow-s1"]).scrapMultPct).toBe(5);
    expect(computeChartMods([]).scrapMultPct).toBe(0);
  });

  it("computeRunMods merges perk and chart mods", () => {
    const mods = computeRunMods([], ["yellow-s1", "yellow-not1"]);
    expect(mods.scrapMultPct).toBe(20);
  });

  it("chart mods default to zero when picks are empty", () => {
    expect(computeRunMods([], []).scrapMultPct).toBe(0);
  });
});

describe("chart traits", () => {
  it("detects keystone traits from picks", () => {
    expect(chartHasTrait(["black-key"], "obsidianPact")).toBe(true);
    expect(chartHasTrait(["grey-key"], "singleCast")).toBe(true);
    expect(chartHasTrait(["yellow-key"], "coldLogic")).toBe(true);
    expect(chartHasTrait([], "obsidianPact")).toBe(false);
  });

  it("runHasTrait unions perk and chart traits", () => {
    expect(runHasTrait([], ["grey-key"], "singleCast")).toBe(true);
    expect(runHasTrait([], [], "singleCast")).toBe(false);
  });
});
