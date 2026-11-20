import { describe, expect, it } from "vitest";
import { CARGO_BY_ID, type CargoDef } from "@/data/cargo";
import { slotTierDeltaFrom } from "@/game/run/slotTier";

const cargoDef = (id: string): CargoDef => {
  const def = CARGO_BY_ID.get(id);
  if (def === undefined) throw new Error(`no cargo ${id}`);
  return def;
};

const nothing = { chartPicks: [], perks: [], mutators: [], cargoDefs: [] };

describe("slotTierDeltaFrom", () => {
  it("carries the chart keystone's engine step, the term the simulator's own copy left out", () => {
    expect(slotTierDeltaFrom({ ...nothing, chartPicks: ["blue-key1"] })).toEqual({
      engines: -1,
    });
  });

  it("adds every source onto the same slot instead of letting one replace another", () => {
    expect(
      slotTierDeltaFrom({
        chartPicks: ["blue-key1"],
        perks: ["shipHardpoint"],
        mutators: ["radioSilence"],
        cargoDefs: [cargoDef("leadBallast"), cargoDef("overwoundCoils")],
      }),
    ).toEqual({ engines: -2, weaponA: 0, weaponB: 1, spinal: 1, sensors: -1 });
  });

  it("reads nothing when no source carries a step", () => {
    expect(slotTierDeltaFrom(nothing)).toEqual({});
  });
});
