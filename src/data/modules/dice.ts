import type { ModuleDef } from "@/data/modules/types";

export const DICE_MODULES: readonly ModuleDef[] = [
  {
    id: "wideGrip",
    name: "content:modules.wideGrip.name",
    desc: "content:modules.wideGrip.desc",
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
  },
  {
    id: "nudgeGovernor",
    name: "content:modules.nudgeGovernor.name",
    desc: "content:modules.nudgeGovernor.desc",
    rarity: "common",
    price: 45,
    tag: "dice",
    tags: ["precision", "charge"],
    mods: { nudgeCostDelta: -1, chargeCapDelta: -1 },
  },
  {
    id: "primerCoil",
    name: "content:modules.primerCoil.name",
    desc: "content:modules.primerCoil.desc",
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
  },
  {
    id: "growthTrellis",
    name: "content:modules.growthTrellis.name",
    desc: "content:modules.growthTrellis.desc",
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
  },
  {
    id: "ratchetFeed",
    name: "content:modules.ratchetFeed.name",
    desc: "content:modules.ratchetFeed.desc",
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
  },
  {
    id: "solenoid",
    name: "content:modules.solenoid.name",
    desc: "content:modules.solenoid.desc",
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
  },
  {
    id: "gyroStabilizer",
    name: "content:modules.gyroStabilizer.name",
    desc: "content:modules.gyroStabilizer.desc",
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
  },
  {
    id: "seedVault",
    name: "content:modules.seedVault.name",
    desc: "content:modules.seedVault.desc",
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
  },
  {
    id: "echoBuffer",
    name: "content:modules.echoBuffer.name",
    desc: "content:modules.echoBuffer.desc",
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
  },
  {
    id: "capacitorBank",
    name: "content:modules.capacitorBank.name",
    desc: "content:modules.capacitorBank.desc",
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
  },
  {
    id: "resonator",
    name: "content:modules.resonator.name",
    desc: "content:modules.resonator.desc",
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
  },
  {
    id: "recycler",
    name: "content:modules.recycler.name",
    desc: "content:modules.recycler.desc",
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
  },
];
