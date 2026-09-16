import { moduleDef } from "@/data/modules/types";
import type { ModuleDef } from "@/data/modules/types";

export const DEFENSE_MODULES: readonly ModuleDef[] = [
  moduleDef("ballastModule", {
    rarity: "common",
    price: 45,
    tag: "defense",
    tags: ["survival"],
    mods: { hullMaxDelta: 5, evasionDelta: -2 },
    effects: [{ on: "nodeEnter", do: [{ a: "heal", n: 1 }] }],
  }),
  moduleDef("hardpointClamp", {
    rarity: "common",
    price: 50,
    tag: "defense",
    tags: ["engines", "dodge"],
    mods: { evasionDelta: 2 },
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
  }),
  moduleDef("heatsink", {
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
  }),
  moduleDef("bufferCells", {
    rarity: "common",
    price: 45,
    tag: "defense",
    tags: ["shieldwall", "risk"],
    mods: { hullMaxDelta: -3 },
    effects: [{ on: "battleStart", do: [{ a: "shield", n: 6 }] }],
  }),
  moduleDef("dampingCoil", {
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
  }),
  moduleDef("ablativeWeave", {
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
  }),
  moduleDef("mirrorPlate", {
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
  }),
  moduleDef("voidLiner", {
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
  }),
  moduleDef("fieldStabilizer", {
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
  }),
  moduleDef("escapePod", {
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
  }),
  moduleDef("bulkheadRing", {
    rarity: "rare",
    price: 85,
    tag: "defense",
    tags: ["survival", "shieldwall"],
    mods: { hullMaxDelta: 8, evasionDelta: -2 },
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
  }),
  moduleDef("citadelCore", {
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
  }),
];
