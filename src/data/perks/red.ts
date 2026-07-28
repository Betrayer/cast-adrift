import { perk } from "@/data/perks/builder";
import type { PerkDef } from "@/data/perks/types";

export const RED_PERKS: readonly PerkDef[] = [
  perk("kindling", "red", "common", {
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "valueGte", n: 5 }],
        do: [{ a: "modDieValue", n: 1 }],
      },
    ],
  }),
  perk("hammerhead", "red", "common", {
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "weaponA" }],
        do: [{ a: "modDieValue", n: 2 }],
      },
    ],
  }),
  perk("scorchmark", "red", "common", {
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "isMaxFace" }],
        do: [{ a: "addStatus", s: "burn", n: 1, target: "target" }],
      },
    ],
  }),
  perk("openingVolley", "red", "common", {
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "turnLte", n: 2 }],
        do: [{ a: "modDieValue", n: 2 }],
      },
    ],
  }),
  perk("pyreFloor", "red", "common", {
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "isMinFace" }],
        do: [{ a: "modDieValue", n: 2 }],
      },
    ],
  }),
  perk("redForge", "red", "common", {
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "school", is: "red" }, { c: "slot", is: "weapons" }],
        do: [{ a: "modDieValue", n: 1 }],
      },
    ],
  }),
  perk("searing", "red", "common", {
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "valueGte", n: 8 }],
        do: [{ a: "modDieValue", n: 2 }],
      },
    ],
  }),
  perk("cinderTithe", "red", "common", {
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "isMaxFace" }],
        do: [{ a: "scrap", n: 3 }],
      },
    ],
  }),
  // Reworked after the dead-perk sweep: charge alone paid back too slowly for an
  // uncommon, so the vent now pushes the shot as well as banking it.
  perk("thermalVent", "red", "uncommon", {
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
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "hullPctLt", n: 50 }],
        do: [{ a: "modDieValue", n: 2 }],
      },
    ],
  }),
  perk("emberField", "red", "uncommon", {
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "school", is: "red" }, { c: "isMaxFace" }],
        do: [{ a: "addStatus", s: "burn", n: 2, target: "target" }],
      },
    ],
  }),
  perk("hotline", "red", "uncommon", {
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "spinal" }],
        do: [{ a: "modDieValue", n: 3 }],
      },
    ],
  }),
  perk("secondBarrel", "red", "uncommon", {
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "weaponB" }],
        do: [{ a: "modDieValue", n: 3 }],
      },
    ],
  }),
  perk("detonator", "red", "rare", {
    synergy: { kind: "slot", slot: "weapons" },
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "isMaxFace" }],
        do: [{ a: "repeatSlot" }],
      },
    ],
  }),
  perk("magmaCore", "red", "rare", {
    synergy: { kind: "school", school: "red" },
    effects: [
      {
        on: "beforeResolveSlot",
        if: [
          { c: "slot", is: "weapons" },
          { c: "resonanceAtLeast", school: "red", n: 4 },
        ],
        do: [{ a: "modDieValue", n: 3 }],
      },
    ],
  }),
  perk("infernoDoctrine", "red", "rare", {
    synergy: { kind: "engraving", id: "flame" },
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "weapons" }],
        do: [{ a: "addStatus", s: "burn", n: 1, target: "target" }],
      },
    ],
  }),
];
