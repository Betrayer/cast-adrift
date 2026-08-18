import { perk } from "@/data/perks/builder";
import type { PerkDef } from "@/data/perks/types";

export const BLUE_PERKS: readonly PerkDef[] = [
  perk("hoarplate", "blue", "common", {
    tags: ["shields"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "shields" }],
        do: [{ a: "modDieValue", n: 1 }],
      },
    ],
  }),
  perk("ice-circuit", "blue", "common", {
    tags: ["shields", "precision"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "shields" }, { c: "valueGte", n: 6 }],
        do: [{ a: "modDieValue", n: 2 }],
      },
    ],
  }),
  perk("coldStart", "blue", "common", {
    tags: ["shields", "shieldwall"],
    effects: [
      {
        on: "turnEnd",
        if: [{ c: "turnLte", n: 2 }],
        do: [{ a: "shield", n: 3 }],
      },
    ],
  }),
  perk("stormWall", "blue", "common", {
    tags: ["shields", "shieldwall"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "shields" }, { c: "isMaxFace" }],
        do: [{ a: "shield", n: 3 }],
      },
    ],
  }),
  perk("meltwater", "blue", "common", {
    tags: ["shields", "survival"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "shields" }, { c: "isMinFace" }],
        do: [{ a: "shield", n: 3 }],
      },
    ],
  }),
  perk("snowline", "blue", "common", {
    tags: ["shieldwall", "swarm"],
    effects: [
      { on: "battleStart", do: [{ a: "shield", n: 1, perTag: "blue" }] },
    ],
  }),
  perk("blueFloor", "blue", "common", {
    tags: ["dice", "precision"],
    effects: [
      {
        on: "rolled",
        if: [{ c: "school", is: "blue" }, { c: "valueLt", n: 3 }],
        do: [{ a: "setDieValue", n: 3 }],
      },
    ],
  }),
  perk("rimeGuard", "blue", "common", {
    tags: ["dice", "control"],
    effects: [
      {
        on: "place",
        if: [
          { c: "not", of: { c: "school", is: "blue" } },
          { c: "valueLt", n: 2 },
        ],
        do: [{ a: "setDieValue", n: 2 }],
      },
    ],
  }),
  perk("stabilizer", "blue", "common", {
    tags: ["precision", "dice"],
    traits: ["stabilizer"],
  }),
  perk("frostBrake", "blue", "common", {
    tags: ["engines", "dodge"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "school", is: "blue" }, { c: "slot", is: "engines" }],
        do: [{ a: "modDieValue", n: 2 }],
      },
    ],
  }),
  perk("chillBank", "blue", "common", {
    tags: ["charge"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "school", is: "blue" }, { c: "isMaxFace" }],
        do: [{ a: "charge", n: 1 }],
      },
    ],
  }),
  perk("whiteNoise", "blue", "common", {
    tags: ["control", "charge"],
    effects: [
      {
        on: "turnEnd",
        if: [{ c: "chargeAtLeast", n: 4 }],
        do: [{ a: "addStatus", s: "jam", n: 1, target: "target" }],
      },
    ],
  }),
  perk("bulkhead", "blue", "common", {
    tags: ["survival"],
    mods: { hullMaxDelta: 3 },
  }),
  perk("aegisField", "blue", "uncommon", {
    tags: ["shields", "shieldwall"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "firstOfTurn" }],
        do: [{ a: "shield", n: 3 }],
      },
    ],
  }),
  perk("deepFreeze", "blue", "uncommon", {
    tags: ["shields", "spike"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "shields" }, { c: "valueGte", n: 8 }],
        do: [
          { a: "modDieValue", n: 3 },
          { a: "shield", n: 2 },
        ],
      },
    ],
  }),
  perk("hardVacuum", "blue", "uncommon", {
    tags: ["shields", "survival"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "shields" }, { c: "hullPctLt", n: 50 }],
        do: [{ a: "modDieValue", n: 3 }],
      },
    ],
  }),
  perk("interdict", "blue", "uncommon", {
    tags: ["sensors", "control", "precision"],
    mods: { jamPowerDelta: 1 },
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "sensors" }, { c: "valueLt", n: 4 }],
        do: [{ a: "setDieValue", n: 4 }],
      },
    ],
  }),
  perk("blue-reserve", "blue", "uncommon", {
    tags: ["dice", "reroll"],
    mods: { blueReserveDelta: 2, rerollSizeDelta: -1 },
  }),
  perk("secondSkin", "blue", "uncommon", {
    tags: ["survival"],
    mods: { hullMaxDelta: 4, battleEndHeal: 2, scrapMultPct: -10 },
  }),
  perk("reflector", "blue", "uncommon", {
    tags: ["shieldwall", "control"],
    effects: [
      {
        on: "turnEnd",
        if: [{ c: "shieldAtLeast", n: 10 }],
        do: [{ a: "dmg", n: 4 }],
      },
    ],
  }),
  perk("iceSheet", "blue", "uncommon", {
    tags: ["shields", "control"],
    effects: [
      {
        on: "turnEnd",
        if: [{ c: "hasTag", tag: "shieldwall" }],
        do: [{ a: "shield", n: 4 }],
      },
    ],
  }),
  perk("bracingVanes", "blue", "uncommon", {
    tags: ["engines", "dodge", "precision"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "engines" }, { c: "not", of: { c: "isMaxFace" } }],
        do: [{ a: "modDieValue", n: 3 }],
      },
    ],
  }),
  perk("glacierPact", "blue", "rare", {
    synergy: ["blue"],
    tags: ["shields", "shieldwall"],
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
    tags: ["engines", "dodge"],
    traits: ["reflectDodge"],
    mods: { evasionDelta: 6 },
    effects: [
      {
        on: "beforeResolveSlot",
        if: [
          { c: "slot", is: "engines" },
          { c: "countTag", tag: "dodge", n: 3 },
        ],
        do: [{ a: "modDieValue", n: 3 }],
      },
    ],
  }),
  perk("permafrost", "blue", "rare", {
    synergy: ["shields"],
    tags: ["shields", "shieldwall", "spike"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "shields" }, { c: "isMaxFace" }],
        do: [{ a: "repeatSlot" }],
      },
    ],
  }),
  perk("nullField", "blue", "rare", {
    synergy: ["shieldwall"],
    tags: ["shieldwall", "control"],
    effects: [
      { on: "turnEnd", do: [{ a: "shield", n: 2, perTag: "shieldwall" }] },
      {
        on: "turnEnd",
        if: [{ c: "countTag", tag: "shieldwall", n: 4 }],
        do: [{ a: "addStatus", s: "jam", n: 1, target: "target" }],
      },
    ],
  }),
];
