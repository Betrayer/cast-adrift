import { describe, expect, it } from "vitest";
import { buildEpilogue, type EpilogueContext } from "@/data/narrative/epilogue";
import type { FlagValue } from "@/types/events";

const clearWith = (...keys: string[]): EpilogueContext => ({
  flags: Object.fromEntries(keys.map((k) => [k, true as FlagValue])),
  beaconsResolved: 0,
  ascension: 0,
  survivedLethal: false,
  axis: 0,
  sector: 5,
  depth: 40,
  death: false,
});

const lineIds = (ctx: EpilogueContext): string[] =>
  buildEpilogue(ctx).map((line) => line.id);

describe("epilogue continuity", () => {
  it("keeps the freed courier's line only for a courier that was never netted", () => {
    expect(lineIds(clearWith("courierFreed"))).toContain("courierFreed");
    expect(lineIds(clearWith("courierFreed", "courierNetted"))).not.toContain(
      "courierFreed",
    );
  });

  it("gives the doused pyre a line of its own", () => {
    expect(lineIds(clearWith("pyreDoused"))).toEqual(["pyreDoused"]);
  });
});
