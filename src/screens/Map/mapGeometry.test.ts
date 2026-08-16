import { describe, expect, it } from "vitest";
import { SECTORS } from "@/data/sectors";
import { generateSectorMap, mapShapeOf } from "@/game/map/generator";
import { pocketLaneFor, type MapNode } from "@/game/map/types";
import { createStreams } from "@/services/rng";
import { mapGeometry, NODE_RADIUS } from "./mapGeometry";

const node = (over: Partial<MapNode>): MapNode => ({
  id: "r1l0",
  row: 1,
  lane: 0,
  type: "battle",
  ...over,
});

describe("map geometry", () => {
  it("fits every lane, including the pocket lane, inside the view", () => {
    for (const def of SECTORS) {
      const shape = mapShapeOf(def.id);
      const geo = mapGeometry(shape);
      for (let lane = 0; lane <= pocketLaneFor(shape); lane += 1) {
        const x = geo.laneX(lane);
        expect(x - NODE_RADIUS, `S${String(def.id)} lane ${String(lane)}`).toBeGreaterThanOrEqual(0);
        expect(x + NODE_RADIUS, `S${String(def.id)} lane ${String(lane)}`).toBeLessThanOrEqual(geo.viewW);
      }
    }
  });

  it("puts row 0 at the bottom and the boss row at the top", () => {
    for (const def of SECTORS) {
      const shape = mapShapeOf(def.id);
      const geo = mapGeometry(shape);
      expect(geo.rowY(0)).toBeGreaterThan(geo.rowY(shape.bossRow));
      expect(geo.rowY(shape.bossRow)).toBeGreaterThan(0);
      expect(geo.rowY(0)).toBeLessThan(geo.viewH);
      for (let row = 1; row <= shape.bossRow; row += 1) {
        expect(geo.rowY(row)).toBeLessThan(geo.rowY(row - 1));
      }
    }
  });

  it("centres start and boss between the main lanes", () => {
    const geo = mapGeometry(mapShapeOf(2));
    expect(geo.nodeX(node({ type: "start" }))).toBe(geo.centerX);
    expect(geo.nodeX(node({ type: "boss" }))).toBe(geo.centerX);
    expect(geo.nodeX(node({ lane: 3 }))).toBe(geo.laneX(3));
  });

  it("keeps every generated node inside its own view box", () => {
    for (const def of SECTORS) {
      const map = generateSectorMap(createStreams(5).map, def.id);
      const geo = mapGeometry(map.shape);
      for (const mapNode of map.nodes) {
        const r = geo.radius(mapNode);
        expect(geo.nodeX(mapNode) - r).toBeGreaterThanOrEqual(0);
        expect(geo.nodeX(mapNode) + r).toBeLessThanOrEqual(geo.viewW);
        expect(geo.nodeY(mapNode) - r).toBeGreaterThanOrEqual(0);
        expect(geo.nodeY(mapNode) + r).toBeLessThanOrEqual(geo.viewH);
      }
    }
  });

  it("gives a three-lane sector a narrower stage than a four-lane one", () => {
    expect(mapGeometry(mapShapeOf(1)).viewW).toBeLessThan(
      mapGeometry(mapShapeOf(2)).viewW,
    );
  });
});
