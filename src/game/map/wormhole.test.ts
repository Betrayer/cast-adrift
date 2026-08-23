import { describe, expect, it } from "vitest";
import { createStreams } from "@/services/rng";
import { generateSectorMap } from "@/game/map/generator";
import {
  edgeKey,
  nodeById,
  type MapGraph,
  type MapNode,
  type NodeId,
} from "@/game/map/types";
import {
  budgetCapFor,
  bypassTargetFor,
  GENTLE_BUDGET,
  GENTLE_RIDES,
  isGentleRide,
  landingCandidates,
  MAX_BUDGET,
  openLandings,
  rollThrow,
  throwCost,
  type ThrowSource,
} from "@/game/map/wormhole";

const scripted = (
  ints: readonly number[],
  picks: readonly number[] = [],
): ThrowSource => {
  let intAt = 0;
  let pickAt = 0;
  return {
    int: (min, max) => {
      const value = ints[intAt] ?? min;
      intAt += 1;
      return Math.max(min, Math.min(max, value));
    },
    pick: <T,>(arr: readonly T[]): T => {
      const index = picks[pickAt] ?? 0;
      pickAt += 1;
      return arr[index % arr.length] as T;
    },
  };
};

const node = (
  row: number,
  lane: number,
  extra: Partial<MapNode> = {},
): MapNode => ({
  id: `r${String(row)}l${String(lane)}`,
  row,
  lane,
  type: "battle",
  ...extra,
});

const LANES = 3;
const BOSS_ROW = 6;

const gridMap = (overrides: Partial<MapGraph> = {}): MapGraph => {
  const nodes: MapNode[] = [node(0, 1, { type: "start" })];
  for (let row = 1; row < BOSS_ROW; row += 1) {
    for (let lane = 0; lane < LANES; lane += 1) nodes.push(node(row, lane));
  }
  nodes.push(node(BOSS_ROW, 1, { type: "boss" }));
  const edges: [NodeId, NodeId][] = [];
  for (const from of nodes) {
    for (const to of nodes) {
      if (to.row !== from.row + 1) continue;
      if (Math.abs(to.lane - from.lane) > 1 && from.type !== "start") continue;
      edges.push([from.id, to.id]);
    }
  }
  return {
    nodes,
    edges,
    shape: { bossRow: BOSS_ROW, gateRow: 3, lanes: LANES },
    edgeMarks: {},
    wormholes: {},
    bossReach: nodes.map((n) => n.id),
    ...overrides,
  };
};

const holed = (holeId: NodeId, fromId: NodeId, bypassId: NodeId): MapGraph => {
  const base = gridMap();
  const nodes = base.nodes.map((n) =>
    n.id === holeId ? { ...n, hole: true as const } : n,
  );
  return {
    ...base,
    nodes,
    edgeMarks: { [edgeKey(fromId, holeId)]: "wormhole" },
    wormholes: {
      [edgeKey(fromId, holeId)]: {
        from: fromId,
        hole: holeId,
        bypass: bypassId,
      },
    },
    bossReach: nodes.filter((n) => n.hole !== true).map((n) => n.id),
  };
};

describe("wormhole cost", () => {
  it("charges one per row and a half per lane", () => {
    expect(throwCost(node(2, 1), node(3, 1))).toBe(1);
    expect(throwCost(node(2, 1), node(2, 3))).toBe(1);
    expect(throwCost(node(2, 1), node(4, 2))).toBe(2.5);
    expect(throwCost(node(4, 2), node(2, 1))).toBe(2.5);
  });

  it("is symmetric and zero on the spot", () => {
    expect(throwCost(node(3, 2), node(3, 2))).toBe(0);
  });

  it("counts a half-lane step as reachable inside a whole budget", () => {
    expect(throwCost(node(2, 0), node(3, 1))).toBe(1.5);
    expect(throwCost(node(2, 0), node(3, 1)) <= 1).toBe(false);
    expect(throwCost(node(2, 0), node(3, 1)) <= 2).toBe(true);
  });
});

