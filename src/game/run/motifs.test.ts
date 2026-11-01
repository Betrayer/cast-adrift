import { beforeEach, describe, expect, it } from "vitest";
import { sectorDef } from "@/data/sectors";
import { generateSectorMap } from "@/game/map/generator";
import { nodeRisk } from "@/game/map/risk";
import { edgeKey, type MapGraph, type MapNode } from "@/game/map/types";
import {
  applyEdgeMotifs,
  applyHoleToll,
  applyNodeMotifs,
  bypassLethal,
  bypassPctFor,
  disintegrationPctFor,
  holeTollFor,
} from "@/game/run/motifs";
import { createStreams } from "@/services/rng";
import { useNarrativeStore } from "@/stores/narrativeStore";
import { MAX_SHIPYARD_DISCOUNT, useRunStore } from "@/stores/runStore";

const map = (sector: number, seed = 3): MapGraph =>
  generateSectorMap(createStreams(seed).map, sector);

const lastConsequence = (): string | null =>
  useNarrativeStore.getState().feed.find((m) => m.source === "consequence")
    ?.key ?? null;

const consequenceEntries = (): string[] =>
  useNarrativeStore
    .getState()
    .journal.filter((entry) => entry.k === "consequence")
    .map((entry) => (entry.k === "consequence" ? entry.origin : ""));

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
    useNarrativeStore.getState().reset();
  });

  it("pays a cache and surfaces it as a consequence", () => {
    applyNodeMotifs(node({ cache: true }), 1);
    expect(useRunStore.getState().scrap).toBe(10);
    expect(lastConsequence()).toBe("run:motif.cache");
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

  it("journals every motif consequence, not just the toast", () => {
    applyNodeMotifs(node({ cache: true }), 1);
    applyNodeMotifs(node({ blessing: "blessed" }), 4);
    applyNodeMotifs(node({ blessing: "cursed" }), 4);
    expect(consequenceEntries()).toEqual([
      "run:motif.cache",
      "run:motif.blessed",
      "run:motif.cursed",
    ]);
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

describe("the disintegration percentage", () => {
  it("rides the motif on every sector that carries a hole", () => {
    for (const sector of [2, 3, 4, 5, 6]) {
      const motif = sectorDef(sector).shape.motifs.find(
        (m) => m.m === "blackHoles",
      );
      expect(motif).toBeDefined();
      expect(disintegrationPctFor(sector)).toBe(
        motif?.m === "blackHoles" ? motif.disintegrationPct : 0,
      );
      expect(disintegrationPctFor(sector)).toBeGreaterThan(0);
      expect(disintegrationPctFor(sector)).toBeLessThan(100);
    }
  });

  it("is zero where no hole is declared", () => {
    expect(disintegrationPctFor(1)).toBe(0);
  });
});

describe("the black-hole bypass toll", () => {
  beforeEach(() => {
    useRunStore.getState().reset();
    useRunStore.setState({ hull: 30, hullMax: 30, seed: 11 });
    useNarrativeStore.getState().reset();
  });

  const BYPASS_PCT: Readonly<Record<number, number>> = {
    1: 0,
    2: 0.2,
    3: 0.21,
    4: 0.22,
    5: 0.24,
    6: 0.25,
  };

  it("declares a share of max hull per sector", () => {
    for (const sector of [1, 2, 3, 4, 5, 6]) {
      expect(bypassPctFor(sector), `S${String(sector)}`).toBe(BYPASS_PCT[sector]);
    }
  });

  it("charges the ceiling of that share of max hull", () => {
    expect(holeTollFor(1, 30)).toBe(0);
    expect(holeTollFor(2, 30)).toBe(6);
    expect(holeTollFor(3, 30)).toBe(7);
    expect(holeTollFor(4, 30)).toBe(7);
    expect(holeTollFor(5, 30)).toBe(8);
    expect(holeTollFor(6, 30)).toBe(8);
    for (const sector of [2, 3, 4, 5, 6]) {
      for (let hullMax = 1; hullMax <= 80; hullMax += 1) {
        expect(holeTollFor(sector, hullMax), `S${String(sector)} ${String(hullMax)}`).toBe(
          Math.ceil(hullMax * (BYPASS_PCT[sector] ?? 0)),
        );
      }
    }
  });

  it("never waives itself on a thin hull", () => {
    expect(holeTollFor(4, 3)).toBe(1);
    expect(holeTollFor(4, 1)).toBe(1);
    expect(holeTollFor(2, 1)).toBe(1);
    expect(holeTollFor(2, 0)).toBe(0);
  });

  it("is lethal exactly when the hull is at or under the toll", () => {
    expect(bypassLethal(7, 7)).toBe(true);
    expect(bypassLethal(6, 7)).toBe(true);
    expect(bypassLethal(1, 7)).toBe(true);
    expect(bypassLethal(8, 7)).toBe(false);
    expect(bypassLethal(1, 0)).toBe(false);
    expect(bypassLethal(0, 0)).toBe(false);
  });

  it("charges the hull and names the motif", () => {
    const toll = holeTollFor(4, 30);
    expect(applyHoleToll(4, "r5l1", "r6l1")).toBe(toll);
    expect(useRunStore.getState().hull).toBe(30 - toll);
    expect(lastConsequence()).toBe("run:motif.bypass");
    expect(consequenceEntries()).toEqual(["run:motif.bypass"]);
  });

  it("reads max hull, not the hull left", () => {
    useRunStore.setState({ hull: 20, hullMax: 40 });
    expect(applyHoleToll(6, "r5l1", "r6l1")).toBe(10);
    expect(useRunStore.getState().hull).toBe(10);
  });

  it("refuses to charge a lethal toll and leaves no trace", () => {
    for (const sector of [2, 3, 4, 5, 6]) {
      useNarrativeStore.getState().reset();
      const toll = holeTollFor(sector, 30);
      for (const hull of [toll, toll - 1, 1]) {
        useRunStore.setState({ hull });
        expect(applyHoleToll(sector, "r5l1", "r6l1"), `S${String(sector)} ${String(hull)}`).toBeNull();
        expect(useRunStore.getState().hull).toBe(hull);
      }
      expect(lastConsequence()).toBeNull();
      expect(consequenceEntries()).toEqual([]);
    }
  });

  it("charges the last point it can without killing", () => {
    const toll = holeTollFor(5, 30);
    useRunStore.setState({ hull: toll + 1 });
    expect(applyHoleToll(5, "r5l1", "r6l1")).toBe(toll);
    expect(useRunStore.getState().hull).toBe(1);
  });

  it("does nothing to the hull in a sector without the motif", () => {
    const before = consequenceEntries();
    expect(applyHoleToll(1, "r5l1", "r6l1")).toBe(0);
    expect(useRunStore.getState().hull).toBe(30);
    expect(consequenceEntries()).toEqual(before);
  });
});
