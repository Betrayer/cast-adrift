import { describe, expect, it } from "vitest";
import { PUZZLES } from "@/data/puzzles";
import { ALL_PERKS } from "@/data/perks";
import { DIE_BY_ID } from "@/data/dice";
import { generateSectorMap } from "@/game/map/generator";
import { nodeById, type MapNode } from "@/game/map/types";
import { INTERFERENCE_STREAK_THRESHOLD } from "@/game/run/interference";
import { pointsTotal } from "@/game/chart/engine";
import { createStream } from "@/services/rng";
import { anomalyPull, greedyNext, stepCost, type RouteState } from "./map";
import { decideDraft } from "./draft";
import { decideEnter, expectedValue, resolvePuzzle } from "./puzzle";
import { createRunState, runAnomaly, takeDie } from "./state";
import { buildChartPicks, MID_COLLECTION_LEVEL } from "./chart";

const schoolOf = (defId: string): string | undefined =>
  DIE_BY_ID.get(defId)?.school;

const route = (over: Partial<RouteState> = {}): RouteState => ({
  hullPct: 100,
  anomalyStreak: 0,
  scrap: 100,
  ...over,
});

describe("map policy", () => {
  it("pulls toward an anomaly once the skip streak threatens interference", () => {
    expect(anomalyPull(route())).toBe(0);
    expect(
      anomalyPull(route({ anomalyStreak: INTERFERENCE_STREAK_THRESHOLD - 1 })),
    ).toBeGreaterThan(0);
    expect(anomalyPull(route({ anomalyStreak: 5 }))).toBeGreaterThan(
      anomalyPull(route({ anomalyStreak: INTERFERENCE_STREAK_THRESHOLD - 1 })),
    );
  });

  it("prices a causality node above the same node without it", () => {
    const map = generateSectorMap(createStream(9), 6);
    const byId = nodeById(map);
    const plain: MapNode = { id: "x", row: 1, lane: 1, type: "event" };
    const stormy: MapNode = { ...plain, storm: true };
    const inverted: MapNode = { ...plain, inverted: true };
    expect(stepCost(map, byId, "r0l1", stormy, route())).toBeGreaterThan(
      stepCost(map, byId, "r0l1", plain, route()),
    );
    expect(stepCost(map, byId, "r0l1", inverted, route())).toBeGreaterThan(
      stepCost(map, byId, "r0l1", plain, route()),
    );
  });

  it("refuses a detour on a broken hull while another lane exists", () => {
    const map = generateSectorMap(createStream(4), 2);
    const byId = nodeById(map);
    const pocketed = map.nodes.filter((n) => n.pocket === true);
    expect(pocketed.length).toBeGreaterThan(0);
    let checked = 0;
    for (const node of pocketed) {
      const parents = map.edges
        .filter(([, to]) => to === node.id)
        .map(([from]) => from);
      for (const from of parents) {
        const parent = byId.get(from);
        if (parent === undefined) continue;
        const forward = map.edges
          .filter(([a]) => a === from)
          .map(([, to]) => byId.get(to))
          .filter((n) => n !== undefined && n.row > parent.row);
        if (forward.every((n) => n?.pocket === true)) continue;
        checked += 1;
        const hurt = greedyNext(map, byId, from, parent.row, route({ hullPct: 20 }));
        expect(hurt?.pocket).not.toBe(true);
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("still moves when every lane forward is a detour", () => {
    const map = generateSectorMap(createStream(4), 2);
    const byId = nodeById(map);
    for (const [from] of map.edges) {
      const parent = byId.get(from);
      if (parent === undefined) continue;
      const forward = map.edges
        .filter(([a]) => a === from)
        .map(([, to]) => byId.get(to))
        .filter((n): n is MapNode => n !== undefined && n.row > parent.row);
      if (forward.length === 0) continue;
      expect(
        greedyNext(map, byId, from, parent.row, route({ hullPct: 5 })),
      ).toBeDefined();
    }
  });
});

describe("draft policy", () => {
  const loadout = {
    deckDefIds: ["red-d6", "red-d6", "ember", "cinder", "slug"],
    perks: [] as string[],
    modules: [] as string[],
  };
  const budget = { scrap: 200, sector: 2, banishLeft: 1, rerollLeft: 1 };

  it("prefers the card whose synergy tags the loadout already carries", () => {
    const tagged = ALL_PERKS.filter(
      (def) => (def.synergy?.length ?? 0) > 0 && def.pool === "red",
    );
    const untagged = ALL_PERKS.filter(
      (def) => (def.synergy?.length ?? 0) === 0 && def.rarity === "common",
    );
    const a = tagged[0];
    const b = untagged[0];
    const c = untagged[1];
    if (a === undefined || b === undefined || c === undefined) {
      throw new Error("perk pool too small for this test");
    }
    const verdict = decideDraft([b.id, a.id, c.id], loadout, budget, schoolOf);
    expect(verdict.pick).toBe(a.id);
  });

  it("is deterministic for the same offer", () => {
    const offer = ALL_PERKS.slice(0, 3).map((def) => def.id);
    expect(decideDraft(offer, loadout, budget, schoolOf)).toEqual(
      decideDraft(offer, loadout, budget, schoolOf),
    );
  });

  it("never rerolls without the scrap for it", () => {
    const offer = ALL_PERKS.filter((d) => d.rarity === "common")
      .slice(0, 3)
      .map((def) => def.id);
    const broke = decideDraft(
      offer,
      loadout,
      { ...budget, scrap: 0 },
      schoolOf,
    );
    expect(broke.reroll).toBe(false);
  });
});

describe("puzzle policy", () => {
  it("enters every deduction regardless of purse", () => {
    const deduction = PUZZLES.find((p) => p.goal.g === "deduction");
    if (deduction === undefined) throw new Error("no deduction authored");
    expect(decideEnter(deduction, 0, 0, createStream(1))).toBe(true);
  });

  it("values a T5 higher when interference is already building", () => {
    const t5 = PUZZLES.find((p) => p.tier === 5 && p.goal.g !== "deduction");
    if (t5 === undefined) throw new Error("no T5 authored");
    const calm = expectedValue(t5, createStream(3), 0);
    const pressed = expectedValue(t5, createStream(3), 40);
    expect(pressed).toBeGreaterThan(calm);
  });

  it("never pays a stake it cannot afford", () => {
    const t5 = PUZZLES.find((p) => p.tier === 5 && p.goal.g !== "deduction");
    if (t5 === undefined) throw new Error("no T5 authored");
    const outcome = resolvePuzzle(
      t5,
      5,
      100,
      createStream(11),
      createStream(12),
    );
    expect(outcome.paid).toBeLessThanOrEqual(5);
  });

  it("clears the anomaly streak on a solve and grows it on a skip", () => {
    const map = generateSectorMap(createStream(4), 1);
    const anomaly = map.nodes.find((n) => n.type === "anomaly");
    if (anomaly === undefined) throw new Error("sector 1 has no anomaly");
    const solved = createRunState({ hull: 30, hullMax: 30, deck: ["red-d6"] });
    solved.anomalyStreak = 4;
    solved.interference = 3;
    for (let seed = 1; seed < 40; seed += 1) {
      runAnomaly(solved, 1, anomaly, seed);
      if (solved.solvedPuzzles.length > 0) break;
    }
    expect(solved.solvedPuzzles.length).toBeGreaterThan(0);
    expect(solved.anomalyStreak).toBe(0);
    expect(solved.interference).toBe(0);
  });
});

describe("run state", () => {
  it("swaps the worst die out of a full deck and banks the sale", () => {
    const state = createRunState({
      hull: 30,
      hullMax: 30,
      deck: [
        "red-d6",
        "red-d6",
        "red-d6",
        "red-d6",
        "red-d6",
        "red-d6",
        "red-d6",
        "red-d6",
        "grey-d4",
      ],
    });
    const before = state.deck.length;
    takeDie(state, "voidmaw");
    expect(state.deck.length).toBe(before);
    expect(state.scrapEarned).toBeGreaterThan(0);
  });
});

describe("chart policy", () => {
  it("spends the whole mid-collection budget on a connected route", () => {
    const picks = buildChartPicks(MID_COLLECTION_LEVEL);
    expect(picks.length).toBe(pointsTotal(MID_COLLECTION_LEVEL));
    expect(new Set(picks).size).toBe(picks.length);
  });

  it("is deterministic", () => {
    expect(buildChartPicks(MID_COLLECTION_LEVEL)).toEqual(
      buildChartPicks(MID_COLLECTION_LEVEL),
    );
  });
});