describe("gentle window", () => {
  it("covers the first two rides of a run", () => {
    expect(isGentleRide(0)).toBe(true);
    expect(isGentleRide(1)).toBe(true);
    expect(isGentleRide(GENTLE_RIDES)).toBe(false);
    expect(isGentleRide(9)).toBe(false);
  });

  it("caps the budget at two while gentle and at five after", () => {
    expect(budgetCapFor(0)).toBe(GENTLE_BUDGET);
    expect(budgetCapFor(1)).toBe(GENTLE_BUDGET);
    expect(budgetCapFor(2)).toBe(MAX_BUDGET);
  });

  it("never rolls backward on a gentle ride", () => {
    const map = holed("r3l1", "r2l1", "r3l0");
    for (let rides = 0; rides < GENTLE_RIDES; rides += 1) {
      const roll = rollThrow(
        { map, from: "r2l1", hole: "r3l1", visited: ["r0l1"], rides },
        scripted([5, 1], [0]),
      );
      expect(roll.direction).toBe("forward");
      expect(roll.gentle).toBe(true);
      expect(roll.budget).toBeLessThanOrEqual(GENTLE_BUDGET);
    }
  });

  it("reads the direction bit once the window closes", () => {
    const map = holed("r3l1", "r2l1", "r3l0");
    const back = rollThrow(
      { map, from: "r2l1", hole: "r3l1", visited: ["r0l1"], rides: 2 },
      scripted([3, 1], [0]),
    );
    expect(back.gentle).toBe(false);
    expect(back.direction).toBe("backward");
    const forward = rollThrow(
      { map, from: "r2l1", hole: "r3l1", visited: ["r0l1"], rides: 2 },
      scripted([3, 0], [0]),
    );
    expect(forward.direction).toBe("forward");
  });
});

describe("landing candidates", () => {
  const map = holed("r3l1", "r2l1", "r3l0");

  it("never offers the hole itself", () => {
    const ids = openLandings(map, "r2l1", []).map((n) => n.id);
    expect(ids).not.toContain("r3l1");
  });

  it("never offers the boss row", () => {
    const ids = openLandings(map, "r2l1", []).map((n) => n.id);
    expect(ids).not.toContain("r6l1");
  });

  it("never offers a cleared node", () => {
    const ids = openLandings(map, "r2l1", ["r1l0", "r0l1"]).map((n) => n.id);
    expect(ids).not.toContain("r1l0");
    expect(ids).not.toContain("r0l1");
  });

  it("never offers the node the ship is standing on", () => {
    const ids = openLandings(map, "r2l1", []).map((n) => n.id);
    expect(ids).not.toContain("r2l1");
  });

  it("never offers a node outside the boss-reach set", () => {
    const cut: MapGraph = { ...map, bossReach: ["r4l0", "r6l1"] };
    expect(openLandings(cut, "r2l1", []).map((n) => n.id)).toEqual(["r4l0"]);
  });

  it("signs the row delta by direction", () => {
    const forward = landingCandidates(map, "r3l0", [], 5, "forward");
    const backward = landingCandidates(map, "r3l0", [], 5, "backward");
    expect(forward.every((n) => n.row > 3)).toBe(true);
    expect(backward.every((n) => n.row < 3)).toBe(true);
    expect(forward.some((n) => n.row === 3)).toBe(false);
    expect(backward.some((n) => n.row === 3)).toBe(false);
  });

  it("keeps every candidate inside the budget", () => {
    for (const budget of [1, 2, 3, 4, 5]) {
      const origin = nodeById(map).get("r2l1");
      expect(origin).toBeDefined();
      if (origin === undefined) continue;
      for (const dir of ["forward", "backward"] as const) {
        for (const found of landingCandidates(map, "r2l1", [], budget, dir)) {
          expect(throwCost(origin, found)).toBeLessThanOrEqual(budget);
        }
      }
    }
  });

  it("lets a budget of one reach nothing when the only same-lane node is the hole", () => {
    expect(landingCandidates(map, "r2l1", [], 1, "forward")).toEqual([]);
  });

  it("lets a budget of one land straight ahead when that lane is open", () => {
    const found = landingCandidates(map, "r2l0", [], 1, "forward").map(
      (n) => n.id,
    );
    expect(found).toEqual(["r3l0"]);
  });

  it("lets a budget of two reach the half-lane neighbours and two rows on", () => {
    const found = landingCandidates(map, "r2l1", [], 2, "forward")
      .map((n) => n.id)
      .sort();
    expect(found).toEqual(["r3l0", "r3l2", "r4l1"]);
  });

  it("reaches two rows out only at budget two or more", () => {
    expect(
      landingCandidates(map, "r2l1", [], 1, "forward").some(
        (n) => n.row === 4,
      ),
    ).toBe(false);
    expect(
      landingCandidates(map, "r2l1", [], 2, "forward").some(
        (n) => n.row === 4,
      ),
    ).toBe(true);
  });

  it("reaches backward across the whole budget", () => {
    const found = landingCandidates(map, "r4l1", [], 2, "backward")
      .map((n) => n.id)
      .sort();
    expect(found).toEqual(["r2l1", "r3l0", "r3l2"]);
  });
});

