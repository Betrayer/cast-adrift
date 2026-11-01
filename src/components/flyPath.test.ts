import { describe, expect, it } from "vitest";
import { FLY_MIN_SCALE, flyPath, landingTransform } from "@/components/flyPath";

const SOURCE = { left: 0, top: 0, width: 100, height: 50 };
const LAYOUT = { width: 100, height: 50 };

describe("flyPath", () => {
  it("flies centre to centre and shrinks by the square root of the area ratio", () => {
    const path = flyPath(SOURCE, LAYOUT, { left: 200, top: 100, width: 50, height: 25 });
    expect(path).toEqual({
      frame: { left: 0, top: 0, width: 100, height: 50 },
      dx: 175,
      dy: 87.5,
      scale: 0.5,
    });
    expect(landingTransform(path)).toBe("translate3d(175px, 87.5px, 0) scale(0.5)");
  });

  it("never grows past the source's own size", () => {
    const path = flyPath(SOURCE, LAYOUT, { left: 0, top: 0, width: 400, height: 400 });
    expect(path.scale).toBe(1);
  });

  it("never shrinks below the minimum scale", () => {
    const path = flyPath(SOURCE, LAYOUT, { left: 0, top: 0, width: 1, height: 1 });
    expect(path.scale).toBe(FLY_MIN_SCALE);
  });

  it("centres a layout-sized frame on a transformed source rect", () => {
    const path = flyPath(
      { left: 10, top: 20, width: 120, height: 60 },
      LAYOUT,
      { left: 70, top: 50, width: 100, height: 50 },
    );
    expect(path.frame).toEqual({ left: 20, top: 25, width: 100, height: 50 });
  });

  it("guards a zero layout size instead of dividing by zero", () => {
    const path = flyPath(SOURCE, { width: 0, height: 0 }, { left: 0, top: 0, width: 10, height: 10 });
    expect(path.scale).toBe(1);
    expect(Number.isFinite(path.dx)).toBe(true);
    expect(Number.isFinite(path.dy)).toBe(true);
  });
});
