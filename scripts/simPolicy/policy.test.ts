import { describe, expect, it } from "vitest";
import { PUZZLES } from "@/data/puzzles";
import { ALL_PERKS } from "@/data/perks";
import { ALL_MODULES } from "@/data/modules";
import { bayPrice, moduleSellValue } from "@/game/economy/prices";
import { DIE_BY_ID } from "@/data/dice";
import { generateSectorMap } from "@/game/map/generator";
import { nodeById, type MapNode } from "@/game/map/types";
import { INTERFERENCE_STREAK_THRESHOLD } from "@/game/run/interference";
import { isAllocatable, pointsSpent, pointsTotal } from "@/game/chart/engine";
import { createStream } from "@/services/rng";
import { anomalyPull, greedyNext, stepCost, type RouteState } from "./map";
import { decideDraft } from "./draft";
import { decideEnter, expectedValue, resolvePuzzle } from "./puzzle";
import {
  buyBay,
  createRunState,
  moduleValue,
  runAnomaly,
  runBays,
  takeDie,
  takeModule,
} from "./state";
import { buildChartPicks, MID_COLLECTION_LEVEL } from "./chart";

const schoolOf = (defId: string): string | undefined =>
  DIE_BY_ID.get(defId)?.school;

const route = (over: Partial<RouteState> = {}): RouteState => ({
  hullPct: 100,
  anomalyStreak: 0,
  scrap: 100,
  wormholeRides: 0,
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

  it("fills a free bay before it starts trading modules", () => {
    const state = createRunState({ hull: 30, hullMax: 30, deck: ["red-d6"] });
    expect(runBays(state)).toBe(2);
    expect(takeModule(state, "heatsink")).toBe(true);
    expect(takeModule(state, "blackLedger")).toBe(true);
    expect(state.moduleSales).toBe(0);
  });

  it("swaps a full bay only when the offer scores higher, and books the refund apart", () => {
    const worst = [...ALL_MODULES].sort(
      (a, b) => moduleValue(a.id) - moduleValue(b.id),
    )[0];
    const best = [...ALL_MODULES].sort(
      (a, b) => moduleValue(b.id) - moduleValue(a.id),
    )[0];
    expect(worst).toBeDefined();
    expect(best).toBeDefined();
    if (worst === undefined || best === undefined) return;

    const state = createRunState({
      hull: 30,
      hullMax: 30,
      deck: ["red-d6"],
      modules: [worst.id, "heatsink"],
    });
    expect(takeModule(state, best.id)).toBe(true);
    expect(state.modules).toContain(best.id);
    expect(state.modules).not.toContain(worst.id);
    expect(state.moduleSales).toBeGreaterThan(0);
    expect(state.scrapEarned).toBe(state.moduleSales);

    const refuser = createRunState({
      hull: 30,
      hullMax: 30,
      deck: ["red-d6"],
      modules: [best.id, "heatsink"],
    });
    expect(takeModule(refuser, worst.id)).toBe(false);
    expect(refuser.modules).toEqual([best.id, "heatsink"]);
    expect(refuser.moduleSales).toBe(moduleSellValue(worst.price));
  });

  it("pays nothing for a duplicate, where a refused trade sells the offer", () => {
    const state = createRunState({
      hull: 30,
      hullMax: 30,
      deck: ["red-d6"],
      modules: ["heatsink", "blackLedger"],
    });
    expect(takeModule(state, "heatsink")).toBe(false);
    expect(state.moduleSales).toBe(0);
    expect(state.scrapEarned).toBe(0);
  });

  it("never installs a module the ship already carries", () => {
    const state = createRunState({
      hull: 30,
      hullMax: 30,
      deck: ["red-d6"],
      modules: ["heatsink"],
    });
    expect(takeModule(state, "heatsink")).toBe(false);
    expect(state.modules).toEqual(["heatsink"]);
  });

  it("buys the shipyard bay once, only with a full bay and the scrap for it", () => {
    const state = createRunState({
      hull: 30,
      hullMax: 30,
      deck: ["red-d6"],
      modules: ["heatsink"],
    });
    state.scrap = 500;
    buyBay(state, 1);
    expect(state.baysPurchased).toBe(0);

    state.modules.push("blackLedger");
    buyBay(state, 3);
    expect(state.baysPurchased).toBe(1);
    expect(state.sinks.bays).toBe(bayPrice(3));
    expect(runBays(state)).toBe(3);

    state.modules.push("escapePod");
    buyBay(state, 3);
    expect(state.baysPurchased).toBe(1);
  });
});

describe("chart policy", () => {
  it("spends the mid-collection budget in points, not in nodes", () => {
    const picks = buildChartPicks(MID_COLLECTION_LEVEL);
    const budget = pointsTotal(MID_COLLECTION_LEVEL);
    expect(pointsSpent(picks)).toBeLessThanOrEqual(budget);
    expect(pointsSpent(picks)).toBeGreaterThanOrEqual(budget - 1);
    expect(picks.length).toBeLessThan(budget);
    expect(new Set(picks).size).toBe(picks.length);
  });

  it("only ever adds a node adjacent to what it already owns", () => {
    const picks = buildChartPicks(MID_COLLECTION_LEVEL);
    const owned: string[] = [];
    for (const id of picks) {
      expect(isAllocatable(id, owned), id).toBe(true);
      owned.push(id);
    }
  });

  it("is deterministic", () => {
    expect(buildChartPicks(MID_COLLECTION_LEVEL)).toEqual(
      buildChartPicks(MID_COLLECTION_LEVEL),
    );
  });
});
