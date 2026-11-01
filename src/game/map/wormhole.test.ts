import { describe, expect, it } from "vitest";
import { createStreams } from "@/services/rng";
import { generateSectorMap } from "@/game/map/generator";
import {
  edgeKey,
  nodeById,
  nodeId,
  type EdgeMark,
  type MapGraph,
  type MapNode,
  type NodeId,
  type WormholeEdge,
} from "@/game/map/types";
import {
  bypassTargetFor,
  canBypass,
  EXTRA_ROWS_FACES,
  extraRowsFor,
  farRimRowFor,
  GENTLE_RIDES,
  isGentleRide,
  LANE_SHIFT_FACES,
  laneShiftFor,
  MAX_EXTRA_ROWS,
  MAX_LANE_SHIFT,
  openLandings,
  rollThrow,
  softLandThrow,
  type ThrowSource,
} from "@/game/map/wormhole";

const scripted = (ints: readonly number[]): ThrowSource => {
  let intAt = 0;
  return {
    int: (min, max) => {
      const value = ints[intAt] ?? min;
      intAt += 1;
      return Math.max(min, Math.min(max, value));
    },
  };
};

const untouchable: ThrowSource = {
  int: () => {
    throw new Error("the tape was read");
  },
};

interface Recorded {
  ints: [number, number][];
  source: ThrowSource;
}

const recording = (ints: readonly number[]): Recorded => {
  const tape = scripted(ints);
  const log: Recorded = {
    ints: [],
    source: {
      int: (min, max) => {
        log.ints.push([min, max]);
        return tape.int(min, max);
      },
    },
  };
  return log;
};

const LANES = 3;
const BOSS_ROW = 9;
const BAND: readonly [number, number] = [3, 4];
const RIM_ROW = BAND[0] - 1;
const FAR_ROW = BAND[1] + 1;
const SPOT = "spot:band";
const START = nodeId(0, 1);

const inBand = (row: number): boolean => row >= BAND[0] && row <= BAND[1];

const cell = (row: number, lane: number, extra: Partial<MapNode> = {}): MapNode => ({
  id: nodeId(row, lane),
  row,
  lane,
  type: "battle",
  ...(inBand(row) ? { hole: true as const, spot: SPOT } : {}),
  ...extra,
});

interface BandOptions {
  drop?: readonly NodeId[];
  extra?: readonly MapNode[];
  reach?: (node: MapNode) => boolean;
}

const bandMap = (options: BandOptions = {}): MapGraph => {
  const dropped = new Set(options.drop ?? []);
  const grid: MapNode[] = [cell(0, 1, { type: "start" })];
  for (let row = 1; row < BOSS_ROW; row += 1) {
    for (let lane = 0; lane < LANES; lane += 1) grid.push(cell(row, lane));
  }
  grid.push(cell(BOSS_ROW, 1, { type: "boss" }));
  const nodes = [...grid.filter((n) => !dropped.has(n.id)), ...(options.extra ?? [])];
  const edges: [NodeId, NodeId][] = [];
  for (const from of nodes) {
    if (from.pocket === true) continue;
    for (const to of nodes) {
      if (to.pocket === true || to.row !== from.row + 1) continue;
      const wide = from.type === "start" || to.type === "boss";
      if (!wide && Math.abs(to.lane - from.lane) > 1) continue;
      edges.push([from.id, to.id]);
    }
  }
  const farRim = nodes.filter((n) => n.row === FAR_ROW && n.pocket !== true);
  const edgeMarks: Record<string, EdgeMark> = {};
  const wormholes: Record<string, WormholeEdge> = {};
  const byId = new Map(nodes.map((n) => [n.id, n]));
  for (const [from, to] of edges) {
    const source = byId.get(from);
    if (source === undefined || source.hole === true) continue;
    if (byId.get(to)?.hole !== true) continue;
    const bypass = [...farRim].sort(
      (a, b) =>
        Math.abs(a.lane - source.lane) - Math.abs(b.lane - source.lane) ||
        a.lane - b.lane,
    )[0];
    if (bypass === undefined) continue;
    edgeMarks[edgeKey(from, to)] = "wormhole";
    wormholes[edgeKey(from, to)] = { from, hole: to, bypass: bypass.id };
  }
  const holes = nodes.filter((n) => n.hole === true);
  const reach = options.reach ?? (() => true);
  return {
    nodes,
    edges,
    shape: { bossRow: BOSS_ROW, gateRow: 1, lanes: LANES },
    edgeMarks,
    wormholes,
    spots: [
      {
        id: SPOT,
        nodes: holes.map((n) => n.id),
        rows: BAND,
        lanes: [0, LANES - 1],
      },
    ],
    bossReach: nodes
      .filter((n) => n.hole !== true && reach(n))
      .map((n) => n.id)
      .sort(),
  };
};

