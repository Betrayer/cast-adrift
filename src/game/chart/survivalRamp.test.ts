import { describe, expect, it } from "vitest";
import { CHART_NODE_BY_ID, CHART_NODES } from "@/data/chart";
import type { ChartNodeDef } from "@/data/chart/types";
import { smallTier } from "@/data/chart/types";

const node = (id: string): ChartNodeDef => {
  const def = CHART_NODE_BY_ID.get(id);
  if (def === undefined) throw new Error(`no chart node ${id}`);
  return def;
};

const sustain = (id: string): number[] =>
  (node(id).effects ?? []).flatMap((effect) =>
    effect.do.flatMap((action) =>
      (action.a === "heal" || action.a === "shield") && "n" in action ? [action.n] : [],
    ),
  );

const smalls = (school: string): ChartNodeDef[] =>
  CHART_NODES.filter((n) => n.constellation === school && n.kind === "small");

describe("H3-b survival ramp for green and blue smalls", () => {
  it("halves the ramp of the deep blue shields and heals", () => {
    expect(sustain("blue-s13")).toEqual([3]);
    expect(sustain("blue-s16")).toEqual([3]);
    expect(sustain("blue-s23")).toEqual([2]);
    expect(node("blue-s14").mods?.battleEndHeal).toBe(1);
  });

  it("carries a tier-IV green end-of-battle heal at one and a half times its base", () => {
    expect(smallTier(node("green-s18").depth)).toBe(4);
    expect(node("green-s18").mods?.battleEndHeal).toBe(5);
  });

  it("keeps the generic ramp on blue payloads that are not hull regen or shields", () => {
    expect(node("blue-s18").mods?.hullMaxDelta).toBe(12);
    expect(node("blue-s19").mods?.tideEffectDelta).toBe(-4);
  });

  it("gives every blue and green small a distinct payload within its tier", () => {
    for (const school of ["blue", "green"]) {
      const keys = smalls(school).map((n) =>
        JSON.stringify([smallTier(n.depth), n.mods ?? null, n.effects ?? null, n.traits ?? null]),
      );
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it("keeps the payload theme of every blue small where it was", () => {
    expect(node("blue-s1").mods?.jamPowerDelta).toBe(1);
    expect(sustain("blue-s2")).toEqual([1]);
    expect(sustain("blue-s3")).toEqual([1]);
  });
});
