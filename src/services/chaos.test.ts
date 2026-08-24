import { afterEach, describe, expect, it } from "vitest";
import {
  chaos,
  chaosMocked,
  scriptedChaos,
  setChaosSource,
} from "@/services/chaos";

afterEach(() => {
  setChaosSource(null);
});

describe("chaos entropy", () => {
  it("stays inside the requested range", () => {
    for (let i = 0; i < 500; i += 1) {
      const value = chaos.int(1, 5);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(5);
      expect(Number.isInteger(value)).toBe(true);
    }
  });

  it("covers the whole range over many draws", () => {
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i += 1) seen.add(chaos.int(1, 5));
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it("is not a seeded stream — two runs of the same call differ", () => {
    const a = Array.from({ length: 64 }, () => chaos.int(0, 255));
    const b = Array.from({ length: 64 }, () => chaos.int(0, 255));
    expect(a).not.toEqual(b);
  });

  it("picks from an array and refuses an empty one", () => {
    expect(["a", "b", "c"]).toContain(chaos.pick(["a", "b", "c"]));
    expect(() => chaos.pick([])).toThrow("chaos.pick: empty array");
  });

  it("reports whether it is mocked", () => {
    expect(chaosMocked()).toBe(false);
    setChaosSource(scriptedChaos({ ints: [1] }));
    expect(chaosMocked()).toBe(true);
    setChaosSource(null);
    expect(chaosMocked()).toBe(false);
  });
});

describe("scripted chaos", () => {
  it("hands back the scripted ints in order", () => {
    setChaosSource(scriptedChaos({ ints: [4, 1, 2] }));
    expect(chaos.int(1, 5)).toBe(4);
    expect(chaos.int(0, 1)).toBe(1);
    expect(chaos.int(1, 5)).toBe(2);
  });

  it("clamps a scripted int into the requested range", () => {
    setChaosSource(scriptedChaos({ ints: [99, -4] }));
    expect(chaos.int(1, 5)).toBe(5);
    expect(chaos.int(1, 5)).toBe(1);
  });

  it("falls back to the low bound once the script runs out", () => {
    setChaosSource(scriptedChaos({ ints: [3] }));
    expect(chaos.int(1, 5)).toBe(3);
    expect(chaos.int(2, 5)).toBe(2);
  });

  it("indexes picks and wraps them", () => {
    setChaosSource(scriptedChaos({ picks: [2, 5] }));
    expect(chaos.pick(["a", "b", "c"])).toBe("c");
    expect(chaos.pick(["a", "b", "c"])).toBe("c");
  });

  it("is deterministic across identical scripts", () => {
    const read = (): number[] => {
      setChaosSource(scriptedChaos({ ints: [5, 0, 3] }));
      return [chaos.int(1, 5), chaos.int(0, 1), chaos.int(1, 5)];
    };
    expect(read()).toEqual(read());
  });
});
