import { describe, expect, it } from "vitest";
import { SECTORS, sectorDef } from "@/data/sectors";
import { createStreams } from "@/services/rng";
import {
  bossNodeIdFor,
  bossReachOf,
  generateSectorMap,
  START_NODE_ID,
} from "@/game/map/generator";
import {
  areConnected,
  edgeKey,
  outgoingEdges,
  type MapGraph,
  type MapNode,
  type NodeId,
  type NodeType,
} from "@/game/map/types";

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

const reachable = (map: MapGraph): Set<string> => {
  const seen = new Set<string>([START_NODE_ID]);
  const queue = [START_NODE_ID];
  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur === undefined) break;
    for (const next of outgoingEdges(map, cur)) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen;
};

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
    const split = shape.motifs.find((m) => m.m === "riftSplit");
    expect(split).toBeDefined();
    if (split?.m !== "riftSplit") return;
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

  it("marks mine edges in sector 2 without sealing a node's only exit", () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      const map = generate(seed, 2);
      const marks = Object.entries(map.edgeMarks);
      const mines = marks.filter(([, mark]) => mark === "mine");
      expect(mines.length, `seed ${String(seed)}`).toBeGreaterThan(0);
      for (const [key] of marks) {
        const hit = map.edges.find(([a, b]) => edgeKey(a, b) === key);
        expect(hit, `${key} must be a real edge`).toBeDefined();
      }
      for (const node of map.nodes) {
        const outs = outgoingEdges(map, node.id);
        if (outs.length === 0) continue;
        const clean = outs.filter(
          (to) => map.edgeMarks[edgeKey(node.id, to)] !== "mine",
        );
        expect(clean.length, `${node.id} keeps a free exit`).toBeGreaterThan(0);
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
    const collapse = shape.motifs.find((m) => m.m === "collapse");
    expect(collapse?.m).toBe("collapse");
    if (collapse?.m !== "collapse") return;
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
        expect(pocketNodes.length, label).toBeGreaterThanOrEqual(
          shape.pockets[0] * 2,
        );
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

  it("marks two caches in sector 1", () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      const map = generate(seed, 1);
      expect(map.nodes.filter((n) => n.cache === true).length).toBe(2);
    }
  });

  it("marks three inverted and three storm rows in sector 6, never the same one", () => {
    const shape = sectorDef(6).shape;
    for (let seed = 1; seed <= 25; seed += 1) {
      const map = generate(seed, 6);
      const inverted = new Set(
        map.nodes.filter((n) => n.inverted === true).map((n) => n.row),
      );
      const storm = new Set(
        map.nodes.filter((n) => n.storm === true).map((n) => n.row),
      );
      expect(inverted.size).toBe(3);
      expect(storm.size).toBe(3);
      for (const row of storm) expect(inverted.has(row)).toBe(false);
      for (const row of [...inverted, ...storm]) {
        expect(row).not.toBe(shape.gateRow);
        expect(row).not.toBe(shape.bossRow);
        expect(row).toBeGreaterThan(1);
      }
      for (const node of map.nodes) {
        if (node.inverted !== true) continue;
        const peers = map.nodes.filter(
          (n) => n.row === node.row && n.pocket !== true,
        );
        for (const peer of peers) expect(peer.inverted).toBe(true);
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
const HOLE_SWEEP = 200;

const holeCountFor = (sector: number): number => {
  const motif = sectorDef(sector).shape.motifs.find(
    (m) => m.m === "blackHoles",
  );
  return motif?.m === "blackHoles" ? motif.count : 0;
};

const playReachable = (map: MapGraph): Set<NodeId> => {
  const holes = new Set(
    map.nodes.filter((n) => n.hole === true).map((n) => n.id),
  );
  const seen = new Set<NodeId>([START_NODE_ID]);
  const queue: NodeId[] = [START_NODE_ID];
  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur === undefined) break;
    for (const next of outgoingEdges(map, cur)) {
      if (holes.has(next) || seen.has(next)) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  return seen;
};

describe("black holes", () => {
  it("never places a hole in sector 1", () => {
    for (let seed = 1; seed <= 40; seed += 1) {
      const map = generate(seed, 1);
      expect(map.nodes.some((n) => n.hole === true)).toBe(false);
      expect(Object.keys(map.wormholes)).toHaveLength(0);
    }
  });

  it("holds every hole invariant across 200 seeds in S2-S6", () => {
    const degraded: Record<number, number> = {};
    for (const sector of HOLE_SECTORS) {
      const shape = sectorDef(sector).shape;
      const want = holeCountFor(sector);
      const lastRow = Math.min(shape.bossRow - 2, shape.gateRow + 3);
      let short = 0;
      for (let seed = 1; seed <= HOLE_SWEEP; seed += 1) {
        const map = generate(seed, sector);
        const label = `S${String(sector)} seed ${String(seed)}`;
        const byId = new Map(map.nodes.map((n) => [n.id, n]));
        const holes = map.nodes.filter((n) => n.hole === true);
        expect(holes.length, label).toBeLessThanOrEqual(want);
        if (holes.length < want) short += 1;

        const rows = holes.map((n) => n.row).sort((a, b) => a - b);
        rows.forEach((row, index) => {
          expect(row, label).toBeGreaterThanOrEqual(4);
          expect(row, label).toBeLessThanOrEqual(lastRow);
          expect(row, label).not.toBe(shape.gateRow);
          const prev = rows[index - 1];
          if (prev !== undefined) expect(row - prev, label).toBeGreaterThanOrEqual(3);
        });

        for (const hole of holes) {
          expect(hole.pocket, label).toBeUndefined();
          expect(hole.type, label).toBe("battle");
          const feeders = map.edges.filter(([, b]) => b === hole.id);
          expect(feeders.length, `${label} ${hole.id} has a feeder`).toBeGreaterThan(0);
          for (const [from] of feeders) {
            const key = edgeKey(from, hole.id);
            expect(map.edgeMarks[key], `${label} ${key} is a wormhole`).toBe(
              "wormhole",
            );
            const record = map.wormholes[key];
            expect(record, `${label} ${key} carries a record`).toBeDefined();
            if (record === undefined) continue;
            expect(record.from, label).toBe(from);
            expect(record.hole, label).toBe(hole.id);
            const bypass = byId.get(record.bypass);
            expect(bypass, `${label} bypass exists`).toBeDefined();
            expect(bypass?.hole, label).toBeUndefined();
            expect(bypass?.row, label).toBe(hole.row);
            expect(areConnected(map, from, record.bypass), label).toBe(true);
            expect(map.edgeMarks[edgeKey(from, record.bypass)], label).toBeUndefined();
          }
        }

        for (const node of map.nodes) {
          if (node.hole === true) continue;
          const outs = outgoingEdges(map, node.id);
          if (outs.length === 0) continue;
          const clean = outs.filter(
            (to) =>
              byId.get(to)?.hole !== true &&
              map.edgeMarks[edgeKey(node.id, to)] !== "mine",
          );
          expect(clean.length, `${label} ${node.id} keeps a clean exit`).toBeGreaterThan(0);
        }

        const reached = playReachable(map);
        const enterable = map.nodes.filter((n) => n.hole !== true);
        expect(reached.size, `${label} every node stays enterable`).toBe(
          enterable.length,
        );
        expect(reached.has(bossNodeIdFor(sector)), label).toBe(true);

        const reach = new Set(map.bossReach);
        expect(reach.has(bossNodeIdFor(sector)), label).toBe(true);
        for (const node of enterable) {
          expect(reach.has(node.id), `${label} ${node.id} reaches the boss`).toBe(
            true,
          );
        }
        for (const hole of holes) {
          expect(reach.has(hole.id), `${label} ${hole.id} is not a landing`).toBe(
            false,
          );
        }
        expect([...reach].sort()).toEqual(
          bossReachOf(map.nodes, map.edges, bossNodeIdFor(sector)),
        );
      }
      degraded[sector] = short;
    }
    for (const sector of HOLE_SECTORS) {
      const short = degraded[sector] ?? HOLE_SWEEP;
      expect(
        short / HOLE_SWEEP,
        `S${String(sector)} degraded on ${String(short)}/${String(HOLE_SWEEP)} seeds`,
      ).toBeLessThan(0.35);
    }
  });

  it("keeps pockets off hole nodes", () => {
    for (const sector of HOLE_SECTORS) {
      for (let seed = 1; seed <= 40; seed += 1) {
        const map = generate(seed, sector);
        const byId = new Map(map.nodes.map((n) => [n.id, n]));
        for (const [a, b] of map.edges) {
          if (byId.get(b)?.pocket !== true) continue;
          expect(byId.get(a)?.hole, `S${String(sector)} seed ${String(seed)}`).not.toBe(
            true,
          );
        }
        for (const node of map.nodes.filter((n) => n.pocket === true)) {
          const rejoin = outgoingEdges(map, node.id)[0];
          if (rejoin === undefined) continue;
          expect(byId.get(rejoin)?.hole).not.toBe(true);
        }
      }
    }
  });

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
});
