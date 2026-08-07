import { describe, expect, it } from "vitest";
import {
  AXIS_NOTCHES,
  axisLabel,
  axisNotch,
  clampAxis,
  countDeckSchool,
  driftAllowed,
  DRIFT_RUN_CAP,
  sectorDriftDelta,
} from "@/game/run/axis";
import type { DieInstance } from "@/stores/runStore";

describe("sectorDriftDelta", () => {
  it("leans to resonance when black dominates and the deck qualifies", () => {
    expect(sectorDriftDelta(3, 1, 2, 0)).toBe(-1);
  });

  it("leans to stability when blue dominates and the deck qualifies", () => {
    expect(sectorDriftDelta(1, 3, 0, 2)).toBe(1);
  });

  it("does not move without at least two of the leaning school in the deck", () => {
    expect(sectorDriftDelta(3, 0, 1, 0)).toBe(0);
    expect(sectorDriftDelta(0, 3, 0, 1)).toBe(0);
  });

  it("does not move when no dice of the school were used", () => {
    expect(sectorDriftDelta(0, 0, 4, 4)).toBe(0);
  });

  it("cancels on a genuine tie with both decks qualifying", () => {
    expect(sectorDriftDelta(2, 2, 3, 3)).toBe(0);
  });

  it("caps at a single step per sector however lopsided the usage", () => {
    expect(Math.abs(sectorDriftDelta(40, 0, 5, 0))).toBe(1);
  });
});

describe("driftAllowed", () => {
  it("passes drift through while the run budget holds", () => {
    expect(driftAllowed(-1, 0)).toBe(-1);
    expect(driftAllowed(1, DRIFT_RUN_CAP - 1)).toBe(1);
  });

  it("stops contributing once the run cap is spent", () => {
    expect(driftAllowed(-1, DRIFT_RUN_CAP)).toBe(0);
    expect(driftAllowed(1, DRIFT_RUN_CAP + 2)).toBe(0);
  });

  it("keeps five sectors of pure lean under the ending threshold", () => {
    let axis = 0;
    let spent = 0;
    for (let sector = 0; sector < 5; sector += 1) {
      const delta = driftAllowed(sectorDriftDelta(9, 0, 5, 0), spent);
      spent += Math.abs(delta);
      axis += delta;
    }
    expect(axis).toBe(-DRIFT_RUN_CAP);
  });
});

describe("countDeckSchool", () => {
  it("counts dice of a school by their definition", () => {
    const deck: DieInstance[] = [
      { uid: "1", defId: "black-d6" },
      { uid: "2", defId: "obsidian" },
      { uid: "3", defId: "blue-d6" },
    ];
    expect(countDeckSchool(deck, "black")).toBe(2);
    expect(countDeckSchool(deck, "blue")).toBe(1);
  });
});

describe("axisLabel", () => {
  it("maps sign to axis pole", () => {
    expect(axisLabel(-4)).toBe("resonance");
    expect(axisLabel(6)).toBe("stability");
    expect(axisLabel(0)).toBe("neutral");
  });
});

describe("axisNotch", () => {
  it("keeps neutral in the middle notch", () => {
    expect(axisNotch(0)).toBe(3);
    expect(axisNotch(-1)).toBe(3);
    expect(axisNotch(1)).toBe(3);
  });

  it("is symmetric about zero", () => {
    for (let axis = 1; axis <= 10; axis += 1) {
      expect(axisNotch(axis) + axisNotch(-axis)).toBe(AXIS_NOTCHES - 1);
    }
  });

  it("clamps beyond the axis range", () => {
    expect(axisNotch(-40)).toBe(0);
    expect(axisNotch(40)).toBe(AXIS_NOTCHES - 1);
    expect(clampAxis(-40)).toBe(-10);
    expect(clampAxis(40)).toBe(10);
  });
});
