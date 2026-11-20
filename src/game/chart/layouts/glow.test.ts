import { describe, expect, it } from "vitest";
import { chartGlow, glowFor } from "@/game/chart/layouts/glow";

describe("chart glow", () => {
  it("starts at the floor and climbs two hundredths a point to twelve", () => {
    expect(glowFor(0)).toBeCloseTo(0.06);
    expect(glowFor(5)).toBeCloseTo(0.16);
    expect(glowFor(12)).toBeCloseTo(0.3);
    expect(glowFor(40)).toBeCloseTo(0.3);
  });

  it("reads the points a pick set holds in each school and in the hub", () => {
    const glow = chartGlow(["hub-i0", "hub-i11", "hub-o12", "red-gate", "red-s1"]);
    expect(glow.schools.red).toBeCloseTo(glowFor(3));
    expect(glow.schools.blue).toBeCloseTo(0.06);
    expect(glow.hub).toBeCloseTo(glowFor(3));
  });

  it("ignores ids the graph does not carry", () => {
    expect(chartGlow(["red-min1"]).schools.red).toBeCloseTo(0.06);
  });
});
