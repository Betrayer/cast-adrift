import { describe, expect, it } from "vitest";
import {
  MAP_JUMP_MS,
  MARKER_ARRIVAL_MS,
  MARKER_MS_VAR,
  MARKER_TRAVEL_MS,
  markerStyle,
  TRAIL_LEN_VAR,
  trailLength,
  trailStyle,
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

  it("places the marker with a transform, never with layout", () => {
    const style = markerStyle({ x: 12, y: 34 }) as Record<string, string>;
    expect(style.transform).toBe("translate(12px, 34px)");
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
});