describe("rollThrow", () => {
  const map = holed("r3l1", "r2l1", "r3l0");
  const base = { map, from: "r2l1", hole: "r3l1", visited: ["r0l1"] };

  it("returns a landing inside the rolled budget", () => {
    const roll = rollThrow({ ...base, rides: 5 }, scripted([4, 0], [2]));
    expect(roll.landing).not.toBeNull();
    expect(roll.budget).toBe(4);
    expect(roll.cost).toBeLessThanOrEqual(roll.budget);
    expect(roll.fallback).toBe("none");
  });

  it("clamps a scripted budget to the gentle cap", () => {
    const roll = rollThrow({ ...base, rides: 0 }, scripted([5], [0]));
    expect(roll.budget).toBe(GENTLE_BUDGET);
  });

  it("lands on a half-lane candidate and reports the 0.5 cost", () => {
    const roll = rollThrow({ ...base, rides: 0 }, scripted([2, 0], [0]));
    expect(roll.landing).toBe("r3l0");
    expect(roll.cost).toBe(1.5);
    expect(roll.rows).toBe(1);
  });

  it("never lands on a cleared node", () => {
    const roll = rollThrow(
      { ...base, rides: 9, visited: ["r0l1", "r3l0", "r3l2"] },
      scripted([2, 0], [0]),
    );
    expect(["r3l0", "r3l2"]).not.toContain(roll.landing);
  });

  it("lands backward on an unexplored node", () => {
    const roll = rollThrow(
      { map, from: "r4l1", hole: "r5l1", visited: ["r0l1"], rides: 4 },
      scripted([3, 1], [0]),
    );
    expect(roll.direction).toBe("backward");
    expect(roll.landing).not.toBeNull();
    expect(roll.rows).toBeLessThan(0);
    expect(roll.landing).not.toBe("r0l1");
  });

  it("turns around when the rolled direction has no candidates", () => {
    const roll = rollThrow(
      { map, from: "r1l1", hole: "r2l1", visited: ["r0l1"], rides: 4 },
      scripted([1, 1], [0]),
    );
    expect(roll.direction).toBe("backward");
    expect(roll.fallback).toBe("direction");
    expect(roll.landing).not.toBeNull();
    expect((roll.rows ?? 0) > 0).toBe(true);
  });

  it("falls back to the nearest forward node when the budget cannot reach", () => {
    const sparse: MapGraph = {
      ...map,
      nodes: map.nodes.filter(
        (n) => n.row === 0 || n.row === 2 || n.row === 5 || n.row === BOSS_ROW,
      ),
    };
    const roll = rollThrow(
      {
        map: { ...sparse, bossReach: sparse.nodes.map((n) => n.id) },
        from: "r2l1",
        hole: "r3l1",
        visited: ["r0l1"],
        rides: 0,
      },
      scripted([1], [0]),
    );
    expect(roll.fallback).toBe("nearest");
    expect(roll.landing).toBe("r5l1");
    expect(roll.cost).toBeGreaterThan(roll.budget);
  });

  it("stalls only when nothing at all is open", () => {
    const dead: MapGraph = {
      ...map,
      bossReach: ["r6l1"],
    };
    const roll = rollThrow(
      { map: dead, from: "r2l1", hole: "r3l1", visited: [], rides: 0 },
      scripted([2], [0]),
    );
    expect(roll.landing).toBeNull();
    expect(roll.fallback).toBe("stalled");
    expect(roll.cost).toBe(0);
  });

  it("is a pure function of the source", () => {
    const a = rollThrow({ ...base, rides: 7 }, scripted([3, 0], [1]));
    const b = rollThrow({ ...base, rides: 7 }, scripted([3, 0], [1]));
    expect(a).toEqual(b);
  });
});

