import { describe, expect, it } from "vitest";
import { SECTORS, sectorDef, sectorMotif } from "@/data/sectors";
import { createStreams } from "@/services/rng";
import {
  bossNodeIdFor,
  bossReachOf,
  generateSectorMap,
  START_NODE_ID,
} from "@/game/map/generator";
import { bandWindowOf } from "@/game/map/holeBand";
import { mostElitesOnMap } from "@/game/map/elitePath";
import {
  areConnected,
  bandBridges,
  bandOf,
  edgeKey,
  nodeById,
  outgoingEdges,
  type HoleBand,
  type MapGraph,
  type MapNode,
  type NodeId,
  type NodeType,
} from "@/game/map/types";
import {
  EXTRA_ROWS_FACES,
  extraRowsFor,
  GENTLE_RIDES,
  LANE_SHIFT_FACES,
  laneShiftFor,
  rollThrow,
  type ThrowSource,
} from "@/game/map/wormhole";

const generate = (seed: number, sector = 1): MapGraph =>
  generateSectorMap(createStreams(seed).map, sector);

const countTypes = (map: MapGraph, pocket = false): Record<NodeType, number> => {
  const counts = {
    start: 0,
    battle: 0,
    elite: 0,
    miniboss: 0,
    shop: 0,
    shipyard: 0,
    event: 0,
    anomaly: 0,
    beacon: 0,
    boss: 0,
  };
  for (const node of map.nodes) {
    if ((node.pocket === true) !== pocket) continue;
    counts[node.type] += 1;
  }
  return counts;
};

