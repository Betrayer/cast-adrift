import { perk } from "@/data/perks/builder";
import type { PerkDef } from "@/data/perks/types";

export const YELLOW_PERKS: readonly PerkDef[] = [
  perk("coin", "yellow", "common", {
    tags: ["scrap", "risk"],
    mods: { battleStartScrap: 3 },
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "any", of: [{ c: "isMaxFace" }, { c: "isMinFace" }] }],
        do: [{ a: "scrap", n: 1 }],
      },
    ],
  }),
  perk("luckyStreak", "yellow", "common", {
    tags: ["scrap"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "isMaxFace" }],
        do: [{ a: "scrap", n: 3 }],
      },
    ],
  }),
  perk("smallMercies", "yellow", "common", {
    tags: ["scrap", "risk"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "isMinFace" }],
        do: [{ a: "scrap", n: 2 }],
      },
    ],
  }),
  perk("goldTooth", "yellow", "common", {
    tags: ["scrap"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "school", is: "yellow" }],
        do: [{ a: "scrap", n: 1 }],
      },
    ],
  }),
  perk("pocketChange", "yellow", "common", {
    tags: ["scrap"],
    effects: [
      { on: "nodeEnter", do: [{ a: "scrap", n: 1, perTag: "scrap" }] },
    ],
  }),
  perk("tallyMark", "yellow", "common", {
    tags: ["scrap"],
    effects: [
      {
        on: "battleEnd",
        if: [{ c: "battleOutcome", is: "victory" }],
        do: [{ a: "counter", scope: "run", key: "tally", delta: 1 }],
      },
      {
        on: "nodeEnter",
        if: [{ c: "counterAtLeast", scope: "run", key: "tally", n: 6 }],
        do: [{ a: "scrap", n: 3 }],
      },
    ],
  }),
  perk("fortune", "yellow", "common", {
    tags: ["reroll", "dice"],
    effects: [
      {
        on: "battleStart",
        if: [{ c: "countTag", tag: "yellow", n: 3 }],
        do: [{ a: "grant", what: "rerollUses", n: 1 }],
      },
    ],
  }),
  perk("sureThing", "yellow", "common", {
    tags: ["precision", "dice"],
    effects: [
      {
        on: "place",
        if: [{ c: "isMinFace" }, { c: "valueLt", n: 3 }],
        do: [
          { a: "setDieValue", n: 3 },
          { a: "scrap", n: -2 },
        ],
      },
    ],
  }),
  perk("chipStack", "yellow", "common", {
    tags: ["crit", "weapons"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [
          { c: "slot", is: "weapons" },
          { c: "isMaxFace" },
          { c: "chargeAtLeast", n: 5 },
        ],
        do: [{ a: "crit" }],
      },
    ],
  }),
  perk("streetPrice", "yellow", "common", {
    tags: ["scrap"],
    mods: { shopDiscountPct: 8, scrapMultPct: -5 },
  }),
  perk("scrapline", "yellow", "common", {
    tags: ["scrap"],
    mods: { scrapMultPct: 12 },
  }),
  perk("finderFee", "yellow", "common", {
    tags: ["scrap"],
    mods: { scrapPerKill: 2 },
  }),
  perk("prospector", "yellow", "uncommon", {
    tags: ["scrap"],
    effects: [
      { on: "battleStart", do: [{ a: "scrap", n: 2, perTag: "yellow" }] },
    ],
  }),
  perk("warChest", "yellow", "uncommon", {
    tags: ["charge", "risk"],
    effects: [
      {
        on: "battleStart",
        if: [{ c: "hasTag", tag: "scrap" }],
        do: [{ a: "charge", n: 3 }],
      },
    ],
  }),
  perk("bountyBoard", "yellow", "uncommon", {
    tags: ["scrap"],
    effects: [
      {
        on: "battleEnd",
        if: [{ c: "battleOutcome", is: "victory" }],
        do: [{ a: "scrap", n: 12 }],
      },
    ],
  }),
  perk("goldRush", "yellow", "uncommon", {
    tags: ["scrap", "spike"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "school", is: "yellow" }, { c: "isMaxFace" }],
        do: [{ a: "scrap", n: 8 }],
      },
    ],
  }),
  perk("houseEdge", "yellow", "uncommon", {
    tags: ["crit", "weapons"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "valueGte", n: 7 }],
        do: [{ a: "crit" }],
      },
    ],
  }),
  perk("marginCall", "yellow", "uncommon", {
    tags: ["risk", "precision"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "valueLt", n: 4 }],
        do: [
          { a: "modDieValue", n: 5 },
          { a: "scrap", n: -3 },
        ],
      },
    ],
  }),
  perk("haggler", "yellow", "uncommon", {
    tags: ["scrap"],
    mods: { shopDiscountPct: 18, xpMultPct: -10 },
  }),
  perk("ledgerTrick", "yellow", "uncommon", {
    tags: ["scrap", "risk"],
    mods: { scrapMultPct: 20, chargeCapDelta: -2 },
  }),
  perk("marketRun", "yellow", "uncommon", {
    tags: ["scrap", "reroll"],
    mods: { shopDiscountPct: 10, freeShopRerolls: 1 },
  }),
  perk("mintCondition", "yellow", "rare", {
    synergy: ["yellow"],
    tags: ["scrap", "spike"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "isMaxFace" }, { c: "countTag", tag: "yellow", n: 4 }],
        do: [
          { a: "scrap", n: 10 },
          { a: "charge", n: 2 },
        ],
      },
    ],
  }),
  perk("silentPartner", "yellow", "rare", {
    synergy: ["scrap"],
    tags: ["scrap"],
    mods: { shopDiscountPct: 12, freeShopRerolls: 1 },
    effects: [
      {
        on: "battleEnd",
        if: [{ c: "battleOutcome", is: "victory" }],
        do: [{ a: "scrap", n: 4, perTag: "scrap" }],
      },
    ],
  }),
  perk("veinTap", "yellow", "rare", {
    synergy: ["risk"],
    tags: ["scrap", "risk"],
    mods: { scrapMultPct: 40, rerollSizeDelta: -1 },
  }),
  perk("loadedDice", "yellow", "rare", {
    synergy: ["dice"],
    tags: ["dice", "reroll"],
    traits: ["fateTwice"],
    mods: { nudgeCostDelta: -2 },
  }),
];
