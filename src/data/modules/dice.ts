import { moduleDef } from "@/data/modules/types";
import type { ModuleDef } from "@/data/modules/types";

export const DICE_MODULES: readonly ModuleDef[] = [
  moduleDef("wideGrip", {
    rarity: "common",
    price: 50,
    tag: "dice",
    tags: ["reroll"],
    mods: { rerollSizeDelta: 1 },
    effects: [
      {
        on: "battleStart",
        if: [{ c: "countTag", tag: "reroll", n: 3 }],
        do: [
          { a: "grant", what: "rerollSize", n: 1 },
          { a: "grant", what: "rerollUses", n: 1 },
        ],
      },
    ],
  }),
  moduleDef("nudgeGovernor", {
    rarity: "common",
    price: 45,
    tag: "dice",
    tags: ["precision", "charge"],
    mods: { nudgeCostDelta: -1, chargeCapDelta: -1 },
  }),
  moduleDef("primerCoil", {
    rarity: "common",
    price: 50,
    tag: "dice",
    tags: ["sensors", "precision"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "sensors" }, { c: "isMaxFace" }],
        do: [{ a: "primeSchool", school: "red", n: 3 }],
      },
    ],
  }),
  moduleDef("growthTrellis", {
    rarity: "common",
    price: 45,
    tag: "dice",
    tags: ["growth", "engines"],
    mods: { growthCapDelta: 1 },
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "engines" }, { c: "isMaxFace" }],
        do: [{ a: "grow", n: 1, cap: 3 }],
      },
    ],
  }),
  moduleDef("ratchetFeed", {
    rarity: "common",
    price: 45,
    tag: "dice",
    tags: ["weapons", "precision"],
    effects: [
      {
        on: "place",
        if: [{ c: "slot", is: "weaponA" }, { c: "valueLt", n: 3 }],
        do: [{ a: "setDieValue", n: 3 }],
      },
    ],
  }),
  moduleDef("solenoid", {
    rarity: "uncommon",
    price: 60,
    tag: "dice",
    tags: ["reroll", "weapons"],
    mods: { extraRerolls: 1 },
    effects: [
      {
        on: "place",
        if: [{ c: "slot", is: "weaponB" }, { c: "valueLt", n: 4 }],
        do: [{ a: "rerollDie" }],
      },
    ],
  }),
  moduleDef("gyroStabilizer", {
    rarity: "uncommon",
    price: 65,
    tag: "dice",
    tags: ["precision", "engines"],
    mods: { reserveDelta: 1 },
    effects: [
      {
        on: "battleStart",
        if: [{ c: "slotMk", slot: "engines", n: 2 }],
        do: [{ a: "grant", what: "reserve", n: 1 }],
      },
    ],
  }),
  moduleDef("seedVault", {
    rarity: "uncommon",
    price: 70,
    tag: "dice",
    tags: ["growth", "swarm"],
    effects: [
      {
        on: "battleStart",
        do: [
          { a: "addTempDie", defId: "green-d4", turns: 3 },
          { a: "addTempDie", defId: "grey-d4", turns: 3 },
        ],
      },
    ],
  }),
  moduleDef("echoBuffer", {
    rarity: "uncommon",
    price: 60,
    tag: "dice",
    tags: ["charge", "reactor"],
    effects: [
      {
        on: "rolled",
        if: [{ c: "equalsLast" }],
        do: [{ a: "charge", n: 2 }],
      },
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "reactor" }],
        do: [{ a: "schedule", on: "nextTurn", do: [{ a: "charge", n: 3 }] }],
      },
    ],
  }),
  moduleDef("capacitorBank", {
    rarity: "rare",
    price: 85,
    tag: "dice",
    tags: ["charge", "reactor"],
    mods: { chargeCapDelta: 3 },
    effects: [
      {
        on: "battleEnd",
        if: [{ c: "chargeAtLeast", n: 3 }],
        do: [{ a: "counter", scope: "run", key: "capacitorBank", delta: 3 }],
      },
      {
        on: "battleStart",
        if: [{ c: "counterAtLeast", scope: "run", key: "capacitorBank", n: 3 }],
        do: [
          { a: "charge", n: 3 },
          { a: "counter", scope: "run", key: "capacitorBank", delta: -3 },
        ],
      },
    ],
  }),
  moduleDef("resonator", {
    rarity: "rare",
    price: 80,
    tag: "dice",
    tags: ["charge", "precision"],
    mods: { setCompleteCharge: 2 },
    effects: [
      {
        on: "battleStart",
        do: [
          {
            a: "schedule",
            on: "forTurns",
            turns: 3,
            do: [{ a: "charge", n: 2 }],
          },
        ],
      },
      {
        on: "beforeResolveSlot",
        if: [{ c: "chargeAtLeast", n: 8 }],
        do: [{ a: "modDieValue", n: 2 }],
      },
    ],
  }),
  moduleDef("recycler", {
    rarity: "rare",
    price: 85,
    tag: "dice",
    tags: ["scrap", "swarm"],
    effects: [
      {
        on: "turnEnd",
        do: [
          { a: "removeTempDie" },
          { a: "addTempDie", defId: "grey-d4" },
          { a: "scrap", n: 2 },
        ],
      },
    ],
  }),
];
