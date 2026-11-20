import { describe, expect, it } from "vitest";
import { CHART_EDGES, CHART_NODES } from "@/data/chart";
import type { ChartNodeDef } from "@/data/chart/types";
import {
  CHART_LAYOUT_IDS,
  CONSTELLATION_SEEDS,
  DEFAULT_CHART_LAYOUT,
  MIN_SEPARATION,
  clearance,
  graphHash,
  isChartLayoutId,
  layoutChart,
} from "@/game/chart/layouts";
import { chartSkeleton } from "@/game/chart/layouts/skeleton";
import { constellationsLayout, segmentsCross } from "@/game/chart/layouts/constellations";

const BY_ID = new Map(CHART_NODES.map((node) => [node.id, node]));

const EDGES: [string, string][] = CHART_EDGES.map(([a, b]) => [a.id, b.id]);

const schoolEdges = (): [string, string][] =>
  EDGES.filter(([a, b]) => {
    const from = BY_ID.get(a);
    const to = BY_ID.get(b);
    return (
      from !== undefined &&
      to !== undefined &&
      from.constellation === to.constellation &&
      from.constellation !== "hub" &&
      from.constellation !== "nexus"
    );
  });

describe("chart layouts", () => {
  it("names four layouts and defaults to the spiral", () => {
    expect(CHART_LAYOUT_IDS).toEqual(["spiral", "rings", "constellations", "nebulae"]);
    expect(DEFAULT_CHART_LAYOUT).toBe("spiral");
    expect(isChartLayoutId("rings")).toBe(true);
    expect(isChartLayoutId("radial")).toBe(false);
    expect(isChartLayoutId(undefined)).toBe(false);
  });

  it("reads the same skeleton out of the graph for every layout", () => {
    const skeleton = chartSkeleton(CHART_NODES);
    expect(skeleton.arms).toHaveLength(7);
    expect(skeleton.inner).toHaveLength(12);
    expect(skeleton.outer).toHaveLength(16);
    expect(skeleton.nexus).toHaveLength(7);
    for (const arm of skeleton.arms) {
      expect(arm.spine).toHaveLength(12);
      expect(arm.tips.length).toBe(arm.school === "prismatic" ? 2 : 1);
      const sides = [...arm.sides.values()].reduce((sum, list) => sum + list.length, 0);
      expect(sides).toBe(17);
    }
  });

  for (const id of CHART_LAYOUT_IDS) {
    describe(id, () => {
      const layout = layoutChart(CHART_NODES, id);

      it("places every node of the graph", () => {
        expect(layout.pos.size).toBe(CHART_NODES.length);
        expect(CHART_NODES.length).toBe(246);
        for (const node of CHART_NODES) {
          const point = layout.pos.get(node.id);
          expect(point, node.id).toBeDefined();
          expect(Number.isFinite(point?.x)).toBe(true);
          expect(Number.isFinite(point?.y)).toBe(true);
        }
      });

      it("keeps every pair of drawn nodes apart", () => {
        const offenders: string[] = [];
        for (let i = 0; i < CHART_NODES.length; i += 1) {
          const a = CHART_NODES[i] as ChartNodeDef;
          const pa = layout.pos.get(a.id);
          for (let j = i + 1; j < CHART_NODES.length; j += 1) {
            const b = CHART_NODES[j] as ChartNodeDef;
            const pb = layout.pos.get(b.id);
            if (pa === undefined || pb === undefined) continue;
            const gap = Math.hypot(pa.x - pb.x, pa.y - pb.y);
            if (gap < MIN_SEPARATION || gap < clearance(a.kind, b.kind)) {
              offenders.push(`${a.id}~${b.id}:${gap.toFixed(1)}`);
            }
          }
        }
        expect(offenders).toEqual([]);
      });

      it("frames every node inside its own bounds", () => {
        const { bounds } = layout;
        for (const [nodeId, point] of layout.pos) {
          expect(point.x, nodeId).toBeGreaterThan(bounds.x);
          expect(point.x, nodeId).toBeLessThan(bounds.x + bounds.w);
          expect(point.y, nodeId).toBeGreaterThan(bounds.y);
          expect(point.y, nodeId).toBeLessThan(bounds.y + bounds.h);
        }
      });

      it("is taller than it is wide, so a phone sees the overview", () => {
        expect(layout.bounds.h).toBeGreaterThan(layout.bounds.w);
      });

      it("draws one region per school", () => {
        expect(layout.regions.map((region) => region.school)).toEqual([
          "red",
          "blue",
          "green",
          "yellow",
          "black",
          "grey",
          "prismatic",
        ]);
      });

      it("pins its positions, so a changed layout is a deliberate diff", () => {
        const pinned = Object.fromEntries(
          [...layout.pos].map(([nodeId, point]) => [nodeId, `${point.x},${point.y}`]),
        );
        expect(pinned).toMatchSnapshot();
      });
    });
  }

  it("never crosses two links of one school in the rings and the constellations", () => {
    for (const id of ["rings", "constellations"] as const) {
      const layout = layoutChart(CHART_NODES, id);
      const edges = schoolEdges();
      const crossings: string[] = [];
      for (let i = 0; i < edges.length; i += 1) {
        const [a, b] = edges[i] as [string, string];
        for (let j = i + 1; j < edges.length; j += 1) {
          const [c, d] = edges[j] as [string, string];
          if (a === c || a === d || b === c || b === d) continue;
          const [pa, pb, pc, pd] = [a, b, c, d].map((key) => layout.pos.get(key));
          if (!pa || !pb || !pc || !pd) continue;
          if (segmentsCross(pa, pb, pc, pd)) crossings.push(`${a}-${b} x ${c}-${d}`);
        }
      }
      expect(crossings, id).toEqual([]);
    }
  });

  it("gives every school its own constellation seed", () => {
    const seeds = Object.values(CONSTELLATION_SEEDS);
    expect(Object.keys(CONSTELLATION_SEEDS).sort()).toEqual(
      ["black", "blue", "green", "grey", "prismatic", "red", "yellow"],
    );
    expect(new Set(seeds).size).toBe(seeds.length);
  });

  it("computes each layout once per graph and is a pure function of it", () => {
    const first = layoutChart(CHART_NODES, "constellations");
    expect(layoutChart(CHART_NODES, "constellations")).toBe(first);
    const fresh = constellationsLayout(chartSkeleton(CHART_NODES));
    for (const [nodeId, point] of first.pos) {
      const again = fresh.pos.get(nodeId);
      expect(again?.x).toBeCloseTo(point.x, 0);
      expect(again?.y).toBeCloseTo(point.y, 0);
    }
  });

  it("keys the memo on the graph, not on the call", () => {
    const trimmed = CHART_NODES.filter((node) => node.id !== "red-s23");
    expect(graphHash(trimmed)).not.toBe(graphHash(CHART_NODES));
    expect(layoutChart(trimmed, "spiral")).not.toBe(layoutChart(CHART_NODES, "spiral"));
  });
});
