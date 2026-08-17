import type { ModuleDef } from "@/data/modules/types";

export const DEFENSE_MODULES: readonly ModuleDef[] = [
  {
    id: "ballastModule",
    name: "content:modules.ballastModule.name",
    desc: "content:modules.ballastModule.desc",
    rarity: "common",
    price: 45,
    tag: "defense",
    tags: ["survival"],
    mods: { hullMaxDelta: 5, evasionDelta: -6 },
    effects: [{ on: "nodeEnter", do: [{ a: "heal", n: 1 }] }],
  },
  {
    id: "hardpointClamp",
    name: "content:modules.hardpointClamp.name",
    desc: "content:modules.hardpointClamp.desc",
    rarity: "common",
    price: 50,
    tag: "defense",
    tags: ["engines", "dodge"],
    mods: { evasionDelta: 6 },
    effects: [
      {
        on: "beforeResolveSlot",
        if: [
          { c: "slot", is: "engines" },
          { c: "slotMk", slot: "engines", n: 2 },
        ],
        do: [{ a: "modDieValue", n: 3 }],
      },
    ],
  },
  {
    id: "heatsink",
    name: "content:modules.heatsink.name",
    desc: "content:modules.heatsink.desc",
    rarity: "common",
    price: 50,
    tag: "defense",
    tags: ["reactor", "overcap"],
    effects: [
      {
        on: "battleStart",
        do: [{ a: "allowExceedCap", slot: "reactor", hullCost: 1 }],
      },
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "reactor" }, { c: "isMaxFace" }],
        do: [{ a: "shield", n: 3 }],
      },
    ],
  },
  {
    id: "bufferCells",
    name: "content:modules.bufferCells.name",
    desc: "content:modules.bufferCells.desc",
    rarity: "common",
    price: 45,
    tag: "defense",
    tags: ["shieldwall", "risk"],
    mods: { hullMaxDelta: -3 },
    effects: [{ on: "battleStart", do: [{ a: "shield", n: 6 }] }],
  },
  {
    id: "dampingCoil",
    name: "content:modules.dampingCoil.name",
    desc: "content:modules.dampingCoil.desc",
    rarity: "common",
    price: 50,
    tag: "defense",
    tags: ["shieldwall"],
    effects: [
      {
        on: "battleStart",
        do: [
          {
            a: "schedule",
            on: "forTurns",
            turns: 3,
            do: [{ a: "shield", n: 3 }],
          },
        ],
      },
    ],
  },
  {
    id: "ablativeWeave",
    name: "content:modules.ablativeWeave.name",
    desc: "content:modules.ablativeWeave.desc",
    rarity: "uncommon",
    price: 60,
    tag: "defense",
    tags: ["shieldwall"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [
          { c: "slot", is: "shields" },
          {
            c: "not",
            of: { c: "counterAtLeast", scope: "battle", key: "weaveLayers", n: 2 },
          },
        ],
        do: [
          { a: "shield", n: 5 },
          { a: "counter", scope: "battle", key: "weaveLayers", delta: 1 },
        ],
      },
    ],
  },
  {
    id: "mirrorPlate",
    name: "content:modules.mirrorPlate.name",
    desc: "content:modules.mirrorPlate.desc",
    rarity: "uncommon",
    price: 70,
    tag: "defense",
    tags: ["shieldwall", "spike"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [
          {
            c: "any",
            of: [
              { c: "slot", is: "shields" },
              { c: "slot", is: "shieldsB" },
            ],
          },
        ],
        do: [{ a: "counter", scope: "battle", key: "mirrorFacets", delta: 1 }],
      },
      {
        on: "turnEnd",
        if: [
          { c: "counterAtLeast", scope: "battle", key: "mirrorFacets", n: 2 },
        ],
        do: [
          { a: "dmg", n: 6 },
          { a: "counter", scope: "battle", key: "mirrorFacets", delta: -2 },
        ],
      },
    ],
  },
  {
    id: "voidLiner",
    name: "content:modules.voidLiner.name",
    desc: "content:modules.voidLiner.desc",
    rarity: "uncommon",
    price: 70,
    tag: "defense",
    tags: ["shieldwall", "survival"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "shieldsB" }],
        do: [{ a: "modDieValue", n: 4 }],
      },
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "shields" }, { c: "hullPctLt", n: 40 }],
        do: [{ a: "shield", n: 4 }],
      },
    ],
  },
  {
    id: "fieldStabilizer",
    name: "content:modules.fieldStabilizer.name",
    desc: "content:modules.fieldStabilizer.desc",
    rarity: "uncommon",
    price: 70,
    tag: "defense",
    tags: ["control", "precision"],
    mods: { tideEffectDelta: -1 },
    effects: [
      {
        on: "battleStart",
        if: [{ c: "tideAtLeast", n: 3 }],
        do: [
          { a: "grant", what: "nudge", n: 1 },
          { a: "shield", n: 4 },
        ],
      },
    ],
  },
  {
    id: "escapePod",
    name: "content:modules.escapePod.name",
    desc: "content:modules.escapePod.desc",
    rarity: "rare",
    price: 90,
    tag: "defense",
    tags: ["survival"],
    traits: ["escapePod"],
    effects: [
      {
        on: "battleStart",
        if: [{ c: "hullPctLt", n: 40 }],
        do: [
          { a: "shield", n: 8 },
          { a: "grant", what: "reserve", n: 1 },
        ],
      },
    ],
  },
  {
    id: "bulkheadRing",
    name: "content:modules.bulkheadRing.name",
    desc: "content:modules.bulkheadRing.desc",
    rarity: "rare",
    price: 85,
    tag: "defense",
    tags: ["survival", "shieldwall"],
    mods: { hullMaxDelta: 8, evasionDelta: -6 },
    effects: [
      {
        on: "battleStart",
        if: [{ c: "slotMk", slot: "shields", n: 2 }],
        do: [{ a: "shield", n: 6 }],
      },
      {
        on: "battleStart",
        if: [{ c: "slotMk", slot: "shields", n: 3 }],
        do: [{ a: "grant", what: "reserve", n: 1 }],
      },
    ],
  },
  {
    id: "citadelCore",
    name: "content:modules.citadelCore.name",
    desc: "content:modules.citadelCore.desc",
    rarity: "legendary",
    price: 120,
    tag: "defense",
    tags: ["shieldwall", "overcap", "survival"],
    effects: [
      {
        on: "battleStart",
        do: [
          { a: "allowExceedCap", slot: "shields", hullCost: 0 },
          { a: "allowExceedCap", slot: "shieldsB", hullCost: 0 },
          { a: "shield", n: 2, perTag: "shieldwall" },
        ],
      },
      {
        on: "afterResolveSlot",
        if: [
          {
            c: "any",
            of: [
              { c: "slot", is: "shields" },
              { c: "slot", is: "shieldsB" },
            ],
          },
          { c: "shieldAtLeast", n: 12 },
        ],
        do: [{ a: "heal", n: 3 }],
      },
    ],
  },
];
