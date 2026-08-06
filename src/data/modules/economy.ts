import type { ModuleDef } from "@/data/modules/types";

export const ECONOMY_MODULES: readonly ModuleDef[] = [
  {
    id: "magnetScoop",
    name: "content:modules.magnetScoop.name",
    desc: "content:modules.magnetScoop.desc",
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
  },
  {
    id: "assayRig",
    name: "content:modules.assayRig.name",
    desc: "content:modules.assayRig.desc",
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
  },
  {
    id: "slagPress",
    name: "content:modules.slagPress.name",
    desc: "content:modules.slagPress.desc",
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
  },
  {
    id: "lotteryBlock",
    name: "content:modules.lotteryBlock.name",
    desc: "content:modules.lotteryBlock.desc",
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
  },
  {
    id: "salvageArm",
    name: "content:modules.salvageArm.name",
    desc: "content:modules.salvageArm.desc",
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
  },
  {
    id: "grapple",
    name: "content:modules.grapple.name",
    desc: "content:modules.grapple.desc",
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
  },
  {
    id: "brokerLink",
    name: "content:modules.brokerLink.name",
    desc: "content:modules.brokerLink.desc",
    rarity: "uncommon",
    price: 65,
    tag: "economy",
    tags: ["sensors", "risk"],
    mods: { shopDiscountPct: 16, hullMaxDelta: -3 },
  },
  {
    id: "trainingModule",
    name: "content:modules.trainingModule.name",
    desc: "content:modules.trainingModule.desc",
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
  },
  {
    id: "auditCore",
    name: "content:modules.auditCore.name",
    desc: "content:modules.auditCore.desc",
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
  },
  {
    id: "tithePlate",
    name: "content:modules.tithePlate.name",
    desc: "content:modules.tithePlate.desc",
    rarity: "rare",
    price: 85,
    tag: "economy",
    tags: ["precision"],
    mods: { scrapMultPct: 25 },
    effects: [
      { on: "battleStart", do: [{ a: "scrap", n: 2, perTag: "scrap" }] },
    ],
  },
  {
    id: "bondedVault",
    name: "content:modules.bondedVault.name",
    desc: "content:modules.bondedVault.desc",
    rarity: "rare",
    price: 80,
    tag: "economy",
    tags: ["charge", "reactor"],
    mods: { chargeCapDelta: 2 },
    effects: [
      { on: "battleStart", do: [{ a: "charge", n: 1, perTag: "scrap" }] },
    ],
  },
  {
    id: "foundryCore",
    name: "content:modules.foundryCore.name",
    desc: "content:modules.foundryCore.desc",
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
  },
];