const rowOf = (row: number): NodeId[] =>
  Array.from({ length: LANES }, (_, lane) => nodeId(row, lane));

const rim = (lane: number): NodeId => nodeId(RIM_ROW, lane);
const holeAhead = (lane: number): NodeId => nodeId(BAND[0], lane);
const far = (lane: number, extra = 0): NodeId => nodeId(FAR_ROW + extra, lane);

const clampLane = (lane: number): number => Math.max(0, Math.min(LANES - 1, lane));

const FACE_TO_EXTRA: readonly number[] = [0, 0, 0, 1, 1, 2];
const FACE_TO_SHIFT: readonly number[] = [0, 0, 0, -1, -1, 1, 1, -2, 2];

const faceOf = (table: readonly number[], value: number): number =>
  table.indexOf(value) + 1;

const tally = (values: readonly number[]): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const value of values) out[String(value)] = (out[String(value)] ?? 0) + 1;
  return out;
};

describe("the throw tables", () => {
  it("splits six extra-row faces 3/2/1 over zero, one and two rows", () => {
    expect(EXTRA_ROWS_FACES).toBe(6);
    const faces = Array.from({ length: EXTRA_ROWS_FACES }, (_, i) =>
      extraRowsFor(i + 1),
    );
    expect(faces).toEqual(FACE_TO_EXTRA);
    expect(tally(faces)).toEqual({ "0": 3, "1": 2, "2": 1 });
    expect(MAX_EXTRA_ROWS).toBe(2);
  });

  it("splits nine lane-shift faces 1/2/3/2/1 over minus two to plus two", () => {
    expect(LANE_SHIFT_FACES).toBe(9);
    const faces = Array.from({ length: LANE_SHIFT_FACES }, (_, i) =>
      laneShiftFor(i + 1),
    );
    expect(faces).toEqual(FACE_TO_SHIFT);
    expect(tally(faces)).toEqual({ "-2": 1, "-1": 2, "0": 3, "1": 2, "2": 1 });
    expect(MAX_LANE_SHIFT).toBe(2);
  });

  it("reads a face off either table as no move at all", () => {
    expect(extraRowsFor(0)).toBe(0);
    expect(extraRowsFor(EXTRA_ROWS_FACES + 1)).toBe(0);
    expect(laneShiftFor(0)).toBe(0);
    expect(laneShiftFor(LANE_SHIFT_FACES + 1)).toBe(0);
  });
});

describe("the gentle window", () => {
  it("covers the first two rides of a run", () => {
    expect(isGentleRide(0)).toBe(true);
    expect(isGentleRide(1)).toBe(true);
    expect(isGentleRide(GENTLE_RIDES)).toBe(false);
    expect(isGentleRide(9)).toBe(false);
  });

  it("never reads the tape on a gentle ride", () => {
    const map = bandMap();
    for (let rides = 0; rides < GENTLE_RIDES; rides += 1) {
      const roll = rollThrow(
        { map, from: rim(1), hole: holeAhead(1), visited: [START], rides },
        untouchable,
      );
      expect(roll.gentle).toBe(true);
      expect(roll.extra).toBe(0);
      expect(roll.laneShift).toBe(0);
      expect(roll.direction).toBe("forward");
      expect(roll.fallback).toBe("none");
    }
  });

  it("lands a gentle ride on the far rim in its own lane", () => {
    const map = bandMap();
    for (let lane = 0; lane < LANES; lane += 1) {
      for (let rides = 0; rides < GENTLE_RIDES; rides += 1) {
        const roll = rollThrow(
          { map, from: rim(lane), hole: holeAhead(lane), visited: [START], rides },
          untouchable,
        );
        expect(roll.landing).toBe(far(lane));
        expect(roll.rows).toBe(FAR_ROW - RIM_ROW);
      }
    }
  });

  it("finds the far rim from any hole of the band", () => {
    const map = bandMap();
    expect(farRimRowFor(map, holeAhead(0))).toBe(FAR_ROW);
    expect(farRimRowFor(map, nodeId(BAND[1], 2))).toBe(FAR_ROW);
    expect(farRimRowFor(map, far(1))).toBeNull();
  });
});

