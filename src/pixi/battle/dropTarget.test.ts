import { describe, expect, it } from "vitest";
import {
  FRAME_MS,
  pickDropTarget,
  pulledPoint,
  type DropCandidate,
} from "@/pixi/battle/dropTarget";

describe("pickDropTarget", () => {
  describe("the home dead zone", () => {
    const candidates: DropCandidate[] = [
      { target: "weaponA", rect: { x: 60, y: 60, w: 100, h: 100 } },
    ];
    const home = { x: 100, y: 100 };

    it("sends a die released within half a die of its pickup home", () => {
      expect(pickDropTarget({ x: 119, y: 100 }, home, 40, candidates)).toBeNull();
    });

    it("captures once the die has left the dead zone", () => {
      expect(pickDropTarget({ x: 120, y: 100 }, home, 40, candidates)).toBe("weaponA");
      expect(pickDropTarget({ x: 121, y: 100 }, home, 40, candidates)).toBe("weaponA");
    });

    it("has no dead zone for a die lifted out of a slot", () => {
      expect(pickDropTarget(home, null, 40, candidates)).toBe("weaponA");
    });
  });

  describe("the capture radius", () => {
    const candidates: DropCandidate[] = [
      { target: "shields", rect: { x: 0, y: 0, w: 150, h: 76 } },
    ];

    it("is measured to the nearest point of the card rect", () => {
      expect(pickDropTarget({ x: 75, y: 109 }, null, 44, candidates)).toBe("shields");
      expect(pickDropTarget({ x: 75, y: 109.5 }, null, 44, candidates)).toBeNull();
    });

    it("captures anywhere inside the card", () => {
      expect(pickDropTarget({ x: 20, y: 40 }, null, 44, candidates)).toBe("shields");
    });
  });

  it("prefers the card the die covers more of over the nearer one", () => {
    const covered: DropCandidate = {
      target: "shields",
      rect: { x: 0, y: 6, w: 100, h: 100 },
    };
    const nearer: DropCandidate = {
      target: "weaponA",
      rect: { x: 0, y: 0, w: 100, h: 4 },
    };
    const at = { x: 50, y: 2 };
    expect(pickDropTarget(at, null, 40, [nearer, covered])).toBe("shields");
    expect(pickDropTarget(at, null, 40, [covered, nearer])).toBe("shields");
  });

  it("breaks an overlap tie on distance", () => {
    const near: DropCandidate = {
      target: "weaponA",
      rect: { x: 25, y: -5, w: 10, h: 10 },
    };
    const far: DropCandidate = {
      target: "shields",
      rect: { x: -50, y: -5, w: 22, h: 10 },
    };
    const at = { x: 0, y: 0 };
    expect(pickDropTarget(at, null, 40, [near, far])).toBe("weaponA");
    expect(pickDropTarget(at, null, 40, [far, near])).toBe("weaponA");
  });

  it("keeps the first candidate on an exact tie", () => {
    const rect = { x: 0, y: 0, w: 100, h: 100 };
    const at = { x: 50, y: 50 };
    expect(
      pickDropTarget(at, null, 40, [
        { target: "engines", rect },
        { target: "reserve", rect },
      ]),
    ).toBe("engines");
    expect(
      pickDropTarget(at, null, 40, [
        { target: "reserve", rect },
        { target: "engines", rect },
      ]),
    ).toBe("reserve");
  });
});

describe("pulledPoint", () => {
  const rect = { x: 90, y: -10, w: 20, h: 20 };
  const origin = { x: 0, y: 0 };

  it("eases a frame's share of the way toward the pulled destination", () => {
    const next = pulledPoint(origin, origin, rect, FRAME_MS);
    expect(next.x).toBeCloseTo(9, 9);
    expect(next.y).toBe(0);
  });

  it("is frame-rate independent", () => {
    const half = pulledPoint(origin, origin, rect, FRAME_MS / 2);
    const twice = pulledPoint(half, origin, rect, FRAME_MS / 2);
    expect(twice.x).toBeCloseTo(9, 9);
  });

  it("still moves on a zero-length frame", () => {
    expect(pulledPoint(origin, origin, rect, 0).x).toBeGreaterThan(0);
  });
});
