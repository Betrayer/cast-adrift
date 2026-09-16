import { moduleDef } from "@/data/modules/types";
import type { ModuleDef } from "@/data/modules/types";

export const ECONOMY_MODULES: readonly ModuleDef[] = [
  moduleDef("magnetScoop", {
    rarity: "common",
    price: 45,
    tag: "economy",
    tags: ["engines"],
    effects: [
      { on: "nodeEnter", do: [{ a: "scrap", n: 2 }] },
      {
        on: "battleEnd",
        if: [{ c: "battleOutcome", is: "victory" }],
        do: [{ a: "scrap", n: 3 }],
      },
    ],
  }),
  moduleDef("assayRig", {
    rarity: "common",
    price: 50,
    tag: "economy",
    tags: ["weapons", "precision"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "weaponA" }, { c: "isMaxFace" }],
        do: [{ a: "scrap", n: 5 }],
      },
    ],
  }),
  moduleDef("slagPress", {
    rarity: "common",
    price: 45,
    tag: "economy",
    tags: ["weapons", "dice"],
    effects: [
      {
        on: "place",
        if: [{ c: "slot", is: "weaponB" }, { c: "isMinFace" }],
        do: [
          { a: "setDieValue", n: 4 },
          { a: "scrap", n: 3 },
        ],
      },
    ],
  }),
  moduleDef("lotteryBlock", {
    rarity: "common",
    price: 55,
    tag: "economy",
    tags: ["risk"],
    mods: { freeShopRerolls: 1 },
    effects: [
      {
        on: "nodeEnter",
        do: [{ a: "counter", scope: "run", key: "lotteryBlockTicks", delta: 1 }],
      },
      {
        on: "nodeEnter",
        if: [
          { c: "counterAtLeast", scope: "run", key: "lotteryBlockTicks", n: 3 },
        ],
        do: [
          { a: "scrap", n: 12 },
          { a: "counter", scope: "run", key: "lotteryBlockTicks", delta: -3 },
        ],
      },
    ],
  }),
  moduleDef("salvageArm", {
    rarity: "common",
    price: 50,
    tag: "economy",
    tags: ["repairBay"],
    effects: [
      {
        on: "battleEnd",
        if: [{ c: "battleOutcome", is: "victory" }],
        do: [{ a: "counter", scope: "run", key: "salvageArmWrecks", delta: 1 }],
      },
      {
        on: "nodeEnter",
        if: [
          { c: "counterAtLeast", scope: "run", key: "salvageArmWrecks", n: 5 },
        ],
        do: [{ a: "scrap", n: 4 }],
      },
    ],
  }),
  moduleDef("grapple", {
    rarity: "uncommon",
    price: 60,
    tag: "economy",
    tags: ["weapons", "spike"],
    mods: { scrapPerKill: 3 },
    effects: [
      {
        on: "battleEnd",
        if: [{ c: "battleOutcome", is: "victory" }, { c: "turnLte", n: 3 }],
        do: [{ a: "scrap", n: 8 }],
      },
    ],
  }),
  moduleDef("brokerLink", {
    rarity: "uncommon",
    price: 65,
    tag: "economy",
    tags: ["sensors", "risk"],
    mods: { shopDiscountPct: 16, hullMaxDelta: -3 },
  }),
  moduleDef("trainingModule", {
    rarity: "uncommon",
    price: 60,
    tag: "economy",
    tags: ["precision", "reroll"],
    mods: { xpMultPct: 20 },
    effects: [
      {
        on: "nodeEnter",
        do: [
          { a: "counter", scope: "run", key: "trainingModuleDrills", delta: 1 },
        ],
      },
      {
        on: "battleStart",
        if: [
          {
            c: "counterAtLeast",
            scope: "run",
            key: "trainingModuleDrills",
            n: 4,
          },
        ],
        do: [{ a: "grant", what: "rerollUses", n: 1 }],
      },
    ],
  }),
  moduleDef("auditCore", {
    rarity: "uncommon",
    price: 70,
    tag: "economy",
    tags: ["reactor", "precision"],
    mods: { battleStartScrap: 4 },
    effects: [
      {
        on: "battleStart",
        if: [{ c: "slotMk", slot: "reactor", n: 2 }],
        do: [{ a: "scrap", n: 8 }],
      },
    ],
  }),
  moduleDef("tithePlate", {
    rarity: "rare",
    price: 85,
    tag: "economy",
    tags: ["precision"],
    mods: { scrapMultPct: 25 },
    effects: [
      { on: "battleStart", do: [{ a: "scrap", n: 2, perTag: "scrap" }] },
    ],
  }),
  moduleDef("bondedVault", {
    rarity: "rare",
    price: 80,
    tag: "economy",
    tags: ["charge", "reactor"],
    mods: { chargeCapDelta: 2 },
    effects: [
      { on: "battleStart", do: [{ a: "charge", n: 1, perTag: "scrap" }] },
    ],
  }),
  moduleDef("foundryCore", {
    rarity: "legendary",
    price: 125,
    tag: "economy",
    tags: ["dice", "spike"],
    mods: { scrapMultPct: 30, shopDiscountPct: 12 },
    effects: [
      {
        on: "battleStart",
        do: [{ a: "addTempDie", defId: "yellow-d6", turns: 3 }],
      },
      {
        on: "battleStart",
        if: [{ c: "countTag", tag: "scrap", n: 5 }],
        do: [{ a: "addTempDie", defId: "yellow-d6", turns: 3 }],
      },
    ],
  }),
];
