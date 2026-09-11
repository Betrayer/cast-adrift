import { describe, expect, it } from "vitest";
import { SECTORS } from "@/data/sectors";
import { generateSectorMap, START_NODE_ID } from "@/game/map/generator";
import {
  forwardReach,
  forwardStations,
  isStationNode,
  STATION_TYPES,
} from "@/game/map/reach";
import { nodeById, outgoingEdges, type MapGraph } from "@/game/map/types";
import { createStreams } from "@/services/rng";

const SEEDS = 60;

const mapsFor = (sector: number): MapGraph[] =>
  Array.from({ length: SEEDS }, (_, i) =>
    generateSectorMap(createStreams(i + 1).map, sector),
  );

const walkOne = (map: MapGraph, from: string): string[] =>
  outgoingEdges(map, from).filter(
    (id) => nodeById(map).get(id)?.hole !== true,
  );

describe("the forward reach", () => {
  it("counts depth in rows, because every edge advances exactly one", () => {
    for (const sector of SECTORS) {
      for (const map of mapsFor(sector.id)) {
        const byId = nodeById(map);
        const origin = byId.get(START_NODE_ID);
        const reach = forwardReach(map, START_NODE_ID);
        expect(reach.get(START_NODE_ID)).toBe(0);
        for (const [id, rows] of reach) {
          const node = byId.get(id);
          expect(node).toBeDefined();
          expect(rows).toBe((node?.row ?? 0) - (origin?.row ?? 0));
        }
      }
    }
  });

  it("never admits a hole, a visited node or a node behind the ship", () => {
    for (const sector of SECTORS) {
      for (const map of mapsFor(sector.id)) {
        const byId = nodeById(map);
        const mid = map.nodes.find(
          (node) => node.row === 4 && node.hole !== true,
        );
        if (mid === undefined) continue;
        const blocked = walkOne(map, mid.id)[0];
        const visited = blocked === undefined ? [] : [blocked];
        const reach = forwardReach(map, mid.id, visited);
        for (const id of reach.keys()) {
          expect(byId.get(id)?.hole).not.toBe(true);
          expect(visited).not.toContain(id);
          expect(byId.get(id)?.row ?? 0).toBeGreaterThanOrEqual(mid.row);
        }
      }
    }
  });

  it("reaches only nodes a legal walk can actually reach", () => {
    for (const sector of SECTORS) {
      for (const map of mapsFor(sector.id)) {
        const reach = forwardReach(map, START_NODE_ID);
        const seen = new Set([START_NODE_ID]);
        const queue = [START_NODE_ID];
        for (let head = 0; head < queue.length; head += 1) {
          const id = queue[head];
          if (id === undefined) continue;
          for (const next of walkOne(map, id)) {
            if (seen.has(next)) continue;
            seen.add(next);
            queue.push(next);
          }
        }
        expect([...reach.keys()].sort()).toEqual([...seen].sort());
      }
    }
  });

  it("offers only stations ahead, sorted nearest first", () => {
    for (const sector of SECTORS) {
      for (const map of mapsFor(sector.id)) {
        const stations = forwardStations(map, START_NODE_ID);
        expect(stations.length).toBeGreaterThan(0);
        let previous = 0;
        for (const step of stations) {
          expect(STATION_TYPES).toContain(step.node.type);
          expect(isStationNode(step.node)).toBe(true);
          expect(step.node.row).not.toBe(map.shape.bossRow);
          expect(step.rows).toBeGreaterThanOrEqual(1);
          expect(step.rows).toBeGreaterThanOrEqual(previous);
          previous = step.rows;
        }
      }
    }
  });

  it("returns nothing from a node the graph does not carry", () => {
    const map = generateSectorMap(createStreams(3).map, 2);
    expect(forwardReach(map, "r99l9").size).toBe(0);
    expect(forwardStations(map, "r99l9")).toHaveLength(0);
  });
});
