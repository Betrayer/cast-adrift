import { describe, expect, it } from "vitest";
import { SHIPS } from "@/data/ships";
import {
  arcMaxPod,
  ARC_MAX_POD,
  ARC_MAX_POD_WIDE,
  ARC_MIN_POD,
  ARC_MIN_WIDTH,
  ARC_SPAN_MAX,
  ARC_SPAN_MIN,
  solveArc,
  type ArcSolution,
} from "@/screens/Battle/layouts/orbit/arc";

const VIEWPORTS: readonly { width: number; maxHeight: number }[] = [
  { width: 340, maxHeight: 220 },
  { width: 366, maxHeight: 240 },
  { width: 366, maxHeight: 320 },
  { width: 420, maxHeight: 300 },
  { width: 560, maxHeight: 330 },
  { width: 560, maxHeight: 520 },
  { width: 720, maxHeight: 620 },
];

const SHIP_SLOT_COUNTS = SHIPS.map((ship) => Object.keys(ship.slots).length);
const COUNTS = [...new Set([...SHIP_SLOT_COUNTS, 5, 6, 7, 8])].sort(
  (a, b) => a - b,
);

const minPodDistance = (solution: ArcSolution): number => {
  let smallest = Number.POSITIVE_INFINITY;
  for (let i = 0; i < solution.pods.length; i += 1) {
    for (let j = i + 1; j < solution.pods.length; j += 1) {
      const a = solution.pods[i];
      const b = solution.pods[j];
      if (a === undefined || b === undefined) continue;
      smallest = Math.min(smallest, Math.hypot(a.x - b.x, a.y - b.y));
    }
  }
  return smallest;
};

describe("orbit arc solver", () => {
  it("covers every shipped board plus the P11 placeholder counts", () => {
    expect(COUNTS).toContain(3);
    expect(COUNTS).toContain(6);
    expect(COUNTS).toContain(7);
    expect(COUNTS).toContain(8);
  });

  it("never places a pod smaller than 48px or outside the solved box", () => {
    for (const viewport of VIEWPORTS) {
      for (const count of COUNTS) {
        const solution = solveArc({ ...viewport, count });
        if (!solution.fits) continue;
        expect(solution.podSize).toBeGreaterThanOrEqual(ARC_MIN_POD);
        expect(solution.podSize).toBeLessThanOrEqual(arcMaxPod(viewport.width));
        expect(solution.spanDeg).toBeGreaterThanOrEqual(ARC_SPAN_MIN);
        expect(solution.spanDeg).toBeLessThanOrEqual(ARC_SPAN_MAX);
        expect(solution.pods).toHaveLength(count);
        expect(solution.height).toBeLessThanOrEqual(viewport.maxHeight + 0.001);
        for (const pod of solution.pods) {
          expect(pod.x - solution.podSize / 2).toBeGreaterThanOrEqual(-0.001);
          expect(pod.x + solution.podSize / 2).toBeLessThanOrEqual(
            viewport.width + 0.001,
          );
          expect(pod.y - solution.podSize / 2).toBeGreaterThanOrEqual(-0.001);
          expect(pod.y + solution.podSize / 2).toBeLessThanOrEqual(
            solution.height + 0.001,
          );
        }
      }
    }
  });

  it("keeps pods clear of each other and of the ship", () => {
    for (const viewport of VIEWPORTS) {
      for (const count of COUNTS) {
        const solution = solveArc({ ...viewport, count });
        if (!solution.fits) continue;
        if (count >= 2) {
          expect(minPodDistance(solution)).toBeGreaterThanOrEqual(
            solution.podSize,
          );
        }
        for (const pod of solution.pods) {
          const reach = Math.hypot(
            pod.x - solution.centre.x,
            pod.y - solution.centre.y,
          );
          expect(reach).toBeGreaterThanOrEqual(
            solution.shipSize / 2 + solution.podSize / 2,
          );
        }
      }
    }
  });

  it("leaves the ship room under the arc", () => {
    for (const viewport of VIEWPORTS) {
      const solution = solveArc({ ...viewport, count: 6 });
      if (!solution.fits) continue;
      expect(solution.centre.y + solution.shipSize / 2).toBeLessThanOrEqual(
        solution.height + 0.001,
      );
    }
  });

  it("fits every shipped board on a 390px phone and a 1280px desktop", () => {
    for (const count of SHIP_SLOT_COUNTS) {
      expect(solveArc({ width: 366, maxHeight: 300, count }).fits).toBe(true);
      expect(solveArc({ width: 560, maxHeight: 330, count }).fits).toBe(true);
    }
  });

  it("refuses to solve below the documented narrow threshold", () => {
    expect(
      solveArc({ width: ARC_MIN_WIDTH - 1, maxHeight: 300, count: 6 }).fits,
    ).toBe(false);
    expect(
      solveArc({ width: ARC_MIN_WIDTH, maxHeight: 300, count: 6 }).fits,
    ).toBe(true);
  });

  it("grows the pods and the silhouette once the arc is desktop-wide", () => {
    const phone = solveArc({ width: 366, maxHeight: 320, count: 6 });
    const desktop = solveArc({ width: 640, maxHeight: 460, count: 6 });
    expect(phone.fits && desktop.fits).toBe(true);
    expect(arcMaxPod(366)).toBe(ARC_MAX_POD);
    expect(arcMaxPod(640)).toBe(ARC_MAX_POD_WIDE);
    expect(desktop.podSize).toBeGreaterThan(phone.podSize);
    expect(desktop.shipSize).toBeGreaterThan(phone.shipSize);
    expect(desktop.radius).toBeGreaterThan(phone.radius);
  });

  it("orders pods left to right along the arc", () => {
    const solution = solveArc({ width: 560, maxHeight: 360, count: 6 });
    expect(solution.fits).toBe(true);
    const xs = solution.pods.map((pod) => pod.x);
    expect([...xs].sort((a, b) => a - b)).toEqual(xs);
  });

  it("spends only the height the arc needs", () => {
    const tall = solveArc({ width: 560, maxHeight: 900, count: 6 });
    const short = solveArc({ width: 560, maxHeight: 320, count: 6 });
    expect(tall.fits && short.fits).toBe(true);
    expect(tall.height).toBeLessThan(900);
    expect(short.height).toBeLessThanOrEqual(320);
  });
});
