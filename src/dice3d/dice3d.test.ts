import { describe, expect, it } from "vitest";
import type { DieTier } from "@/types/content";
import { partsEndMs, rollParts, visibleFace } from "./dieRoll";
import {
  faceLabels,
  readPercentile,
  splitPercentile,
  TENS_LABELS,
  UNITS_LABELS,
} from "@/dice3d/labels";
import { DIE_SHAPES, POLYHEDRA, shapeFor } from "@/dice3d/polyhedra";
import { facingOf, project, topFace } from "@/dice3d/projection";
import { planRoll, settledFace } from "@/dice3d/spin";
import { ROLL_STYLE_IDS } from "@/data/rollStyles";
import { dot, length } from "@/dice3d/vec";

const TWO_DEGREES = Math.cos((2 * Math.PI) / 180);

describe("polyhedra", () => {
  it("builds the six shapes with the face count their name promises", () => {
    for (const shape of DIE_SHAPES) {
      expect(POLYHEDRA[shape].faces).toHaveLength(shape);
    }
  });

  it("points every face normal outward and keeps it unit length", () => {
    for (const shape of DIE_SHAPES) {
      const poly = POLYHEDRA[shape];
      poly.faces.forEach((_, face) => {
        const normal = poly.normals[face] ?? [0, 0, 0];
        const centroid = poly.centroids[face] ?? [0, 0, 0];
        expect(length(normal)).toBeCloseTo(1, 6);
        expect(dot(normal, centroid), `${String(shape)}:${String(face)}`).toBeGreaterThan(0);
      });
    }
  });

  it("draws the d100 as a pair of d10s", () => {
    expect(shapeFor(100)).toBe(10);
    expect(shapeFor(12)).toBe(12);
  });

  it("culls the back faces and sorts the rest back to front", () => {
    const faces = project(POLYHEDRA[20], [1, 0, 0, 0], 50, 50, 40);
    expect(faces.length).toBeGreaterThan(0);
    expect(faces.length).toBeLessThan(20);
    for (let i = 1; i < faces.length; i += 1) {
      expect((faces[i]?.depth ?? 0) >= (faces[i - 1]?.depth ?? 0)).toBe(true);
    }
    expect(faces.every((face) => face.facing > 0)).toBe(true);
  });
});

describe("face labels", () => {
  it("numbers a plain die one to n", () => {
    expect(faceLabels(6)).toEqual(["1", "2", "3", "4", "5", "6"]);
  });

  it("cycles a custom face list over the polyhedron", () => {
    expect(faceLabels(8, [1, 8])).toEqual(["1", "8", "1", "8", "1", "8", "1", "8"]);
    expect(faceLabels(20, [8, 9, 10])).toHaveLength(20);
    expect(faceLabels(6, [3, 3, 4, 4, 5, 5])).toEqual(["3", "3", "4", "4", "5", "5"]);
  });

  it("splits a percentile into tens and units and reads it back", () => {
    expect(splitPercentile(100)).toEqual({ tens: "00", units: "0" });
    expect(splitPercentile(7)).toEqual({ tens: "00", units: "7" });
    expect(splitPercentile(58)).toEqual({ tens: "50", units: "8" });
    for (let v = 1; v <= 100; v += 1) {
      const { tens, units } = splitPercentile(v);
      expect(TENS_LABELS).toContain(tens);
      expect(UNITS_LABELS).toContain(units);
      expect(readPercentile(tens, units)).toBe(v);
    }
  });
});

