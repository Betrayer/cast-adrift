import { describe, expect, it } from "vitest";
import { HEIGHTS } from "@/app/breakpoints";
import { isCompactBox } from "@/app/viewportBox";

describe("compact box", () => {
  it("treats the threshold itself as compact", () => {
    expect(isCompactBox(HEIGHTS.compact)).toBe(true);
    expect(isCompactBox(HEIGHTS.compact + 1)).toBe(false);
  });

  it("calls a notched 844 px phone compact and a bare one roomy", () => {
    expect(isCompactBox(844 - 47 - 34)).toBe(true);
    expect(isCompactBox(844)).toBe(false);
  });

  it("never calls an unmeasured box compact", () => {
    expect(isCompactBox(0)).toBe(false);
    expect(isCompactBox(-10)).toBe(false);
  });
});
