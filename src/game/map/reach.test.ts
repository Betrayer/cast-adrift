import { describe, expect, it } from "vitest";
import { SECTORS } from "@/data/sectors";
import {
  bossNodeIdFor,
  generateSectorMap,
  START_NODE_ID,
} from "@/game/map/generator";
import {
  forwardReach,
  forwardStations,
  isStationNode,
  STATION_TYPES,
} from "@/game/map/reach";
import {
  bandOf,
  nodeById,
  outgoingEdges,
  type HoleBand,
  type MapGraph,
} from "@/game/map/types";
import { createStreams } from "@/services/rng";

const SEEDS = 60;

const must = <T>(value: T | undefined): T => {
  if (value === undefined) throw new Error("missing fixture value");
  return value;
};

const firstFarRim = (band: HoleBand): string => must(band.farRim[0]);

const mapsFor = (sector: number): MapGraph[] =>
  Array.from({ length: SEEDS }, (_, i) =>
    generateSectorMap(createStreams(i + 1).map, sector),
  );

const HOLE_SECTORS: readonly number[] = [2, 3, 4, 5, 6];

const walkOne = (map: MapGraph, from: string): string[] => [
  ...outgoingEdges(map, from).filter(
    (id) => nodeById(map).get(id)?.hole !== true,
  ),
  ...(bandOf(map)?.rim.includes(from) === true ? (bandOf(map)?.farRim ?? []) : []),
];

const bandOrThrow = (map: MapGraph): HoleBand => {
  const band = bandOf(map);
  if (band === null) throw new Error("the map carries no band");
  return band;
};

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

  it("reaches only nodes a legal walk, a ride or a bypass can actually reach", () => {
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

  it("crosses the band from every rim node to every far-rim node", () => {
    for (const sector of HOLE_SECTORS) {
      for (const map of mapsFor(sector)) {
        const band = bandOrThrow(map);
        const byId = nodeById(map);
        for (const rim of band.rim) {
          const reach = forwardReach(map, rim);
          const origin = byId.get(rim);
          for (const far of band.farRim) {
            expect(reach.get(far), `S${String(sector)} ${rim}->${far}`).toBe(
              (byId.get(far)?.row ?? 0) - (origin?.row ?? 0),
            );
          }
          expect(reach.get(firstFarRim(band)), `S${String(sector)} ${rim}`).toBe(
            band.rows[1] - band.rows[0] + 2,
          );
        }
      }
    }
  });

  it("reaches the boss from the start of every hole sector without entering a hole", () => {
    for (const sector of HOLE_SECTORS) {
      for (const map of mapsFor(sector)) {
        const byId = nodeById(map);
        const reach = forwardReach(map, START_NODE_ID);
        expect(reach.get(bossNodeIdFor(sector))).toBe(map.shape.bossRow);
        for (const id of reach.keys()) expect(byId.get(id)?.hole).not.toBe(true);
        for (const node of map.nodes) {
          if (node.hole === true) continue;
          expect(reach.has(node.id), `S${String(sector)} ${node.id}`).toBe(true);
        }
      }
    }
  });

  it("drops a cleared far-rim node from the crossing and keeps the rest", () => {
    const map = must(mapsFor(2)[0]);
    const band = bandOrThrow(map);
    const rim = must(band.rim[0]);
    const cleared = firstFarRim(band);
    const reach = forwardReach(map, rim, [cleared]);
    expect(reach.has(cleared)).toBe(false);
    for (const far of band.farRim) {
      if (far !== cleared) expect(reach.has(far)).toBe(true);
    }
  });

  it("offers the stations past the band from the rim", () => {
    for (const sector of HOLE_SECTORS) {
      for (const map of mapsFor(sector)) {
        const band = bandOrThrow(map);
        const rim = must(band.rim[0]);
        const byId = nodeById(map);
        const beyond = map.nodes.filter(
          (node) =>
            node.row > band.rows[1] &&
            node.row < map.shape.bossRow &&
            isStationNode(node),
        );
        const offered = new Set(
          forwardStations(map, rim).map((step) => step.node.id),
        );
        for (const node of beyond) {
          expect(offered.has(node.id), `S${String(sector)} ${node.id}`).toBe(true);
        }
        for (const step of forwardStations(map, rim)) {
          expect(step.rows).toBe(step.node.row - (byId.get(rim)?.row ?? 0));
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
