import { describe, expect, it } from "vitest";
import {
  boundsOf,
  clampScale,
  clientToUser,
  fitScale,
  frameRegion,
  hitRadiusFor,
  MAX_SCALE,
  MIN_SCALE,
  MIN_TAP_PX,
  panBy,
  zoomAt,
  type Box,
} from "@/screens/Chart/chartView";

const BOUNDS: Box = { x: 0, y: 0, w: 1600, h: 1200 };
const PHONE: Box = { x: 0, y: 100, w: 390, h: 600 };
const IDENTITY = { scale: 1, tx: 0, ty: 0 };

describe("chart pan", () => {
  it("moves the content by the pointer distance, not by raw user units", () => {
    const scale = fitScale(BOUNDS, PHONE);
    const moved = panBy(IDENTITY, BOUNDS, PHONE, 100, 0);
    expect(moved.tx).toBeCloseTo(100 / scale, 5);
    expect(moved.tx).toBeGreaterThan(100);
  });

  it("keeps a node under the finger across a drag", () => {
    const node = { x: 800, y: 600 };
    const before = clientToUser(BOUNDS, PHONE, 195, 400);
    const view = panBy(IDENTITY, BOUNDS, PHONE, 60, -40);
    const screenBefore = {
      x: node.x * IDENTITY.scale + IDENTITY.tx,
      y: node.y * IDENTITY.scale + IDENTITY.ty,
    };
    const screenAfter = {
      x: node.x * view.scale + view.tx,
      y: node.y * view.scale + view.ty,
    };
    const scale = fitScale(BOUNDS, PHONE);
    expect((screenAfter.x - screenBefore.x) * scale).toBeCloseTo(60, 5);
    expect((screenAfter.y - screenBefore.y) * scale).toBeCloseTo(-40, 5);
    expect(before.x).toBeGreaterThan(0);
  });

  it("never lets the chart be dragged completely off screen", () => {
    let view = IDENTITY;
    for (let i = 0; i < 60; i += 1) {
      view = panBy(view, BOUNDS, PHONE, 400, 400);
    }
    expect(view.tx).toBeLessThanOrEqual(BOUNDS.x + BOUNDS.w);
    expect(view.ty).toBeLessThanOrEqual(BOUNDS.y + BOUNDS.h);
    const rightEdge = view.tx + view.scale * BOUNDS.w;
    expect(rightEdge).toBeGreaterThan(BOUNDS.x);
  });
});

describe("chart zoom", () => {
  it("keeps the anchor point fixed on screen", () => {
    const anchor = clientToUser(BOUNDS, PHONE, 300, 250);
    const before = {
      x: anchor.x * IDENTITY.scale + IDENTITY.tx,
      y: anchor.y * IDENTITY.scale + IDENTITY.ty,
    };
    const zoomed = zoomAt(IDENTITY, BOUNDS, 2, anchor);
    const after = {
      x: anchor.x * zoomed.scale + zoomed.tx,
      y: anchor.y * zoomed.scale + zoomed.ty,
    };
    expect(after.x).toBeCloseTo(before.x, 4);
    expect(after.y).toBeCloseTo(before.y, 4);
  });

  it("anchors at the pointer, not at the viewBox origin", () => {
    const anchor = clientToUser(BOUNDS, PHONE, 340, 620);
    const zoomed = zoomAt(IDENTITY, BOUNDS, 2, anchor);
    expect(Math.abs(zoomed.tx)).toBeGreaterThan(1);
  });

  it("clamps the scale to the declared range", () => {
    expect(clampScale(0.01)).toBe(MIN_SCALE);
    expect(clampScale(1000)).toBe(MAX_SCALE);
    let view = IDENTITY;
    for (let i = 0; i < 40; i += 1) {
      view = zoomAt(view, BOUNDS, 1.4, { x: 800, y: 600 });
    }
    expect(view.scale).toBe(MAX_SCALE);
  });
});

describe("chart framing", () => {
  it("centres the region the player owns", () => {
    const region = boundsOf(
      [
        { x: 400, y: 300 },
        { x: 520, y: 420 },
      ],
      50,
    );
    expect(region).not.toBe(null);
    if (region === null) return;
    const view = frameRegion(region, BOUNDS);
    const centreX = region.x + region.w / 2;
    const centreY = region.y + region.h / 2;
    expect(centreX * view.scale + view.tx).toBeCloseTo(
      BOUNDS.x + BOUNDS.w / 2,
      3,
    );
    expect(centreY * view.scale + view.ty).toBeCloseTo(
      BOUNDS.y + BOUNDS.h / 2,
      3,
    );
  });

  it("reports no region for an empty pick set", () => {
    expect(boundsOf([], 10)).toBe(null);
  });
});

describe("chart node hit targets", () => {
  it("gives a small node a 32 CSS px target at fit zoom on a phone", () => {
    const r = hitRadiusFor(6, BOUNDS, PHONE, 1);
    const cssPerUnit = fitScale(BOUNDS, PHONE);
    expect(r * 2 * cssPerUnit).toBeGreaterThanOrEqual(MIN_TAP_PX - 0.001);
  });

  it("never shrinks a node below its drawn radius when zoomed in", () => {
    const r = hitRadiusFor(13, BOUNDS, PHONE, MAX_SCALE);
    expect(r).toBeGreaterThanOrEqual(13);
  });
});
