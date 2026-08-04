import { perk } from "@/data/perks/builder";
import type { PerkDef } from "@/data/perks/types";

export const GREEN_PERKS: readonly PerkDef[] = [
  perk("rootHold", "green", "common", {
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "engines" }],
        do: [{ a: "modDieValue", n: 1 }],
      },
    ],
  }),
  perk("secondGrowth", "green", "common", {
    effects: [
      { on: "rolled", if: [{ c: "equalsLast" }], do: [{ a: "modDieValue", n: 2 }] },
    ],
  }),
  perk("mulch", "green", "common", { mods: { battleEndHeal: 1, scrapMultPct: 5 } }),
  perk("pollen", "green", "common", {
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "school", is: "green" }, { c: "isMaxFace" }],
        do: [{ a: "heal", n: 1 }],
      },
    ],
  }),
  perk("longRoots", "green", "common", { mods: { growthCapDelta: 1 } }),
  perk("greenwake", "green", "common", {
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "engines" }, { c: "valueGte", n: 5 }],
        do: [{ a: "shield", n: 2 }],
      },
    ],
  }),
  perk("steadyHand", "green", "common", { mods: { enginesThresholdDelta: 1 } }),
  perk("sapline", "green", "common", {
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "equalsLast" }],
        do: [{ a: "heal", n: 2 }],
      },
    ],
  }),
  perk("thicket", "green", "uncommon", {
    mods: { hullMaxDelta: 3, battleEndHeal: 2 },
  }),
  perk("bloomCycle", "green", "uncommon", {
    effects: [
      {
        on: "rolled",
        if: [{ c: "school", is: "green" }, { c: "equalsLast" }],
        do: [{ a: "modDieValue", n: 3 }],
      },
    ],
  }),
  perk("photosynth", "green", "uncommon", {
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "school", is: "green" }],
        do: [{ a: "charge", n: 1 }],
      },
    ],
  }),
  perk("evergreen", "green", "uncommon", { mods: { growthCapDelta: 2 } }),
  perk("tideRoots", "green", "uncommon", { mods: { tideEffectDelta: -1 } }),
  perk("worldTree", "green", "rare", {
    synergy: ["green"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "resonanceAtLeast", school: "green", n: 4 }],
        do: [{ a: "heal", n: 2 }],
      },
    ],
  }),
  perk("overgrowthPact", "green", "rare", {
    synergy: ["growth"],
    mods: { growthCapDelta: 2, enginesThresholdDelta: 2, hullMaxDelta: -4 },
  }),
  perk("standingWave", "green", "rare", {
    synergy: ["engines"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "engines" }],
        do: [{ a: "modDieValue", n: 4 }],
      },
    ],
  }),
];
