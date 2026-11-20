import { describe, expect, it } from "vitest";
import {
  ARRIVAL_MS_VAR,
  arrivalStyle,
  hopDistance,
  MAP_JUMP_MS,
  MARKER_ARRIVAL_MS,
  MARKER_MS_VAR,
  MARKER_TRAVEL_MS,
  markerStyle,
  NODE_REVEAL_ROW_CAP,
  NODE_ROW_VAR,
  nodeRevealStep,
  nodeRevealStyle,
  PATH_LEN_VAR,
  pathLength,
  pathStyle,
  TRAIL_LEN_VAR,
  trailLength,
  trailStyle,
  WARP_REACH_VAR,
  WARP_SUCK_MS,
  WARP_SUCK_MS_VAR,
  warpAimMark,
  warpStretchStyle,
} from "./travel";

describe("map travel timing", () => {
  it("spends the whole jump on travel plus the arrival hold", () => {
    expect(MAP_JUMP_MS).toBe(MARKER_TRAVEL_MS + MARKER_ARRIVAL_MS);
  });

  it("hands CSS the same travel duration the timer uses", () => {
    const style = markerStyle({ x: 0, y: 0 }) as Record<string, string>;
    expect(style[MARKER_MS_VAR]).toBe(`${String(MARKER_TRAVEL_MS)}ms`);
    const trail = trailStyle({ x: 0, y: 0 }, { x: 3, y: 4 }) as Record<
      string,
      string
    >;
    expect(trail[MARKER_MS_VAR]).toBe(`${String(MARKER_TRAVEL_MS)}ms`);
  });

  it("gives the arrival ring exactly the hold it is shown for", () => {
    const style = arrivalStyle() as Record<string, string>;
    expect(style[ARRIVAL_MS_VAR]).toBe(`${String(MARKER_ARRIVAL_MS)}ms`);
  });

  it("places the marker with a transform, never with layout", () => {
    const style = markerStyle({ x: 12, y: 34 }) as Record<string, string>;
    expect(style.transform).toBe("translate(12px, 34px)");
  });

  it("measures a hop as the straight line between its ends", () => {
    expect(hopDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it("draws the trail as one dash the length of the hop", () => {
    expect(trailLength({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    const trail = trailStyle({ x: 0, y: 0 }, { x: 3, y: 4 }) as Record<
      string,
      number
    >;
    expect(trail.strokeDasharray).toBe(5);
    expect(trail[TRAIL_LEN_VAR]).toBe(5);
  });

  it("draws the path highlight as one dash that always covers the edge", () => {
    expect(pathLength({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(6);
    const path = pathStyle({ x: 0, y: 0 }, { x: 3, y: 4 }) as Record<
      string,
      number
    >;
    expect(path.strokeDasharray).toBe(6);
    expect(path[PATH_LEN_VAR]).toBe(6);
  });

  it("staggers the reveal by row distance, capped", () => {
    expect(nodeRevealStep(-3)).toBe(3);
    expect(nodeRevealStep(2)).toBe(2);
    expect(nodeRevealStep(20)).toBe(NODE_REVEAL_ROW_CAP);
    const style = nodeRevealStyle(5) as Record<string, string>;
    expect(style[NODE_ROW_VAR]).toBe("5");
  });

  it("stretches the warp over the hop and hands CSS the suck duration", () => {
    const style = warpStretchStyle({ x: 0, y: 0 }, { x: 3, y: 4 }) as Record<
      string,
      string
    >;
    expect(style[WARP_REACH_VAR]).toBe("5px");
    expect(style[WARP_SUCK_MS_VAR]).toBe(`${String(WARP_SUCK_MS)}ms`);
  });

  it("marks the warp aim in whole viewBox units", () => {
    expect(warpAimMark({ x: 1.4, y: 2.6 })).toBe("1,3");
  });
});
