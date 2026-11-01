import { describe, expect, it } from "vitest";
import { keeperLinesFor } from "@/data/narrative/keeperLines";
import type { FlagValue } from "@/types/events";

const flagsOf = (...keys: string[]): Record<string, FlagValue> =>
  Object.fromEntries(keys.map((k) => [k, true as FlagValue]));

const shopIds = (...keys: string[]): string[] =>
  keeperLinesFor("shop", flagsOf(...keys)).map((line) => line.id);

describe("keeper line continuity", () => {
  it("lets Mara thank the courier's route only when the courier was never netted", () => {
    expect(shopIds("courierFreed")).toContain("mCourier1");
    expect(shopIds("courierFreed", "courierNetted")).not.toContain("mCourier1");
  });
});
