import { describe, expect, it } from "vitest";
import { FORGE_PULL, forgeOffsets, forgeOffsetStyle } from "./forgeBeat";

describe("forge beat offsets", () => {
  it("pulls a side-by-side pair toward their midpoint", () => {
    const offsets = forgeOffsets(
      { left: 0, top: 0, width: 100, height: 100 },
      { left: 200, top: 0, width: 100, height: 100 },
    );
    expect(offsets.a.dx).toBeCloseTo(100 * FORGE_PULL);
    expect(offsets.b.dx).toBeCloseTo(-100 * FORGE_PULL);
    expect(offsets.a.dy).toBeCloseTo(0);
    expect(offsets.b.dy).toBeCloseTo(0);
  });

  it("mirrors the offsets of a diagonal pair", () => {
    const offsets = forgeOffsets(
      { left: 10, top: 300, width: 104, height: 140 },
      { left: 230, top: 20, width: 104, height: 140 },
    );
    expect(offsets.a.dx).toBeCloseTo(-offsets.b.dx);
    expect(offsets.a.dy).toBeCloseTo(-offsets.b.dy);
    expect(offsets.a.dx).toBeGreaterThan(0);
    expect(offsets.a.dy).toBeLessThan(0);
  });

  it("writes the offset as the two forge custom properties", () => {
    expect(forgeOffsetStyle(undefined)).toEqual({});
    expect(forgeOffsetStyle({ dx: 12, dy: -4 })).toEqual({
      "--ca-forge-dx": "12px",
      "--ca-forge-dy": "-4px",
    });
  });
});