describe("a chaotic ride", () => {
  const map = bandMap();
  const base = { map, from: rim(1), hole: holeAhead(1), visited: [START] };

  it("reads exactly two ints, the extra rows first and the lane shift second", () => {
    const log = recording([4, 6]);
    const roll = rollThrow({ ...base, rides: GENTLE_RIDES }, log.source);
    expect(log.ints).toEqual([
      [1, EXTRA_ROWS_FACES],
      [1, LANE_SHIFT_FACES],
    ]);
    expect(roll.extra).toBe(1);
    expect(roll.laneShift).toBe(1);
    expect(roll.gentle).toBe(false);
  });

  it("treats an exhausted tape as a neutral throw", () => {
    const roll = rollThrow({ ...base, rides: GENTLE_RIDES + 3 }, scripted([]));
    expect(roll.gentle).toBe(false);
    expect(roll.extra).toBe(0);
    expect(roll.laneShift).toBe(0);
    expect(roll.landing).toBe(far(1));
    expect(roll.fallback).toBe("none");
  });

  it("lands one to three rows past the band with the rolled shift", () => {
    for (let lane = 0; lane < LANES; lane += 1) {
      for (let e = 1; e <= EXTRA_ROWS_FACES; e += 1) {
        for (let s = 1; s <= LANE_SHIFT_FACES; s += 1) {
          const label = `lane ${String(lane)} faces ${String(e)}/${String(s)}`;
          const roll = rollThrow(
            {
              map,
              from: rim(lane),
              hole: holeAhead(lane),
              visited: [START],
              rides: GENTLE_RIDES,
            },
            scripted([e, s]),
          );
          const extra = FACE_TO_EXTRA[e - 1] ?? 0;
          const shift = FACE_TO_SHIFT[s - 1] ?? 0;
          expect(roll.extra, label).toBe(extra);
          expect(roll.laneShift, label).toBe(shift);
          expect(roll.fallback, label).toBe("none");
          expect(roll.landing, label).toBe(far(clampLane(lane + shift), extra));
          const landed = roll.landing === null ? undefined : nodeById(map).get(roll.landing);
          const past = (landed?.row ?? 0) - BAND[1];
          expect(past, label).toBeGreaterThanOrEqual(1);
          expect(past, label).toBeLessThanOrEqual(1 + MAX_EXTRA_ROWS);
          expect(roll.rows, label).toBe((landed?.row ?? 0) - RIM_ROW);
        }
      }
    }
  });

  it("clamps a shift off the map to the nearest lane that exists", () => {
    const left = rollThrow(
      { map, from: rim(0), hole: holeAhead(0), visited: [START], rides: GENTLE_RIDES },
      scripted([1, faceOf(FACE_TO_SHIFT, -2)]),
    );
    expect(left.laneShift).toBe(-2);
    expect(left.landing).toBe(far(0));
    const right = rollThrow(
      { map, from: rim(2), hole: holeAhead(2), visited: [START], rides: GENTLE_RIDES },
      scripted([1, faceOf(FACE_TO_SHIFT, 2)]),
    );
    expect(right.laneShift).toBe(2);
    expect(right.landing).toBe(far(2));
  });

  it("breaks a tie between two lanes toward the lower one", () => {
    const gap = bandMap({ drop: [far(1), far(1, 1)] });
    const gentle = rollThrow(
      { map: gap, from: rim(1), hole: holeAhead(1), visited: [START], rides: 0 },
      untouchable,
    );
    expect(gentle.landing).toBe(far(0));
    const chaotic = rollThrow(
      { map: gap, from: rim(0), hole: holeAhead(0), visited: [START], rides: GENTLE_RIDES },
      scripted([faceOf(FACE_TO_EXTRA, 1), faceOf(FACE_TO_SHIFT, 1)]),
    );
    expect(chaotic.landing).toBe(far(0, 1));
    expect(chaotic.fallback).toBe("none");
  });

  it("falls back to a nearer row when the landing row is closed", () => {
    const roll = rollThrow(
      { ...base, visited: [START, ...rowOf(FAR_ROW + 2)], rides: GENTLE_RIDES },
      scripted([faceOf(FACE_TO_EXTRA, 2), 1]),
    );
    expect(roll.extra).toBe(2);
    expect(roll.landing).toBe(far(1, 1));
    expect(roll.fallback).toBe("nearest");
  });

  it("falls back to a further row once every row down to the far rim is closed", () => {
    const gentle = rollThrow(
      { ...base, visited: [START, ...rowOf(FAR_ROW)], rides: 0 },
      untouchable,
    );
    expect(gentle.landing).toBe(far(1, 1));
    expect(gentle.fallback).toBe("nearest");
    const chaotic = rollThrow(
      {
        ...base,
        visited: [START, ...rowOf(FAR_ROW), ...rowOf(FAR_ROW + 1)],
        rides: GENTLE_RIDES,
      },
      scripted([faceOf(FACE_TO_EXTRA, 1), 1]),
    );
    expect(chaotic.landing).toBe(far(1, 2));
    expect(chaotic.fallback).toBe("nearest");
  });

  it("stalls only when nothing past the band is open", () => {
    const beyond: NodeId[] = [];
    for (let row = FAR_ROW; row < BOSS_ROW; row += 1) beyond.push(...rowOf(row));
    const dead = rollThrow(
      { ...base, visited: [START, ...beyond], rides: GENTLE_RIDES },
      scripted([6, 9]),
    );
    expect(dead.landing).toBeNull();
    expect(dead.fallback).toBe("stalled");
    expect(dead.rows).toBe(0);
    const last = nodeId(BOSS_ROW - 1, 0);
    const alive = rollThrow(
      {
        ...base,
        visited: [START, ...beyond.filter((id) => id !== last)],
        rides: GENTLE_RIDES,
      },
      scripted([6, 9]),
    );
    expect(alive.landing).toBe(last);
    expect(alive.fallback).toBe("nearest");
  });

  it("never lands on a pocket, a cleared node or a node outside the boss reach", () => {
    const pocket = cell(FAR_ROW, LANES, { pocket: true });
    const pocketed = bandMap({ extra: [pocket] });
    const reach = rollThrow(
      { map: pocketed, from: rim(2), hole: holeAhead(2), visited: [START], rides: GENTLE_RIDES },
      scripted([1, faceOf(FACE_TO_SHIFT, 2)]),
    );
    expect(reach.landing).toBe(far(2));
    const cleared = rollThrow(
      {
        map: pocketed,
        from: rim(2),
        hole: holeAhead(2),
        visited: [START, far(2)],
        rides: GENTLE_RIDES,
      },
      scripted([1, faceOf(FACE_TO_SHIFT, 2)]),
    );
    expect(cleared.landing).toBe(far(1));
    const cut = bandMap({ extra: [pocket], reach: (n) => n.id !== far(1) });
    const outside = rollThrow(
      { map: cut, from: rim(2), hole: holeAhead(2), visited: [START, far(2)], rides: GENTLE_RIDES },
      scripted([1, faceOf(FACE_TO_SHIFT, 2)]),
    );
    expect(outside.landing).toBe(far(0));
  });

  it("is a pure function of the source", () => {
    const a = rollThrow({ ...base, rides: 7 }, scripted([5, 8]));
    const b = rollThrow({ ...base, rides: 7 }, scripted([5, 8]));
    expect(a).toEqual(b);
  });
});

