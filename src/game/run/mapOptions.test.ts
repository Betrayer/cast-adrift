import { describe, expect, it } from "vitest";
import { CONTRACTS, contractDef } from "@/data/contracts";
import { contractSectorOf, eliteLineOf, mapOptionsFor } from "@/game/run/mapOptions";

describe("map options", () => {
  it("asks a contract map for the most elites any of its stars wants", () => {
    expect(eliteLineOf(contractDef("gauntlet"))).toBe(2);
    expect(eliteLineOf(contractDef("storm"))).toBe(2);
    expect(eliteLineOf(contractDef("bareArmor"))).toBe(2);
    expect(eliteLineOf(undefined)).toBe(0);
    const without = CONTRACTS.find((def) => def.goals.every((goal) => goal.g !== "elitesAtLeast"));
    expect(without).toBeDefined();
    expect(eliteLineOf(without)).toBe(0);
  });

  it("reads a contract's sector the way a run starts it", () => {
    expect(contractSectorOf(undefined)).toBe(1);
    expect(contractSectorOf(contractDef("gauntlet"))).toBe(1);
    const gauntlet = contractDef("gauntlet");
    if (gauntlet === undefined) throw new Error("gauntlet missing");
    expect(contractSectorOf({ ...gauntlet, setup: { ...gauntlet.setup, sector: 9 } })).toBe(5);
    expect(contractSectorOf({ ...gauntlet, setup: { ...gauntlet.setup, sector: 0 } })).toBe(1);
  });

  it("passes the line only when a contract needs one", () => {
    expect(mapOptionsFor([], "contract", contractDef("gauntlet"))).toEqual({
      bossAsGate: false,
      noShops: false,
      eliteLine: 2,
    });
    expect(mapOptionsFor([], "campaign")).toEqual({ bossAsGate: false, noShops: false });
    expect(mapOptionsFor([], "drift").bossAsGate).toBe(true);
  });
});
