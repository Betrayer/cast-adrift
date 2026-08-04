import { beforeEach, describe, expect, it } from "vitest";
import { sectorDef } from "@/data/sectors";
import { generateSectorMap } from "@/game/map/generator";
import { nodeRisk } from "@/game/map/risk";
import { edgeKey, type MapGraph, type MapNode } from "@/game/map/types";
import { applyEdgeMotifs, applyNodeMotifs } from "@/game/run/motifs";
import { createStreams } from "@/services/rng";
import { useNarrativeStore } from "@/stores/narrativeStore";
import { MAX_SHIPYARD_DISCOUNT, useRunStore } from "@/stores/runStore";

const map = (sector: number, seed = 3): MapGraph =>
  generateSectorMap(createStreams(seed).map, sector);

const node = (over: Partial<MapNode>): MapNode => ({
  id: "r2l1",
  row: 2,
  lane: 1,
  type: "battle",
  ...over,
});

describe("sector motifs", () => {
  beforeEach(() => {
    useRunStore.getState().reset();
    useRunStore.setState({ hull: 30, hullMax: 30, scrap: 0, tide: 0, seed: 11 });
    useNarrativeStore.setState({ consequence: null, consequenceQueue: [] });
  });

  it("pays a cache and surfaces it as a consequence", () => {
    applyNodeMotifs(node({ cache: true }), 1);
    expect(useRunStore.getState().scrap).toBe(10);
    expect(useNarrativeStore.getState().consequence?.origin).toBe(
      "run:motif.cache",
    );
  });

  it("ignores a cache marker in a sector without the motif", () => {
    applyNodeMotifs(node({ cache: true }), 3);
    expect(useRunStore.getState().scrap).toBe(0);
  });

  it("charges hull for crossing a marked mine edge, once", () => {
    const graph = map(2);
    const marked = Object.keys(graph.edgeMarks)[0];
    expect(marked).toBeDefined();
    if (marked === undefined) return;
    const hit = graph.edges.find(([a, b]) => edgeKey(a, b) === marked);
    expect(hit).toBeDefined();
    if (hit === undefined) return;
    applyEdgeMotifs(graph, hit[0], hit[1], 2);
    expect(useRunStore.getState().hull).toBe(28);
    const clean = graph.edges.find(
      ([a, b]) => graph.edgeMarks[edgeKey(a, b)] === undefined,
    );
    expect(clean).toBeDefined();
    if (clean === undefined) return;
    applyEdgeMotifs(graph, clean[0], clean[1], 2);
    expect(useRunStore.getState().hull).toBe(28);
  });

  it("never lets a toll take the last hull point", () => {
    useRunStore.setState({ hull: 1 });
    const graph = map(2);
    const marked = Object.keys(graph.edgeMarks)[0];
    if (marked === undefined) return;
    const hit = graph.edges.find(([a, b]) => edgeKey(a, b) === marked);
    if (hit === undefined) return;
    applyEdgeMotifs(graph, hit[0], hit[1], 2);
    expect(useRunStore.getState().hull).toBe(1);
  });

  it("blesses and curses the procession lanes", () => {
    applyNodeMotifs(node({ blessing: "blessed" }), 4);
    expect(useRunStore.getState().shipyardDiscount).toBe(12);
    expect(useRunStore.getState().tide).toBe(0);
    applyNodeMotifs(node({ blessing: "cursed" }), 4);
    expect(useRunStore.getState().tide).toBe(1);
  });

  it("caps a stacked shipyard discount so an upgrade never becomes free", () => {
    for (let i = 0; i < 12; i += 1) {
      applyNodeMotifs(node({ blessing: "blessed" }), 4);
    }
    expect(useRunStore.getState().shipyardDiscount).toBe(MAX_SHIPYARD_DISCOUNT);
  });

  it("keeps every motif payload inside the sector that declares it", () => {
    for (const def of [1, 2, 3, 4, 5]) {
      const kinds = sectorDef(def).shape.motifs.map((m) => m.m);
      expect(new Set(kinds).size).toBe(kinds.length);
    }
  });
});

describe("node risk", () => {
  it("reads danger off the node, not the sector", () => {
    expect(nodeRisk(node({ type: "battle" }))).toBe("low");
    expect(nodeRisk(node({ type: "event" }))).toBe("low");
    expect(nodeRisk(node({ type: "elite" }))).toBe("high");
    expect(nodeRisk(node({ type: "miniboss" }))).toBe("high");
    expect(nodeRisk(node({ type: "battle", unstable: true }))).toBe("raised");
    expect(nodeRisk(node({ type: "battle", blessing: "cursed" }))).toBe("raised");
    expect(nodeRisk(node({ type: "battle", pocket: true }))).toBe("high");
    expect(nodeRisk(node({ type: "shop", pocket: true }))).toBe("raised");
  });
});
