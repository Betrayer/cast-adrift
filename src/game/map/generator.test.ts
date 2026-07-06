import { describe, expect, it } from "vitest";
import { createStreams } from "@/services/rng";
import {
  BOSS_NODE_ID,
  generateSectorMap,
  START_NODE_ID,
} from "@/game/map/generator";
import {
  areConnected,
  BOSS_ROW,
  GATE_ROW,
  outgoingEdges,
  type MapGraph,
  type NodeType,
} from "@/game/map/types";

const generate = (seed: number): MapGraph =>
  generateSectorMap(createStreams(seed).map, 1);

const countTypes = (map: MapGraph): Record<NodeType, number> => {
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
  for (const node of map.nodes) counts[node.type] += 1;
  return counts;
};

const bossReachable = (map: MapGraph): boolean => {
  const seen = new Set<string>([START_NODE_ID]);
  const queue = [START_NODE_ID];
  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur === undefined) break;
    if (cur === BOSS_NODE_ID) return true;
    for (const next of outgoingEdges(map, cur)) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen.has(BOSS_NODE_ID);
};

const reachableCount = (map: MapGraph): number => {
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
  return seen.size;
};

describe("map generator", () => {
  it("holds all sector guarantees across 200 seeds", () => {
    for (let seed = 1; seed <= 200; seed += 1) {
      const map = generate(seed);
      const counts = countTypes(map);
      const label = `seed ${String(seed)}`;

      expect(counts.start, label).toBe(1);
      expect(counts.boss, label).toBe(1);
      expect(counts.shipyard, label).toBe(2);
      expect(counts.shop, label).toBe(2);
      expect(counts.elite, label).toBeGreaterThanOrEqual(2);
      expect(counts.elite, label).toBeLessThanOrEqual(3);
      expect(counts.event, label).toBeGreaterThanOrEqual(4);
      expect(counts.event, label).toBeLessThanOrEqual(5);
      expect(counts.anomaly, label).toBe(2);
      expect(counts.beacon, label).toBe(1);
      expect(counts.miniboss, label).toBeGreaterThanOrEqual(1);
      expect(counts.miniboss, label).toBeLessThanOrEqual(2);

      for (const node of map.nodes) {
        if (node.type === "elite") expect(node.row, label).toBeGreaterThanOrEqual(3);
        if (node.type === "shipyard") {
          expect(node.row, label).toBeGreaterThanOrEqual(4);
          expect(node.row, label).toBeLessThanOrEqual(13);
        }
        if (node.type === "beacon") {
          expect(node.row, label).toBeGreaterThanOrEqual(5);
          expect(node.row, label).toBeLessThanOrEqual(11);
        }
        if (node.type === "miniboss") expect(node.row, label).toBe(GATE_ROW);
        if (node.type === "boss") expect(node.row, label).toBe(BOSS_ROW);
      }

      for (const [a, b] of map.edges) {
        const na = map.nodes.find((n) => n.id === a);
        const nb = map.nodes.find((n) => n.id === b);
        if (na === undefined || nb === undefined) continue;
        const special =
          na.type !== "battle" &&
          na.type !== "start" &&
          na.type !== "boss" &&
          na.type !== "miniboss";
        if (special && na.type === nb.type) {
          throw new Error(`${label}: adjacent identical special ${na.type} ${a}-${b}`);
        }
      }

      expect(bossReachable(map), label).toBe(true);
      expect(reachableCount(map), label).toBe(map.nodes.length);
    }
  });

  it("routes every path through the mini-boss gate row", () => {
    const map = generate(99);
    const belowGate = map.nodes.filter((n) => n.row === GATE_ROW - 1);
    for (const node of belowGate) {
      const outs = outgoingEdges(map, node.id);
      expect(outs.length).toBeGreaterThan(0);
      for (const next of outs) {
        const target = map.nodes.find((n) => n.id === next);
        expect(target?.row).toBe(GATE_ROW);
        expect(target?.type).toBe("miniboss");
      }
    }
  });

  it("keeps start connected only forward and boss reachable from row 14", () => {
    const map = generate(42);
    expect(map.nodes.filter((n) => n.row === BOSS_ROW - 1).every((n) =>
      areConnected(map, n.id, BOSS_NODE_ID),
    )).toBe(true);
  });

  it("produces a stable snapshot for seed 42", () => {
    const map = generate(42);
    const summary = map.nodes.map((n) => `${n.id}:${n.type}`).join(",");
    expect(summary).toMatchSnapshot();
  });
});
