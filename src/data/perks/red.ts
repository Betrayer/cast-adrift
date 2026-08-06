import { perk } from "@/data/perks/builder";
import type { PerkDef } from "@/data/perks/types";

export const RED_PERKS: readonly PerkDef[] = [
  perk("kindling", "red", "common", {
    tags: ["weapons"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "valueGte", n: 5 }],
        do: [{ a: "modDieValue", n: 1 }],
      },
    ],
  }),
  perk("hammerhead", "red", "common", {
    tags: ["weapons"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "weaponA" }],
        do: [{ a: "modDieValue", n: 2 }],
      },
    ],
  }),
  perk("openingVolley", "red", "common", {
    tags: ["weapons"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "turnLte", n: 2 }],
        do: [{ a: "modDieValue", n: 2 }],
      },
    ],
  }),
  perk("pointBlank", "red", "common", {
    tags: ["weapons", "risk"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "isMaxFace" }],
        do: [
          { a: "modDieValue", n: 3 },
          { a: "hull", n: -1 },
        ],
      },
    ],
  }),
  perk("scorchmark", "red", "common", {
    tags: ["burn", "weapons"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "isMaxFace" }],
        do: [{ a: "addStatus", s: "burn", n: 1, target: "target" }],
      },
    ],
  }),
  perk("searing", "red", "common", {
    tags: ["burn", "weapons"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "valueGte", n: 8 }],
        do: [{ a: "addStatus", s: "burn", n: 2, target: "target" }],
      },
    ],
  }),
  perk("ignition", "red", "common", {
    tags: ["burn"],
    effects: [
      {
        on: "battleStart",
        do: [{ a: "addStatus", s: "burn", n: 2, target: "target" }],
      },
    ],
  }),
  perk("cinderTithe", "red", "common", {
    tags: ["scrap", "weapons"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "isMaxFace" }],
        do: [{ a: "scrap", n: 3 }],
      },
    ],
  }),
  perk("pyreFloor", "red", "common", {
    tags: ["reroll"],
    effects: [
      {
        on: "rolled",
        if: [{ c: "school", is: "red" }, { c: "isMinFace" }],
        do: [{ a: "rerollDie" }],
      },
    ],
  }),
  perk("keelStrike", "red", "common", {
    tags: ["spinal", "crit"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "spinal" }, { c: "isMaxFace" }],
        do: [{ a: "crit" }],
      },
    ],
  }),
  perk("hot-charge", "red", "common", {
    tags: ["charge", "weapons"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "chargeAtLeast", n: 5 }],
        do: [{ a: "dmg", n: 2 }],
      },
    ],
  }),
  perk("redForge", "red", "common", {
    tags: ["growth", "weapons"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [
          { c: "school", is: "red" },
          { c: "slot", is: "weapons" },
          { c: "isMaxFace" },
        ],
        do: [{ a: "grow", n: 1, cap: 2 }],
      },
    ],
  }),
  perk("warmup", "red", "common", {
    tags: ["weapons"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [
          { c: "slot", is: "weapons" },
          { c: "not", of: { c: "turnLte", n: 2 } },
        ],
        do: [{ a: "dmg", n: 3 }],
      },
    ],
  }),
  perk("thermalVent", "red", "uncommon", {
    tags: ["spike", "charge"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "isMaxFace" }],
        do: [{ a: "modDieValue", n: 3 }],
      },
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "isMaxFace" }],
        do: [{ a: "charge", n: 1 }],
      },
    ],
  }),
  perk("overburn", "red", "uncommon", {
    tags: ["risk", "weapons"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "weapons" }],
        do: [{ a: "modDieValue", n: 2 }],
      },
      {
        on: "turnEnd",
        if: [{ c: "not", of: { c: "hullPctLt", n: 50 } }],
        do: [{ a: "hull", n: -1 }],
      },
    ],
  }),
  perk("emberField", "red", "uncommon", {
    tags: ["burn", "spike"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "school", is: "red" }, { c: "isMaxFace" }],
        do: [{ a: "addStatus", s: "burn", n: 2, target: "target" }],
      },
    ],
  }),
  perk("hotline", "red", "uncommon", {
    tags: ["spinal", "overcap", "risk"],
    effects: [
      {
        on: "battleStart",
        if: [{ c: "slotMk", slot: "spinal", n: 1 }],
        do: [{ a: "allowExceedCap", slot: "spinal", hullCost: 2 }],
      },
    ],
  }),
  perk("secondBarrel", "red", "uncommon", {
    tags: ["weapons"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "weaponB" }],
        do: [{ a: "modDieValue", n: 3 }],
      },
      {
        on: "beforeResolveSlot",
        if: [
          { c: "slot", is: "weaponB" },
          { c: "slotMk", slot: "weaponB", n: 2 },
        ],
        do: [{ a: "modDieValue", n: 2 }],
      },
    ],
  }),
  perk("runningHot", "red", "uncommon", {
    tags: ["weapons"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "weapons" }],
        do: [{ a: "counter", scope: "battle", key: "weaponHeat", delta: 1 }],
      },
      {
        on: "beforeResolveSlot",
        if: [
          { c: "slot", is: "weapons" },
          { c: "counterAtLeast", scope: "battle", key: "weaponHeat", n: 4 },
        ],
        do: [{ a: "modDieValue", n: 3 }],
      },
    ],
  }),
  perk("ashfall", "red", "uncommon", {
    tags: ["burn", "weapons"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "isMaxFace" }],
        do: [{ a: "dmg", n: 2, perTag: "burn" }],
      },
    ],
  }),
  perk("stokehold", "red", "uncommon", {
    tags: ["burn"],
    effects: [
      {
        on: "turnEnd",
        if: [{ c: "countTag", tag: "burn", n: 3 }],
        do: [{ a: "addStatus", s: "burn", n: 2, target: "target" }],
      },
    ],
  }),
  perk("double-fuse", "red", "uncommon", {
    tags: ["burn"],
    traits: ["burnDouble"],
  }),
  perk("detonator", "red", "rare", {
    synergy: ["weapons"],
    tags: ["weapons", "spike"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "isMaxFace" }],
        do: [{ a: "repeatSlot" }],
      },
      {
        on: "beforeResolveSlot",
        if: [
          { c: "slot", is: "weapons" },
          { c: "valueGte", n: 8 },
          { c: "countTag", tag: "weapons", n: 5 },
        ],
        do: [{ a: "repeatSlot" }],
      },
    ],
  }),
  perk("magmaCore", "red", "rare", {
    synergy: ["red"],
    tags: ["weapons", "spike"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [
          { c: "slot", is: "weapons" },
          { c: "resonanceAtLeast", school: "red", n: 4 },
        ],
        do: [{ a: "modDieValue", n: 3 }],
      },
      {
        on: "afterResolveSlot",
        if: [
          { c: "slot", is: "weapons" },
          { c: "resonanceAtLeast", school: "red", n: 6 },
        ],
        do: [{ a: "primeSchool", school: "red", n: 3 }],
      },
    ],
  }),
  perk("infernoDoctrine", "red", "rare", {
    synergy: ["burn"],
    tags: ["burn", "weapons"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "weapons" }],
        do: [{ a: "addStatus", s: "burn", n: 1, target: "target" }],
      },
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "countTag", tag: "burn", n: 3 }],
        do: [{ a: "addStatus", s: "burn", n: 2, target: "target" }],
      },
    ],
  }),
  perk("ricochet", "red", "rare", {
    synergy: ["spike"],
    tags: ["weapons", "spike"],
    traits: ["ricochet"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "weaponA" }, { c: "isMaxFace" }],
        do: [{ a: "modDieValue", n: 4 }],
      },
    ],
  }),
];