const reachable = (
  map: MapGraph,
  closed: (id: string) => boolean = () => false,
): Set<string> => {
  const seen = new Set<string>([START_NODE_ID]);
  const queue = [START_NODE_ID];
  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur === undefined) break;
    for (const next of outgoingEdges(map, cur)) {
      if (!seen.has(next) && !closed(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen;
};

const pocketCount = (map: MapGraph): number =>
  map.nodes.filter((n) => n.pocket === true).length / 2;

describe("map generator", () => {
  it("holds every sector's own guarantees across 60 seeds", () => {
    for (const def of SECTORS) {
      const shape = def.shape;
      const bossId = bossNodeIdFor(def.id);
      for (let seed = 1; seed <= 60; seed += 1) {
        const map = generate(seed, def.id);
        const counts = countTypes(map);
        const label = `S${String(def.id)} seed ${String(seed)}`;

        expect(counts.start, label).toBe(1);
        expect(counts.boss, label).toBe(1);
        expect(counts.shipyard, label).toBe(shape.quotas.shipyards);
        expect(counts.shop, label).toBe(shape.quotas.shops);
        expect(counts.beacon, label).toBe(shape.quotas.beacons);
        expect(counts.elite, label).toBeGreaterThanOrEqual(shape.quotas.elites[0]);
        expect(counts.elite, label).toBeLessThanOrEqual(shape.quotas.elites[1]);
        expect(counts.miniboss, label).toBeGreaterThanOrEqual(1);
        expect(counts.miniboss, label).toBeLessThanOrEqual(2);
        expect(counts.event, label).toBeGreaterThanOrEqual(1);
        expect(counts.anomaly, label).toBeGreaterThanOrEqual(1);
        expect(counts.event, label).toBeLessThanOrEqual(shape.quotas.events[1]);
        expect(counts.anomaly, label).toBeLessThanOrEqual(shape.quotas.anomalies);

        for (const node of map.nodes) {
          if (node.pocket === true) {
            expect(node.lane, label).toBe(shape.lanes);
            continue;
          }
          expect(node.lane, label).toBeLessThan(shape.lanes);
          if (node.type === "elite") expect(node.row, label).toBeGreaterThanOrEqual(3);
          if (node.type === "miniboss") expect(node.row, label).toBe(shape.gateRow);
          if (node.type === "boss") expect(node.row, label).toBe(shape.bossRow);
          if (node.type === "anomaly") {
            expect(node.tierWindow, label).toEqual(shape.anomalyTiers);
          }
        }

        expect(map.shape.bossRow, label).toBe(shape.bossRow);
        expect(map.shape.gateRow, label).toBe(shape.gateRow);
        expect(map.shape.lanes, label).toBe(shape.lanes);
        expect(reachable(map).has(bossId), label).toBe(true);
        expect(reachable(map).size, label).toBe(map.nodes.length);
      }
    }
  });

  it("gives the five sectors five different shapes", () => {
    const shapes = SECTORS.map((def) => {
      const map = generate(7, def.id);
      return `${String(map.shape.bossRow)}/${String(map.shape.gateRow)}/${String(map.shape.lanes)}`;
    });
    expect(new Set(shapes).size).toBe(SECTORS.length);
  });

  it("routes every path through the sector's own gate row", () => {
    for (const def of SECTORS) {
      const map = generate(99, def.id);
      const belowGate = map.nodes.filter((n) => n.row === def.shape.gateRow - 1);
      expect(belowGate.length).toBeGreaterThan(0);
      for (const node of belowGate) {
        const outs = outgoingEdges(map, node.id);
        expect(outs.length).toBeGreaterThan(0);
        for (const next of outs) {
          const target = map.nodes.find((n) => n.id === next);
          expect(target?.row).toBe(def.shape.gateRow);
          expect(target?.type).toBe("miniboss");
        }
      }
    }
  });

  it("keeps the last ordinary row connected to the boss", () => {
    for (const def of SECTORS) {
      const map = generate(42, def.id);
      const bossId = bossNodeIdFor(def.id);
      const last = map.nodes.filter((n) => n.row === def.shape.bossRow - 1);
      expect(last.every((n) => areConnected(map, n.id, bossId))).toBe(true);
    }
  });

  it("splits sector 3 into two sides that only meet at the gate", () => {
    const shape = sectorDef(3).shape;
    const split = sectorMotif(3, "riftSplit");
    expect(split).toBeDefined();
    if (split === undefined) return;
    expect(split.to).toBe(shape.gateRow - 1);
    const mid = Math.floor(shape.lanes / 2);
    for (let seed = 1; seed <= 20; seed += 1) {
      const map = generate(seed, 3);
      const byId = new Map(map.nodes.map((n) => [n.id, n]));
      for (const [a, b] of map.edges) {
        const na = byId.get(a);
        const nb = byId.get(b);
        if (na === undefined || nb === undefined) continue;
        if (nb.row < split.from || nb.row > split.to) continue;
        if (na.row < split.from) continue;
        expect(na.lane < mid, `seed ${String(seed)} ${a}->${b}`).toBe(
          nb.lane < mid,
        );
      }
    }
  });

  it("scales the motif counts with the longer road", () => {
    expect(sectorMotif(1, "cache")?.count).toBe(3);
    expect(sectorMotif(2, "mineEdges")?.count).toBe(5);
    expect(sectorMotif(5, "collapse")?.rows).toBe(3);
    expect(sectorMotif(6, "inversion")?.rows).toBe(4);
    expect(sectorMotif(6, "storm")?.rows).toBe(4);
  });

  it("marks the motif's mine edges in sector 2 without sealing a node's only free exit", () => {
    const motif = sectorMotif(2, "mineEdges");
    expect(motif).toBeDefined();
    if (motif === undefined) return;
    for (let seed = 1; seed <= 20; seed += 1) {
      const map = generate(seed, 2);
      const label = `seed ${String(seed)}`;
      const byId = nodeById(map);
      const marks = Object.entries(map.edgeMarks);
      const mines = marks.filter(([, mark]) => mark === "mine");
      expect(mines.length, label).toBe(motif.count);
      for (const [key] of marks) {
        const hit = map.edges.find(([a, b]) => edgeKey(a, b) === key);
        expect(hit, `${key} must be a real edge`).toBeDefined();
      }
      for (const [key] of mines) {
        const to = key.split("->")[1];
        expect(byId.get(to ?? "")?.hole, `${key} never mines into a spot`).not.toBe(
          true,
        );
      }
      for (const node of map.nodes) {
        if (node.hole === true) continue;
        const free = outgoingEdges(map, node.id).filter(
          (to) => byId.get(to)?.hole !== true,
        );
        if (free.length === 0) continue;
        const clean = free.filter(
          (to) => map.edgeMarks[edgeKey(node.id, to)] !== "mine",
        );
        expect(clean.length, `${label} ${node.id} keeps a free exit`).toBeGreaterThan(0);
      }
    }
  });

  it("gives sector 4 rows a blessed lane and a different cursed lane", () => {
    const map = generate(11, 4);
    const rows = new Set(
      map.nodes.filter((n) => n.blessing !== undefined).map((n) => n.row),
    );
    expect(rows.size).toBeGreaterThan(3);
    for (const row of rows) {
      const inRow = map.nodes.filter((n) => n.row === row);
      const blessed = inRow.filter((n) => n.blessing === "blessed");
      const cursed = inRow.filter((n) => n.blessing === "cursed");
      expect(blessed.length).toBeLessThanOrEqual(1);
      expect(cursed.length).toBeLessThanOrEqual(1);
      for (const node of blessed) {
        expect(cursed.some((c) => c.lane === node.lane)).toBe(false);
      }
    }
  });

  it("marks unstable rows in sector 5 and never spends past the motif budget", () => {
    const shape = sectorDef(5).shape;
    const collapse = sectorMotif(5, "collapse");
    expect(collapse?.m).toBe("collapse");
    if (collapse === undefined) return;
    for (let seed = 1; seed <= 20; seed += 1) {
      const map = generate(seed, 5);
      const unstableRows = new Set(
        map.nodes.filter((n) => n.unstable === true).map((n) => n.row),
      );
      expect(unstableRows.size, `seed ${String(seed)}`).toBe(collapse.rows);
      const counts = countTypes(map);
      const lost =
        shape.quotas.events[1] -
        counts.event +
        (shape.quotas.anomalies - counts.anomaly);
      expect(lost, `seed ${String(seed)}`).toBeLessThanOrEqual(
        shape.quotas.events[1] - shape.quotas.events[0] + collapse.rows,
      );
    }
  });

  it("hangs pockets off the main lanes and rejoins them three rows down", () => {
    for (const def of SECTORS) {
      const shape = def.shape;
      for (let seed = 1; seed <= 20; seed += 1) {
        const map = generate(seed, def.id);
        const label = `S${String(def.id)} seed ${String(seed)}`;
        const pocketNodes = map.nodes.filter((n) => n.pocket === true);
        expect(pocketNodes.length % 2, label).toBe(0);
        expect(pocketNodes.length, label).toBeLessThanOrEqual(
          shape.pockets[1] * 2,
        );
        const byId = new Map(map.nodes.map((n) => [n.id, n]));
        for (const node of pocketNodes) {
          expect(node.lane, label).toBe(shape.lanes);
          const outs = outgoingEdges(map, node.id);
          expect(outs.length, `${label} ${node.id} exits`).toBe(1);
          const ins = map.edges.filter(([, b]) => b === node.id);
          expect(ins.length, `${label} ${node.id} entries`).toBe(1);
        }
        const fights = pocketNodes.filter((n) => n.type === "battle");
        expect(fights.length, label).toBe(pocketNodes.length / 2);
        for (const fight of fights) {
          const entryId = map.edges.find(([, b]) => b === fight.id)?.[0];
          expect(entryId, label).toBeDefined();
          if (entryId === undefined) continue;
          expect(map.edgeMarks[edgeKey(entryId, fight.id)], label).toBe(
            "pocket",
          );
          expect(byId.get(entryId)?.pocket, label).toBeUndefined();
          expect(byId.get(entryId)?.row, label).toBe(fight.row - 1);
          const rewardId = outgoingEdges(map, fight.id)[0];
          const reward = rewardId === undefined ? undefined : byId.get(rewardId);
          expect(reward?.pocket, label).toBe(true);
          const rejoinId =
            reward === undefined ? undefined : outgoingEdges(map, reward.id)[0];
          const rejoin = rejoinId === undefined ? undefined : byId.get(rejoinId);
          expect(rejoin?.pocket, label).toBeUndefined();
          expect(rejoin?.row, label).toBe(fight.row + 2);
          if (reward?.type === "anomaly") {
            expect(reward.tierWindow?.[1], label).toBeGreaterThan(
              shape.anomalyTiers[1] === 5 ? 4 : shape.anomalyTiers[1] - 1,
            );
          }
        }
        expect(countTypes(map, true).boss, label).toBe(0);
        expect(countTypes(map, true).miniboss, label).toBe(0);
      }
    }
  });

  it("places pockets up to the quota and close to it on average", () => {
    const sweep = 300;
    for (const def of SECTORS) {
      let total = 0;
      for (let seed = 1; seed <= sweep; seed += 1) {
        const count = pocketCount(generate(seed, def.id));
        expect(count, `S${String(def.id)} seed ${String(seed)}`).toBeLessThanOrEqual(
          def.shape.pockets[1],
        );
        total += count;
      }
      expect(total / sweep, `S${String(def.id)} mean pockets`).toBeGreaterThanOrEqual(
        0.85 * def.shape.pockets[0],
      );
    }
  });

  it("marks the motif's caches in sector 1", () => {
    const motif = sectorMotif(1, "cache");
    expect(motif).toBeDefined();
    for (let seed = 1; seed <= 20; seed += 1) {
      const map = generate(seed, 1);
      expect(map.nodes.filter((n) => n.cache === true).length).toBe(motif?.count);
    }
  });

  it("marks the motif's inverted and storm rows in sector 6, never the same one", () => {
    const shape = sectorDef(6).shape;
    const inversion = sectorMotif(6, "inversion");
    const storm = sectorMotif(6, "storm");
    expect(inversion).toBeDefined();
    expect(storm).toBeDefined();
    for (let seed = 1; seed <= 25; seed += 1) {
      const map = generate(seed, 6);
      const label = `seed ${String(seed)}`;
      const inverted = new Set(
        map.nodes.filter((n) => n.inverted === true).map((n) => n.row),
      );
      const stormy = new Set(
        map.nodes.filter((n) => n.storm === true).map((n) => n.row),
      );
      expect(inverted.size, label).toBe(inversion?.rows);
      expect(stormy.size, label).toBe(storm?.rows);
      for (const row of stormy) expect(inverted.has(row), label).toBe(false);
      for (const row of [...inverted, ...stormy]) {
        expect(row, label).not.toBe(shape.gateRow);
        expect(row, label).not.toBe(shape.bossRow);
        expect(row, label).toBeGreaterThan(1);
      }
      for (const node of map.nodes) {
        if (node.inverted !== true) continue;
        const peers = map.nodes.filter(
          (n) => n.row === node.row && n.pocket !== true,
        );
        for (const peer of peers) expect(peer.inverted, label).toBe(true);
      }
    }
  });

  it("never marks a campaign sector with causality rows", () => {
    for (let sector = 1; sector <= 5; sector += 1) {
      const map = generate(7, sector);
      expect(map.nodes.some((n) => n.inverted === true)).toBe(false);
      expect(map.nodes.some((n) => n.storm === true)).toBe(false);
    }
  });

  it("produces a stable snapshot per sector for seed 42", () => {
    for (const def of SECTORS) {
      const map = generate(42, def.id);
      const summary = map.nodes
        .map((n) => {
          const marks = [
            n.cache === true ? "c" : "",
            n.unstable === true ? "u" : "",
            n.blessing === "blessed" ? "+" : n.blessing === "cursed" ? "-" : "",
            n.inverted === true ? "i" : "",
            n.storm === true ? "s" : "",
            n.hole === true ? "h" : "",
          ].join("");
          return `${n.id}:${n.type}${marks === "" ? "" : `:${marks}`}`;
        })
        .join(",");
      expect(`S${String(def.id)} ${summary}`).toMatchSnapshot();
    }
  });
});

const HOLE_SECTORS: readonly number[] = [2, 3, 4, 5, 6];
const BAND_SWEEP = 300;
const BAND_DEPTHS: readonly number[] = [2, 3];
const DEEP_TOLERANCE = 0.08;

const sweepCache = new Map<number, readonly MapGraph[]>();

const sweepOf = (sector: number): readonly MapGraph[] => {
  const cached = sweepCache.get(sector);
  if (cached !== undefined) return cached;
  const maps = Array.from({ length: BAND_SWEEP }, (_, i) => generate(i + 1, sector));
  sweepCache.set(sector, maps);
  return maps;
};

const bandOrThrow = (map: MapGraph, label: string): HoleBand => {
  const band = bandOf(map);
  if (band === null) throw new Error(`${label} carries no band`);
  return band;
};

const inRows = (row: number, rows: readonly [number, number]): boolean =>
  row >= rows[0] && row <= rows[1];

const nearestLaneFirst =
  (lane: number) =>
  (a: MapNode, b: MapNode): number =>
    Math.abs(a.lane - lane) - Math.abs(b.lane - lane) || a.lane - b.lane;

const playReachable = (
  map: MapGraph,
  bridges: readonly [NodeId, NodeId][],
): Set<NodeId> => {
  const byId = nodeById(map);
  const links = new Map<NodeId, NodeId[]>();
  for (const [a, b] of [...map.edges, ...bridges]) {
    links.set(a, [...(links.get(a) ?? []), b]);
  }
  const seen = new Set<NodeId>([START_NODE_ID]);
  const queue: NodeId[] = [START_NODE_ID];
  for (let head = 0; head < queue.length; head += 1) {
    const cur = queue[head];
    if (cur === undefined) continue;
    for (const next of links.get(cur) ?? []) {
      if (seen.has(next) || byId.get(next)?.hole === true) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  return seen;
};

const tape = (ints: readonly number[]): ThrowSource => {
  let at = 0;
  return {
    int: (min, max) => {
      const value = ints[at] ?? min;
      at += 1;
      return Math.max(min, Math.min(max, value));
    },
  };
};

const MARKS: readonly (keyof MapNode)[] = [
  "cache",
  "unstable",
  "inverted",
  "storm",
  "blessing",
  "pocket",
];

describe("the black-hole band", () => {
  it("never places a hole in sector 1", () => {
    for (let seed = 1; seed <= 40; seed += 1) {
      const map = generate(seed, 1);
      expect(map.nodes.some((n) => n.hole === true)).toBe(false);
      expect(Object.keys(map.wormholes)).toHaveLength(0);
      expect(map.spots).toHaveLength(0);
      expect(bandOf(map)).toBeNull();
    }
  });

  it("keeps a window between the gate and the boss that fits the deepest band", () => {
    for (const sector of HOLE_SECTORS) {
      const shape = sectorDef(sector).shape;
      const [lo, hi] = bandWindowOf(shape);
      const label = `S${String(sector)}`;
      expect(lo, label).toBeGreaterThan(shape.gateRow + 1);
      expect(hi, label).toBeLessThan(shape.bossRow - 1);
      expect(hi - lo + 1, label).toBeGreaterThanOrEqual(Math.max(...BAND_DEPTHS));
    }
  });

  for (const sector of HOLE_SECTORS) {
    const tag = `S${String(sector)}`;

    it(`carves a full-width band inside its window on every seed of ${tag}`, () => {
      const shape = sectorDef(sector).shape;
      const window = bandWindowOf(shape);
      const misses: string[] = [];
      let deep = 0;
      sweepOf(sector).forEach((map, index) => {
        const label = `${tag} seed ${String(index + 1)}`;
        const band = bandOrThrow(map, label);
        const [start, end] = band.rows;
        const depth = end - start + 1;
        if (!BAND_DEPTHS.includes(depth)) misses.push(`${label} depth ${String(depth)}`);
        if (depth === Math.max(...BAND_DEPTHS)) deep += 1;
        if (start < window[0] || end > window[1]) misses.push(`${label} outside window`);
        if (map.spots.length !== 1 || map.spots[0] !== band.spot) {
          misses.push(`${label} ships more than the band's spot`);
        }
        if (band.spot.rows[0] !== start || band.spot.rows[1] !== end) {
          misses.push(`${label} spot rows`);
        }
        if (band.spot.lanes[0] !== 0 || band.spot.lanes[1] !== shape.lanes - 1) {
          misses.push(`${label} spot lanes ${band.spot.lanes.join("-")}`);
        }
        const byId = nodeById(map);
        for (const [key, mark] of Object.entries(map.edgeMarks)) {
          if (mark !== "mine") continue;
          const [from, to] = key.split("->");
          if (byId.get(from ?? "")?.hole === true || byId.get(to ?? "")?.hole === true) {
            misses.push(`${label} ${key} mines an edge the band swallowed`);
          }
        }
        const onFoot = reachable(map, (id) => byId.get(id)?.hole === true);
        for (const id of onFoot) {
          const node = byId.get(id);
          if (node !== undefined && node.row > end) {
            misses.push(`${label} ${id} is reachable on foot past the band`);
          }
        }
        const rowsIn = map.nodes.filter((n) => n.pocket !== true && inRows(n.row, band.rows));
        const holes = map.nodes.filter((n) => n.hole === true);
        if (
          [...band.spot.nodes].sort().join() !==
          rowsIn.map((n) => n.id).sort().join()
        ) {
          misses.push(`${label} the spot is not every node of the band rows`);
        }
        if (holes.length !== rowsIn.length) misses.push(`${label} a hole outside the band`);
        for (let row = start; row <= end; row += 1) {
          if (!rowsIn.some((n) => n.row === row)) misses.push(`${label} band row ${String(row)} is empty`);
        }
        for (const node of rowsIn) {
          if (node.hole !== true || node.spot !== band.spot.id) {
            misses.push(`${label} ${node.id} is not swallowed`);
          }
          if (node.type !== "battle") misses.push(`${label} ${node.id} was populated`);
          for (const mark of MARKS) {
            if (node[mark] !== undefined) misses.push(`${label} ${node.id} carries ${mark}`);
          }
        }
      });
      expect(misses).toEqual([]);
      const motif = sectorMotif(sector, "blackHoles");
      expect(motif).toBeDefined();
      expect(
        Math.abs(deep / BAND_SWEEP - (motif?.deepChance ?? 0)),
        `${tag} deep share ${String(deep)}/${String(BAND_SWEEP)}`,
      ).toBeLessThanOrEqual(DEEP_TOLERANCE);
    });

    it(`hangs a wormhole off every rim node of ${tag} and bypasses to the far rim`, () => {
      const misses: string[] = [];
      sweepOf(sector).forEach((map, index) => {
        const label = `${tag} seed ${String(index + 1)}`;
        const band = bandOrThrow(map, label);
        const byId = nodeById(map);
        if (band.rim.length === 0) misses.push(`${label} has no rim`);
        if (band.farRim.length === 0) misses.push(`${label} has no far rim`);
        const farRim = band.farRim
          .map((id) => byId.get(id))
          .filter((n): n is MapNode => n !== undefined);
        const entries = map.edges.filter(
          ([a, b]) => byId.get(b)?.hole === true && byId.get(a)?.hole !== true,
        );
        if (Object.keys(map.wormholes).length !== entries.length) {
          misses.push(`${label} wormholes ${String(Object.keys(map.wormholes).length)} vs entries ${String(entries.length)}`);
        }
        for (const [from, into] of entries) {
          const key = edgeKey(from, into);
          if (!band.rim.includes(from)) misses.push(`${label} ${key} enters off the rim`);
          if (map.edgeMarks[key] !== "wormhole") misses.push(`${label} ${key} is unmarked`);
          const record = map.wormholes[key];
          if (record?.from !== from || record.hole !== into) {
            misses.push(`${label} ${key} carries no record`);
            continue;
          }
          const origin = byId.get(from);
          const expected =
            origin === undefined
              ? undefined
              : [...farRim].sort(nearestLaneFirst(origin.lane))[0];
          if (record.bypass !== expected?.id) {
            misses.push(`${label} ${key} bypasses to ${record.bypass}, not ${String(expected?.id)}`);
          }
        }
        for (const id of band.rim) {
          const outs = outgoingEdges(map, id);
          if (outs.length === 0) misses.push(`${label} rim ${id} has no way on`);
          if (!outs.some((to) => map.wormholes[edgeKey(id, to)] !== undefined)) {
            misses.push(`${label} rim ${id} carries no wormhole`);
          }
          for (const to of outs) {
            if (byId.get(to)?.hole !== true) misses.push(`${label} rim ${id} walks around the band to ${to}`);
          }
        }
      });
      expect(misses).toEqual([]);
    });

    it(`lands every tape of a ride past the band of ${tag}`, () => {
      const misses: string[] = [];
      sweepOf(sector).forEach((map, index) => {
        const label = `${tag} seed ${String(index + 1)}`;
        const band = bandOrThrow(map, label);
        const byId = nodeById(map);
        const reach = new Set(map.bossReach);
        const farRow = band.rows[1] + 1;
        for (const from of band.rim) {
          const origin = byId.get(from);
          const record = Object.values(map.wormholes).find((w) => w.from === from);
          if (origin === undefined || record === undefined) {
            misses.push(`${label} rim ${from} has no record`);
            continue;
          }
          const request = {
            map,
            from,
            hole: record.hole,
            visited: [START_NODE_ID],
          };
          const gentle = rollThrow({ ...request, rides: 0 }, tape([]));
          if (gentle.landing !== record.bypass) {
            misses.push(`${label} ${from} gentle lands ${String(gentle.landing)}`);
          }
          for (let e = 1; e <= EXTRA_ROWS_FACES; e += 1) {
            for (let s = 1; s <= LANE_SHIFT_FACES; s += 1) {
              const at = `${label} ${from} faces ${String(e)}/${String(s)}`;
              const roll = rollThrow({ ...request, rides: GENTLE_RIDES }, tape([e, s]));
              const row = farRow + extraRowsFor(e);
              const aim = origin.lane + laneShiftFor(s);
              const expected = map.nodes
                .filter((n) => n.row === row && n.pocket !== true)
                .sort(nearestLaneFirst(aim))[0];
              const landed = roll.landing === null ? undefined : byId.get(roll.landing);
              if (landed === undefined) {
                misses.push(`${at} stalled`);
                continue;
              }
              if (roll.fallback !== "none") misses.push(`${at} fell back ${roll.fallback}`);
              if (landed.id !== expected?.id) misses.push(`${at} ${landed.id} not ${String(expected?.id)}`);
              if (landed.hole === true || landed.pocket === true) misses.push(`${at} ${landed.id} is not a landing`);
              if (landed.row >= map.shape.bossRow) misses.push(`${at} lands on the boss row`);
              if (landed.row - band.rows[1] < 1 || landed.row - band.rows[1] > 3) {
                misses.push(`${at} ${String(landed.row - band.rows[1])} rows past the band`);
              }
              if (!reach.has(landed.id)) misses.push(`${at} ${landed.id} is outside the boss reach`);
              if (roll.rows !== landed.row - origin.row) misses.push(`${at} rows ${String(roll.rows)}`);
            }
          }
        }
      });
      expect(misses).toEqual([]);
    });

    it(`keeps the boss in reach of every live node of ${tag}`, () => {
      const shape = sectorDef(sector).shape;
      const bossId = bossNodeIdFor(sector);
      const misses: string[] = [];
      sweepOf(sector).forEach((map, index) => {
        const label = `${tag} seed ${String(index + 1)}`;
        const band = bandOrThrow(map, label);
        const byId = nodeById(map);
        const bridges = bandBridges(map.nodes, band.rows);
        const reach = new Set(map.bossReach);
        const live = map.nodes.filter((n) => n.hole !== true);
        if (!reach.has(bossId)) misses.push(`${label} the boss is out of reach`);
        for (const node of live) {
          if (!reach.has(node.id)) misses.push(`${label} ${node.id} cannot reach the boss`);
        }
        for (const node of map.nodes) {
          if (node.hole === true && reach.has(node.id)) misses.push(`${label} hole ${node.id} is in reach`);
        }
        if (
          [...map.bossReach].sort().join() !==
          bossReachOf(map.nodes, map.edges, bossId, bridges).join()
        ) {
          misses.push(`${label} bossReach is not the bridged sweep`);
        }
        const cut = new Set(bossReachOf(map.nodes, map.edges, bossId));
        for (const node of live) {
          if (node.row < band.rows[0] && cut.has(node.id)) {
            misses.push(`${label} ${node.id} walks around the band`);
          }
        }
        const played = playReachable(map, bridges);
        if (played.size !== live.length) {
          misses.push(`${label} play reaches ${String(played.size)} of ${String(live.length)}`);
        }
        for (let row = 0; row <= shape.bossRow; row += 1) {
          if (inRows(row, band.rows)) continue;
          const alive = live.filter((n) => n.row === row && n.pocket !== true);
          if (alive.length === 0) misses.push(`${label} row ${String(row)} lost every node`);
        }
        for (const node of live) {
          if (node.id === bossId) continue;
          const onward = outgoingEdges(map, node.id).some(
            (to) => byId.get(to)?.hole !== true,
          );
          const bridged = band.rim.includes(node.id) && band.farRim.length > 0;
          if (!onward && !bridged) misses.push(`${label} ${node.id} is a dead end`);
        }
        const of = (type: NodeType): number =>
          live.filter((n) => n.pocket !== true && n.type === type).length;
        if (of("shipyard") !== shape.quotas.shipyards) misses.push(`${label} shipyards ${String(of("shipyard"))}`);
        if (of("shop") !== shape.quotas.shops) misses.push(`${label} shops ${String(of("shop"))}`);
        if (of("beacon") !== shape.quotas.beacons) misses.push(`${label} beacons ${String(of("beacon"))}`);
        if (of("elite") < shape.quotas.elites[0] || of("elite") > shape.quotas.elites[1]) {
          misses.push(`${label} elites ${String(of("elite"))}`);
        }
        if (of("event") < 1 || of("anomaly") < 1) misses.push(`${label} lost its events or anomalies`);
      });
      expect(misses).toEqual([]);
    });

    it(`keeps pockets and motif rows out of the band of ${tag}`, () => {
      const collapse = sectorMotif(sector, "collapse");
      const inversion = sectorMotif(sector, "inversion");
      const storm = sectorMotif(sector, "storm");
      const misses: string[] = [];
      sweepOf(sector).forEach((map, index) => {
        const label = `${tag} seed ${String(index + 1)}`;
        const band = bandOrThrow(map, label);
        const byId = nodeById(map);
        const before = (row: number): boolean => row < band.rows[0];
        const after = (row: number): boolean => row > band.rows[1];
        for (const fight of map.nodes.filter((n) => n.pocket === true && n.type === "battle")) {
          const entry = byId.get(map.edges.find(([, b]) => b === fight.id)?.[0] ?? "");
          const reward = byId.get(outgoingEdges(map, fight.id)[0] ?? "");
          const rejoin =
            reward === undefined ? undefined : byId.get(outgoingEdges(map, reward.id)[0] ?? "");
          if (entry === undefined || reward === undefined || rejoin === undefined) {
            misses.push(`${label} pocket ${fight.id} is broken`);
            continue;
          }
          const rows = [entry.row, fight.row, reward.row, rejoin.row];
          if (!rows.every(before) && !rows.every(after)) {
            misses.push(`${label} pocket ${fight.id} straddles the band`);
          }
          if (entry.hole === true || rejoin.hole === true) misses.push(`${label} pocket ${fight.id} touches a hole`);
        }
        for (const node of map.nodes) {
          if (!inRows(node.row, band.rows)) continue;
          for (const mark of MARKS) {
            if (node[mark] !== undefined) misses.push(`${label} ${node.id} carries ${mark} inside the band`);
          }
        }
        const rowsMarked = (key: "unstable" | "inverted" | "storm"): number =>
          new Set(map.nodes.filter((n) => n[key] === true).map((n) => n.row)).size;
        if (collapse !== undefined && rowsMarked("unstable") !== collapse.rows) {
          misses.push(`${label} unstable rows ${String(rowsMarked("unstable"))}`);
        }
        if (inversion !== undefined && rowsMarked("inverted") !== inversion.rows) {
          misses.push(`${label} inverted rows ${String(rowsMarked("inverted"))}`);
        }
        if (storm !== undefined && rowsMarked("storm") !== storm.rows) {
          misses.push(`${label} storm rows ${String(rowsMarked("storm"))}`);
        }
      });
      expect(misses).toEqual([]);
    });
  }

  it("drops a node out of bossReach when a hole cuts its only way on", () => {
    const nodes: MapNode[] = [
      { id: "r0l0", row: 0, lane: 0, type: "start" },
      { id: "r1l0", row: 1, lane: 0, type: "battle", hole: true },
      { id: "r1l1", row: 1, lane: 1, type: "battle" },
      { id: "r2l0", row: 2, lane: 0, type: "boss" },
    ];
    const edges: [NodeId, NodeId][] = [
      ["r0l0", "r1l0"],
      ["r0l0", "r1l1"],
      ["r1l0", "r2l0"],
      ["r1l1", "r2l0"],
    ];
    expect(bossReachOf(nodes, edges, "r2l0")).toEqual([
      "r0l0",
      "r1l1",
      "r2l0",
    ]);
  });

  it("bridges every rim node to every far-rim node, never through a pocket", () => {
    const nodes: MapNode[] = [
      { id: "r0l0", row: 0, lane: 0, type: "start" },
      { id: "r1l0", row: 1, lane: 0, type: "battle" },
      { id: "r1l1", row: 1, lane: 1, type: "battle" },
      { id: "r1l2", row: 1, lane: 2, type: "battle", pocket: true },
      { id: "r2l0", row: 2, lane: 0, type: "battle", hole: true },
      { id: "r2l1", row: 2, lane: 1, type: "battle", hole: true },
      { id: "r3l0", row: 3, lane: 0, type: "battle" },
      { id: "r3l2", row: 3, lane: 2, type: "event", pocket: true },
      { id: "r4l0", row: 4, lane: 0, type: "boss" },
    ];
    const edges: [NodeId, NodeId][] = [
      ["r0l0", "r1l0"],
      ["r0l0", "r1l1"],
      ["r1l0", "r2l0"],
      ["r1l1", "r2l1"],
      ["r2l0", "r3l0"],
      ["r2l1", "r3l0"],
      ["r3l0", "r4l0"],
    ];
    const bridges = bandBridges(nodes, [2, 2]);
    expect(bridges).toEqual([
      ["r1l0", "r3l0"],
      ["r1l1", "r3l0"],
    ]);
    expect(bandBridges(nodes, null)).toEqual([]);
    expect(bossReachOf(nodes, edges, "r4l0")).toEqual(["r3l0", "r4l0"]);
    expect(bossReachOf(nodes, edges, "r4l0", bridges)).toEqual([
      "r0l0",
      "r1l0",
      "r1l1",
      "r3l0",
      "r4l0",
    ]);
  });
});

const ELITE_SWEEP = 300;

describe("a contract's elite line", () => {
  const plain = (seed: number): MapGraph => generateSectorMap(createStreams(seed).map, 1);
  const lined = (seed: number, eliteLine: number): MapGraph =>
    generateSectorMap(createStreams(seed).map, 1, { eliteLine });

  it("meets two elites on one path on every S1 seed", () => {
    const short: number[] = [];
    for (let seed = 1; seed <= ELITE_SWEEP; seed += 1) {
      if (mostElitesOnMap(lined(seed, 2)) < 2) short.push(seed);
    }
    expect(short).toEqual([]);
  });

  it("redraws only the maps that missed the line, and leaves every other map as it was", () => {
    let redrawn = 0;
    for (let seed = 1; seed <= ELITE_SWEEP; seed += 1) {
      const free = plain(seed);
      const bound = lined(seed, 2);
      if (mostElitesOnMap(free) >= 2) {
        expect(JSON.stringify(bound), `seed ${String(seed)}`).toBe(JSON.stringify(free));
      } else {
        redrawn += 1;
        expect(JSON.stringify(bound), `seed ${String(seed)}`).not.toBe(JSON.stringify(free));
      }
    }
    expect(redrawn).toBeGreaterThan(0);
  });

  it("measures a gated boss row at the node the generator measured", () => {
    for (let seed = 1; seed <= 60; seed += 1) {
      const gated = generateSectorMap(createStreams(seed).map, 1, { bossAsGate: true, eliteLine: 2 });
      expect(gated.nodes.some((node) => node.type === "boss"), `seed ${String(seed)}`).toBe(false);
      expect(mostElitesOnMap(gated), `seed ${String(seed)}`).toBe(mostElitesOnMap(lined(seed, 2)));
      expect(mostElitesOnMap(gated), `seed ${String(seed)}`).toBeGreaterThanOrEqual(2);
    }
  });

  it("keeps every quota the plain map keeps", () => {
    for (let seed = 1; seed <= 60; seed += 1) {
      const map = lined(seed, 2);
      const count = (type: string): number =>
        map.nodes.filter((node) => node.pocket !== true && node.type === type).length;
      const quotas = sectorDef(1).shape.quotas;
      expect(count("elite"), `seed ${String(seed)}`).toBeGreaterThanOrEqual(quotas.elites[0]);
      expect(count("elite"), `seed ${String(seed)}`).toBeLessThanOrEqual(quotas.elites[1]);
      expect(count("shipyard"), `seed ${String(seed)}`).toBe(quotas.shipyards);
      expect(count("boss"), `seed ${String(seed)}`).toBe(1);
    }
  });
});
