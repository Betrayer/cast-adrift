import { beforeEach, describe, expect, it } from "vitest";
import { openTapLayer, resetTapLayers, tapLayerOpen } from "@/app/tapLayer";

describe("tap layers", () => {
  beforeEach(() => {
    resetTapLayers();
  });

  it("reports closed until a layer opens", () => {
    expect(tapLayerOpen()).toBe(false);
    const release = openTapLayer();
    expect(tapLayerOpen()).toBe(true);
    release();
    expect(tapLayerOpen()).toBe(false);
  });

  it("stays open while any of several layers is up", () => {
    const first = openTapLayer();
    const second = openTapLayer();
    first();
    expect(tapLayerOpen()).toBe(true);
    second();
    expect(tapLayerOpen()).toBe(false);
  });

  it("ignores a release called twice", () => {
    const first = openTapLayer();
    const second = openTapLayer();
    first();
    first();
    expect(tapLayerOpen()).toBe(true);
    second();
    expect(tapLayerOpen()).toBe(false);
  });
});