describe("the landing pool", () => {
  const map = bandMap();

  it("never offers a hole, the boss row, the ship's own node or a cleared node", () => {
    const ids = openLandings(map, rim(1), [START, far(0)]).map((n) => n.id);
    for (const id of [holeAhead(1), nodeId(BAND[1], 0), nodeId(BOSS_ROW, 1), rim(1), START, far(0)]) {
      expect(ids).not.toContain(id);
    }
    expect(ids).toContain(far(1));
  });

  it("never offers a node outside the boss-reach set", () => {
    const cut: MapGraph = { ...map, bossReach: [far(0), nodeId(BOSS_ROW, 1)] };
    expect(openLandings(cut, rim(1), []).map((n) => n.id)).toEqual([far(0)]);
  });
});

describe("the bypass target", () => {
  const map = bandMap();

  it("takes the declared far-rim node in the ship's lane", () => {
    for (let lane = 0; lane < LANES; lane += 1) {
      expect(bypassTargetFor(map, rim(lane), holeAhead(lane), [])).toBe(far(lane));
    }
  });

  it("falls back to the nearest legal far-rim node once the declared one is cleared", () => {
    expect(bypassTargetFor(map, rim(1), holeAhead(1), [far(1)])).toBe(far(0));
    expect(bypassTargetFor(map, rim(1), holeAhead(1), [far(1), far(0)])).toBe(far(2));
    expect(bypassTargetFor(map, rim(0), holeAhead(0), [far(0)])).toBe(far(1));
  });

  it("falls back to the far rim for an edge with no record", () => {
    const bare: MapGraph = { ...map, wormholes: {} };
    expect(bypassTargetFor(bare, rim(2), holeAhead(2), [])).toBe(far(2));
    expect(canBypass(bare, rim(2), holeAhead(2), [])).toBe(false);
  });

  it("never routes into a pocket or past a far rim that is all cleared", () => {
    const pocketed = bandMap({ extra: [cell(FAR_ROW, LANES, { pocket: true })] });
    expect(
      bypassTargetFor(pocketed, rim(2), holeAhead(2), rowOf(FAR_ROW)),
    ).toBeNull();
    expect(canBypass(pocketed, rim(2), holeAhead(2), rowOf(FAR_ROW))).toBe(false);
  });

  it("is offered on a wormhole edge and nowhere else", () => {
    expect(canBypass(map, rim(1), holeAhead(1), [])).toBe(true);
    expect(canBypass(map, rim(1), holeAhead(0), [])).toBe(true);
    expect(canBypass(map, nodeId(1, 1), rim(1), [])).toBe(false);
  });
});

