import { moduleDef } from "@/data/modules/types";
import type { ModuleDef } from "@/data/modules/types";

export const OFFENSE_MODULES: readonly ModuleDef[] = [
  moduleDef("siegeMount", {
    rarity: "common",
    price: 55,
    tag: "offense",
    tags: ["spike"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [
          { c: "slot", is: "weaponA" },
          { c: "not", of: { c: "turnLte", n: 1 } },
        ],
        do: [{ a: "modDieValue", n: 4 }],
      },
    ],
  }),
  moduleDef("splinterHead", {
    rarity: "common",
    price: 45,
    tag: "offense",
    tags: ["swarm"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "valueLt", n: 4 }],
        do: [{ a: "dmg", n: 1, perTag: "swarm" }],
      },
    ],
  }),
  moduleDef("emberInjector", {
    rarity: "common",
    price: 50,
    tag: "offense",
    tags: ["burn"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "weaponB" }],
        do: [{ a: "addStatus", s: "burn", n: 2, target: "target" }],
      },
    ],
  }),
  moduleDef("targetingMesh", {
    rarity: "common",
    price: 50,
    tag: "offense",
    tags: ["sensors", "precision"],
    mods: { markBonusDelta: 1 },
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "sensors" }],
        do: [
          { a: "modDieValue", n: 2, sel: { s: "dieInSlot", slot: "weaponA" } },
        ],
      },
    ],
  }),
  moduleDef("overpressure", {
    rarity: "common",
    price: 50,
    tag: "offense",
    tags: ["risk", "spike"],
    mods: { rerollSizeDelta: -1 },
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "firstOfTurn" }],
        do: [{ a: "modDieValue", n: 4 }],
      },
    ],
  }),
  moduleDef("piercer", {
    rarity: "uncommon",
    price: 70,
    tag: "offense",
    tags: ["pierce", "spinal"],
    traits: ["firstHitPierce"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "spinal" }],
        do: [{ a: "dmg", n: 2, perTag: "pierce" }],
      },
    ],
  }),
  moduleDef("railCradle", {
    rarity: "uncommon",
    price: 65,
    tag: "offense",
    tags: ["spinal", "precision"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "spinal" }],
        do: [{ a: "modDieValue", n: 1 }],
      },
      {
        on: "beforeResolveSlot",
        if: [
          { c: "slot", is: "spinal" },
          { c: "slotMk", slot: "spinal", n: 2 },
        ],
        do: [{ a: "modDieValue", n: 4 }],
      },
    ],
  }),
  moduleDef("lanceCapacitor", {
    rarity: "uncommon",
    price: 70,
    tag: "offense",
    tags: ["charge", "spike"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "chargeAtLeast", n: 6 }],
        do: [
          { a: "modDieValue", n: 5 },
          { a: "charge", n: -6 },
        ],
      },
    ],
  }),
  moduleDef("gunCamera", {
    rarity: "uncommon",
    price: 60,
    tag: "offense",
    tags: ["sensors", "precision"],
    effects: [
      {
        on: "nodeEnter",
        do: [{ a: "counter", scope: "run", key: "gunCamFrames", delta: 1 }],
      },
      {
        on: "beforeResolveSlot",
        if: [
          { c: "slot", is: "weapons" },
          { c: "counterAtLeast", scope: "run", key: "gunCamFrames", n: 6 },
        ],
        do: [{ a: "modDieValue", n: 2 }],
      },
      {
        on: "beforeResolveSlot",
        if: [
          { c: "slot", is: "weapons" },
          { c: "counterAtLeast", scope: "run", key: "gunCamFrames", n: 14 },
        ],
        do: [{ a: "modDieValue", n: 2 }],
      },
    ],
  }),
  moduleDef("ricochetHousing", {
    rarity: "rare",
    price: 85,
    tag: "offense",
    tags: ["spike"],
    traits: ["ricochet"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "weaponB" }, { c: "isMaxFace" }],
        do: [
          { a: "schedule", on: "nextTurn", do: [{ a: "dmg", n: 5 }] },
        ],
      },
    ],
  }),
  moduleDef("executioner", {
    rarity: "rare",
    price: 85,
    tag: "offense",
    tags: ["crit", "precision"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [
          { c: "slot", is: "weaponA" },
          { c: "slotMk", slot: "weaponA", n: 2 },
          { c: "isMaxFace" },
        ],
        do: [{ a: "crit" }],
      },
      {
        on: "afterResolveSlot",
        if: [
          { c: "slot", is: "weaponA" },
          { c: "slotMk", slot: "weaponA", n: 3 },
        ],
        do: [{ a: "dmg", n: 4 }],
      },
    ],
  }),
  moduleDef("autoloader", {
    rarity: "legendary",
    price: 120,
    tag: "offense",
    tags: ["dice", "swarm"],
    effects: [
      {
        on: "battleStart",
        do: [{ a: "addTempDie", defId: "red-d6" }],
      },
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "weapons" }],
        do: [{ a: "counter", scope: "battle", key: "autoloaderSalvo", delta: 1 }],
      },
      {
        on: "turnEnd",
        if: [
          { c: "counterAtLeast", scope: "battle", key: "autoloaderSalvo", n: 3 },
        ],
        do: [
          { a: "addTempDie", defId: "red-d6", turns: 1 },
          { a: "counter", scope: "battle", key: "autoloaderSalvo", delta: -3 },
        ],
      },
    ],
  }),
];