describe("bypass target", () => {
  const map = holed("r3l1", "r2l1", "r3l0");

  it("takes the generator's precomputed alternate", () => {
    expect(bypassTargetFor(map, "r2l1", "r3l1", [])).toBe("r3l0");
  });

  it("picks another open exit when the alternate is already cleared", () => {
    expect(bypassTargetFor(map, "r2l1", "r3l1", ["r3l0"])).toBe("r3l2");
  });

  it("never routes into the hole", () => {
    const target = bypassTargetFor(map, "r2l1", "r3l1", ["r3l0", "r3l2"]);
    expect(target).toBeNull();
  });

  it("prefers an unmarked exit over a marked one", () => {
    const mined: MapGraph = {
      ...map,
      edgeMarks: { ...map.edgeMarks, [edgeKey("r2l1", "r3l0")]: "mine" },
      wormholes: {
        [edgeKey("r2l1", "r3l1")]: {
          from: "r2l1",
          hole: "r3l1",
          bypass: "r3l0",
        },
      },
    };
    expect(bypassTargetFor(mined, "r2l1", "r3l1", ["r3l0"])).toBe("r3l2");
  });
});

describe("generated maps", () => {
  it("always throws a real ride from every wormhole edge of S2-S6", () => {
    for (const sector of [2, 3, 4, 5, 6]) {
      for (let seed = 1; seed <= 40; seed += 1) {
        const map = generateSectorMap(createStreams(seed).map, sector);
        for (const record of Object.values(map.wormholes)) {
          for (let rides = 0; rides < 4; rides += 1) {
            for (let budget = 1; budget <= MAX_BUDGET; budget += 1) {
              for (const bit of [0, 1]) {
                const roll = rollThrow(
                  {
                    map,
                    from: record.from,
                    hole: record.hole,
                    visited: ["r0l1"],
                    rides,
                  },
                  scripted([budget, bit], [0]),
                );
                const label = `S${String(sector)}/${String(seed)} ${record.hole}`;
                expect(roll.landing, label).not.toBeNull();
                expect(roll.landing, label).not.toBe(record.from);
                expect(roll.landing, label).not.toBe(record.hole);
                const landing =
                  roll.landing === null
                    ? undefined
                    : nodeById(map).get(roll.landing);
                expect(landing?.hole, label).toBeUndefined();
                expect(landing?.row, label).not.toBe(map.shape.bossRow);
                expect(map.bossReach, label).toContain(roll.landing);
                if (roll.fallback === "none") {
                  expect(roll.cost, label).toBeLessThanOrEqual(roll.budget);
                  if (roll.gentle) expect(roll.rows, label).toBeGreaterThan(0);
                }
              }
            }
          }
        }
      }
    }
  });

  it("always finds a bypass from every wormhole edge of S2-S6", () => {
    for (const sector of [2, 3, 4, 5, 6]) {
      for (let seed = 1; seed <= 40; seed += 1) {
        const map = generateSectorMap(createStreams(seed).map, sector);
        for (const record of Object.values(map.wormholes)) {
          const target = bypassTargetFor(map, record.from, record.hole, [
            "r0l1",
          ]);
          expect(target, `S${String(sector)}/${String(seed)}`).not.toBeNull();
          expect(target).not.toBe(record.hole);
        }
      }
    }
  });
});
