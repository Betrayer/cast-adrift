import { moduleDef } from "@/data/modules/types";
import type { ModuleDef } from "@/data/modules/types";

export const WEIRD_MODULES: readonly ModuleDef[] = [
  moduleDef("jamBreaker", {
    rarity: "common",
    price: 50,
    tag: "weird",
    tags: ["sensors", "precision"],
    mods: { jamPowerDelta: 2 },
    effects: [
      {
        on: "battleStart",
        if: [{ c: "slotMk", slot: "sensors", n: 2 }],
        do: [{ a: "grant", what: "reserve", n: 1 }],
      },
    ],
  }),
  moduleDef("hushAntenna", {
    rarity: "common",
    price: 45,
    tag: "weird",
    tags: ["charge"],
    effects: [
      {
        on: "turnEnd",
        if: [{ c: "not", of: { c: "chargeAtLeast", n: 1 } }],
        do: [{ a: "charge", n: 3 }],
      },
    ],
  }),
  moduleDef("prismLens", {
    rarity: "common",
    price: 50,
    tag: "weird",
    tags: ["dice", "reroll"],
    effects: [
      {
        on: "rolled",
        if: [{ c: "isMinFace" }],
        do: [{ a: "rerollDie" }],
      },
    ],
  }),
  moduleDef("gamblersChip", {
    rarity: "common",
    price: 50,
    tag: "weird",
    tags: ["risk", "scrap", "dice"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "isMaxFace" }],
        do: [
          { a: "scrap", n: 2, perTag: "risk" },
          { a: "rerollDie", sel: { s: "randomOther" } },
        ],
      },
    ],
  }),
  moduleDef("prophecyMount", {
    rarity: "common",
    price: 55,
    tag: "weird",
    tags: ["weapons", "precision"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "weaponA" }, { c: "isMaxFace" }],
        do: [{ a: "primeSchool", school: "grey", max: true }],
      },
    ],
  }),
  moduleDef("entropySink", {
    rarity: "uncommon",
    price: 60,
    tag: "weird",
    tags: ["reactor", "charge"],
    mods: { chargeCapDelta: 2 },
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "isMinFace" }, { c: "slotMk", slot: "reactor", n: 2 }],
        do: [{ a: "charge", n: 3 }],
      },
    ],
  }),
  moduleDef("blackLedger", {
    rarity: "uncommon",
    price: 65,
    tag: "weird",
    tags: ["scrap", "risk"],
    effects: [
      {
        on: "nodeEnter",
        do: [
          { a: "scrap", n: 3 },
          { a: "counter", scope: "run", key: "ledgerLines", delta: 1 },
        ],
      },
      {
        on: "battleStart",
        if: [{ c: "counterAtLeast", scope: "run", key: "ledgerLines", n: 6 }],
        do: [
          { a: "hull", n: -4 },
          { a: "counter", scope: "run", key: "ledgerLines", delta: -6 },
        ],
      },
    ],
  }),
  moduleDef("phantomBay", {
    rarity: "uncommon",
    price: 70,
    tag: "weird",
    tags: ["dice", "swarm"],
    effects: [
      {
        on: "turnEnd",
        do: [{ a: "addTempDie", defId: "grey-d4", turns: 1 }],
      },
    ],
  }),
  moduleDef("delayLine", {
    rarity: "uncommon",
    price: 70,
    tag: "weird",
    tags: ["weapons", "spike"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "weaponB" }, { c: "isMaxFace" }],
        do: [
          {
            a: "schedule",
            on: "nextTurn",
            do: [{ a: "dmg", n: 3, perTag: "spike" }],
          },
        ],
      },
    ],
  }),
  moduleDef("paradoxLoop", {
    rarity: "rare",
    price: 90,
    tag: "weird",
    tags: ["weapons", "risk"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "weaponA" }, { c: "isMaxFace" }],
        do: [{ a: "repeatSlot" }],
      },
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "weaponB" }, { c: "isMinFace" }],
        do: [{ a: "repeatSlot" }],
      },
    ],
  }),
  moduleDef("coldLogicCore", {
    rarity: "rare",
    price: 85,
    tag: "weird",
    tags: ["precision", "dice"],
    traits: ["coldLogic"],
    mods: { nudgeCostDelta: -2 },
    effects: [
      {
        on: "battleStart",
        do: [{ a: "grant", what: "nudge", n: 2 }],
      },
    ],
  }),
  moduleDef("nonEuclidRack", {
    rarity: "legendary",
    price: 120,
    tag: "weird",
    tags: ["overcap", "risk", "dice"],
    mods: { chargeCapDelta: -3 },
    effects: [
      {
        on: "battleStart",
        do: [{ a: "allowExceedCap", hullCost: 1 }],
      },
    ],
  }),
];
