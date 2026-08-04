import { perk } from "@/data/perks/builder";
import type { PerkDef } from "@/data/perks/types";

export const BLUE_PERKS: readonly PerkDef[] = [
  perk("hoarplate", "blue", "common", {
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "shields" }],
        do: [{ a: "modDieValue", n: 1 }],
      },
    ],
  }),
  perk("stormWall", "blue", "common", {
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "shields" }, { c: "isMaxFace" }],
        do: [{ a: "shield", n: 3 }],
      },
    ],
  }),
  perk("coldStart", "blue", "common", {
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "shields" }, { c: "turnLte", n: 2 }],
        do: [{ a: "modDieValue", n: 2 }],
      },
    ],
  }),
  perk("blueFloor", "blue", "common", {
    effects: [
      {
        on: "rolled",
        if: [{ c: "school", is: "blue" }, { c: "valueLt", n: 3 }],
        do: [{ a: "setDieValue", n: 3 }],
      },
    ],
  }),
  perk("meltwater", "blue", "common", {
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "shields" }, { c: "isMinFace" }],
        do: [{ a: "shield", n: 3 }],
      },
    ],
  }),
  perk("frostBrake", "blue", "common", {
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "school", is: "blue" }, { c: "slot", is: "engines" }],
        do: [{ a: "modDieValue", n: 2 }],
      },
    ],
  }),
  perk("bulkhead", "blue", "common", { mods: { hullMaxDelta: 3 } }),
  perk("chillBank", "blue", "common", {
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "school", is: "blue" }, { c: "isMaxFace" }],
        do: [{ a: "charge", n: 1 }],
      },
    ],
  }),
  perk("aegisField", "blue", "uncommon", {
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "shields" }],
        do: [{ a: "shield", n: 2 }],
      },
    ],
  }),
  perk("deepFreeze", "blue", "uncommon", {
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "shields" }, { c: "valueGte", n: 8 }],
        do: [{ a: "modDieValue", n: 3 }],
      },
    ],
  }),
  perk("interdict", "blue", "uncommon", { mods: { jamPowerDelta: 2 } }),
  perk("hardVacuum", "blue", "uncommon", {
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "shields" }, { c: "hullPctLt", n: 50 }],
        do: [{ a: "modDieValue", n: 3 }],
      },
    ],
  }),
  perk("secondSkin", "blue", "uncommon", {
    mods: { hullMaxDelta: 4, battleEndHeal: 1 },
  }),
  perk("glacierPact", "blue", "rare", {
    synergy: ["blue"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [
          { c: "slot", is: "shields" },
          { c: "resonanceAtLeast", school: "blue", n: 4 },
        ],
        do: [{ a: "modDieValue", n: 4 }],
      },
    ],
  }),
  perk("mirrorLattice", "blue", "rare", {
    synergy: ["dodge"],
    traits: ["reflectDodge"],
    mods: { enginesThresholdDelta: 1 },
  }),
  perk("permafrost", "blue", "rare", {
    synergy: ["shields"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "shields" }, { c: "isMaxFace" }],
        do: [{ a: "repeatSlot" }],
      },
    ],
  }),
];
