import { describe, expect, it } from "vitest";
import { ALL_DICE } from "@/data/dice";
import { isLegendaryDie, legendaryFx, PARTICLE_BUDGET, particleSeeds } from "@/app/legendaryFx";

describe("legendary fx degradations", () => {
  it("runs everything on a capable device", () => {
    expect(legendaryFx({ reduced: false, tier: "high", surface: "pixi" })).toEqual({ motion: true, particles: 12 });
    expect(legendaryFx({ reduced: false, tier: "high", surface: "dom" })).toEqual({ motion: true, particles: 10 });
  });

  it("keeps the aura and drops the particles on a low device", () => {
    expect(legendaryFx({ reduced: false, tier: "low", surface: "pixi" })).toEqual({ motion: true, particles: 0 });
    expect(legendaryFx({ reduced: false, tier: "low", surface: "dom" })).toEqual({ motion: true, particles: 0 });
  });

  it("is a still aura under reduced motion on every device", () => {
    for (const tier of ["low", "mid", "high"] as const) {
      for (const surface of ["pixi", "dom"] as const) {
        expect(legendaryFx({ reduced: true, tier, surface })).toEqual({ motion: false, particles: 0 });
      }
    }
  });

  it("never spends more than the budget the design names", () => {
    expect(Math.max(...Object.values(PARTICLE_BUDGET.pixi))).toBeLessThanOrEqual(12);
    expect(Math.max(...Object.values(PARTICLE_BUDGET.dom))).toBeLessThanOrEqual(10);
  });
});

describe("legendary dice", () => {
  it("names ten legendaries across the pool", () => {
    expect(ALL_DICE.filter((die) => isLegendaryDie(die.id))).toHaveLength(10);
  });

  it("seeds the same particles for the same die", () => {
    expect(particleSeeds("lancehead", 6)).toEqual(particleSeeds("lancehead", 6));
    expect(particleSeeds("lancehead", 6)).not.toEqual(particleSeeds("voidmaw", 6));
  });
});