import { beforeEach, describe, expect, it } from "vitest";
import { MODULE_BY_ID } from "@/data/modules";
import { useRunStore } from "@/stores/runStore";

const hullDeltaOf = (moduleId: string): number =>
  MODULE_BY_ID.get(moduleId)?.mods?.hullMaxDelta ?? 0;

const BALLAST_DELTA = hullDeltaOf("ballastModule");
const BUFFER_DELTA = hullDeltaOf("bufferCells");

const startRun = (hull: number, hullMax: number) => {
  useRunStore.setState(
    {
      ...useRunStore.getInitialState(),
      active: true,
      shipId: "wanderer",
      hull,
      hullMax,
    },
    true,
  );
};

describe("runStore module hull", () => {
  beforeEach(() => {
    startRun(20, 30);
  });

  it("raises max hull when a module that grants it is installed", () => {
    expect(BALLAST_DELTA).toBeGreaterThan(0);
    expect(useRunStore.getState().addModule("ballastModule")).toBe(true);
    const s = useRunStore.getState();
    expect(s.hullMax).toBe(30 + BALLAST_DELTA);
    expect(s.hull).toBe(20 + BALLAST_DELTA);
  });

  it("charges the max hull cost of a module and clamps the current hull", () => {
    expect(BUFFER_DELTA).toBeLessThan(0);
    startRun(30, 30);
    expect(useRunStore.getState().addModule("bufferCells")).toBe(true);
    const s = useRunStore.getState();
    expect(s.hullMax).toBe(30 + BUFFER_DELTA);
    expect(s.hull).toBe(30 + BUFFER_DELTA);
  });

  it("gives the max hull back when the module leaves the bay", () => {
    useRunStore.getState().addModule("ballastModule");
    useRunStore.getState().removeModule("ballastModule");
    const s = useRunStore.getState();
    expect(s.hullMax).toBe(30);
    expect(s.hull).toBe(20 + BALLAST_DELTA);
  });

  it("keeps max hull settled across a bay swap", () => {
    useRunStore.getState().addModule("bufferCells");
    useRunStore.getState().removeModule("bufferCells");
    useRunStore.getState().addModule("ballastModule");
    const s = useRunStore.getState();
    expect(s.hullMax).toBe(30 + BALLAST_DELTA);
    expect(s.modules).toEqual(["ballastModule"]);
  });

  it("leaves hull alone for modules without a hull line", () => {
    expect(hullDeltaOf("hardpointClamp")).toBe(0);
    useRunStore.getState().addModule("hardpointClamp");
    useRunStore.getState().removeModule("hardpointClamp");
    const s = useRunStore.getState();
    expect(s.hullMax).toBe(30);
    expect(s.hull).toBe(20);
  });

  it("ignores a removal of a module that is not installed", () => {
    useRunStore.getState().addModule("ballastModule");
    useRunStore.getState().removeModule("bufferCells");
    const s = useRunStore.getState();
    expect(s.hullMax).toBe(30 + BALLAST_DELTA);
    expect(s.modules).toEqual(["ballastModule"]);
  });
});