describe("the soft landing", () => {
  const map = bandMap();

  it("is the gentle landing whatever the ride count", () => {
    for (let lane = 0; lane < LANES; lane += 1) {
      const soft = softLandThrow(map, rim(lane), holeAhead(lane), [START]);
      const gentle = rollThrow(
        { map, from: rim(lane), hole: holeAhead(lane), visited: [START], rides: 0 },
        untouchable,
      );
      expect(soft).toEqual(gentle);
      expect(soft.landing).toBe(far(lane));
    }
  });

  it("follows the gentle fallbacks and stalls where the gentle ride would", () => {
    expect(softLandThrow(map, rim(1), holeAhead(1), [START, far(1)]).landing).toBe(
      far(0),
    );
    const beyond: NodeId[] = [];
    for (let row = FAR_ROW; row < BOSS_ROW; row += 1) beyond.push(...rowOf(row));
    const stalled = softLandThrow(map, rim(1), holeAhead(1), beyond);
    expect(stalled.landing).toBeNull();
    expect(stalled.fallback).toBe("stalled");
  });
});

describe("generated maps", () => {
  it("lands a gentle ride where the bypass goes, from every wormhole edge of S2-S6", () => {
    for (const sector of [2, 3, 4, 5, 6]) {
      for (let seed = 1; seed <= 40; seed += 1) {
        const map = generateSectorMap(createStreams(seed).map, sector);
        const records = Object.values(map.wormholes);
        expect(records.length, `S${String(sector)}/${String(seed)}`).toBeGreaterThan(0);
        for (const record of records) {
          const label = `S${String(sector)}/${String(seed)} ${record.from}->${record.hole}`;
          const target = bypassTargetFor(map, record.from, record.hole, [START]);
          expect(target, label).toBe(record.bypass);
          const gentle = rollThrow(
            { map, from: record.from, hole: record.hole, visited: [START], rides: 0 },
            untouchable,
          );
          expect(gentle.landing, label).toBe(record.bypass);
          expect(softLandThrow(map, record.from, record.hole, [START]).landing, label).toBe(
            record.bypass,
          );
        }
      }
    }
  });
});