describe("the steered landing", () => {
  it("puts the result face on top within two degrees, 200 rolls a shape", () => {
    for (const shape of DIE_SHAPES) {
      const labels = faceLabels(shape);
      for (let seed = 1; seed <= 200; seed += 1) {
        const value = labels[seed % labels.length] ?? "1";
        const plan = planRoll({ shape, labels, value, style: "flip", durationMs: 900, seed });
        const end = plan.at(plan.durationMs);
        const poly = POLYHEDRA[shape];
        expect(facingOf(poly, end.q, plan.landing), `${String(shape)}#${String(seed)}`).toBeGreaterThan(TWO_DEGREES);
        expect(topFace(poly, end.q)).toBe(plan.landing);
        expect(end.labels[plan.landing]).toBe(value);
      }
    }
  });

  it("relabels the landing face when no face carries the value", () => {
    const labels = faceLabels(8, [1, 8]);
    const plan = planRoll({ shape: 8, labels, value: "5", style: "flip", durationMs: 900, seed: 4 });
    expect(settledFace(plan)).toBe("5");
    expect(plan.at(900).labels[topFace(POLYHEDRA[8], plan.at(900).q)]).toBe("5");
  });

  it("lands on a face that already carries the value when one does", () => {
    const labels = faceLabels(8, [1, 8]);
    const plan = planRoll({ shape: 8, labels, value: "8", style: "flip", durationMs: 900, seed: 9 });
    expect(labels[plan.landing]).toBe("8");
  });

  it("spins before it steers and does not snap back at the end", () => {
    const labels = faceLabels(20);
    const plan = planRoll({ shape: 20, labels, value: "17", style: "flip", durationMs: 900, seed: 3 });
    const early = plan.at(100).q;
    const end = plan.at(900).q;
    expect(early).not.toEqual(end);
    const nearEnd = plan.at(890).q;
    const d = Math.abs(nearEnd[0] * end[0] + nearEnd[1] * end[1] + nearEnd[2] * end[2] + nearEnd[3] * end[3]);
    expect(d).toBeGreaterThan(0.999);
  });

  it("is the same roll for the same seed", () => {
    const labels = faceLabels(12);
    const a = planRoll({ shape: 12, labels, value: "4", style: "flip", durationMs: 900, seed: 11 });
    const b = planRoll({ shape: 12, labels, value: "4", style: "flip", durationMs: 900, seed: 11 });
    expect(a.at(300).q).toEqual(b.at(300).q);
  });
});

describe("roll styles", () => {
  it("ends every style, and the reduced fade, in the same terminal state", () => {
    const labels = faceLabels(10);
    for (const style of ROLL_STYLE_IDS) {
      for (const reduced of [false, true]) {
        const plan = planRoll({ shape: 10, labels, value: "7", style, durationMs: 900, seed: 5, reduced });
        const end = plan.at(plan.endMs + 1);
        expect(end.settled).toBe(true);
        expect(end.labels[plan.landing]).toBe("7");
        expect(topFace(POLYHEDRA[10], end.q)).toBe(plan.landing);
        expect(end.front === null || end.front === "7").toBe(true);
        expect(end.labelAlpha).toBe(1);
        expect(end.blur).toBe(0);
      }
    }
  });

  it("cycles the reel's label and slows down before the last tick", () => {
    const labels = faceLabels(6);
    const plan = planRoll({ shape: 6, labels, value: "6", style: "reel", durationMs: 900, seed: 2 });
    const seen = new Set<string>();
    for (let ms = 0; ms < 900; ms += 20) seen.add(plan.at(ms).front ?? "");
    expect(seen.size).toBeGreaterThan(2);
    expect(plan.at(900).front).toBe("6");
  });

  it("clears the blur as the die settles and flashes at the end", () => {
    const labels = faceLabels(6);
    const plan = planRoll({ shape: 6, labels, value: "2", style: "blur", durationMs: 600, seed: 8 });
    expect(plan.at(0).blur).toBeCloseTo(1);
    expect(plan.at(300).blur).toBeLessThan(plan.at(100).blur);
    expect(plan.at(600).flash).toBeGreaterThan(0.9);
    expect(plan.at(plan.endMs).flash).toBe(0);
  });

  it("reduces every style to a short fade from blank", () => {
    const plan = planRoll({ shape: 20, labels: faceLabels(20), value: "20", style: "flip", durationMs: 900, seed: 1, reduced: true });
    expect(plan.durationMs).toBe(160);
    expect(plan.at(0).labelAlpha).toBe(0);
    expect(plan.at(160).labelAlpha).toBe(1);
  });
});

describe("the face the eye reads", () => {
  it("is the engine's value for every shape, style and value, off-face included", () => {
    const cases: { defId: string; tier: DieTier; values: number[] }[] = [
      { defId: "grey-d4", tier: 4, values: [1, 4, 6] },
      { defId: "red-d6", tier: 6, values: [1, 6, 9] },
      { defId: "bulwark", tier: 8, values: [2, 8] },
      { defId: "undertow", tier: 10, values: [1, 10, 13] },
      { defId: "deepblue", tier: 12, values: [5, 12] },
      { defId: "glacierspike", tier: 20, values: [1, 13, 20, 24] },
      { defId: "fate-d100", tier: 100, values: [1, 10, 37, 99, 100] },
    ];
    for (const { defId, tier, values } of cases) {
      for (const value of values) {
        for (const style of ["flip", "reel", "blur"] as const) {
          for (const reduced of [false, true]) {
            const parts = rollParts(
              { defId, tier, value },
              { style, durationMs: 600, seed: value * 31 + tier, reduced, radius: 30 },
            );
            expect(visibleFace(parts, partsEndMs(parts) + 1), `${defId} ${String(value)} ${style} ${String(reduced)}`).toBe(
              String(value),
            );
          }
        }
      }
    }
  });
});
