import { perk } from "@/data/perks/builder";
import type { PerkDef } from "@/data/perks/types";

export const BLACK_PERKS: readonly PerkDef[] = [
  perk("darkCurrent", "black", "common", {
    tags: ["reactor"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "reactor" }, { c: "valueLt", n: 5 }],
        do: [{ a: "modDieValue", n: 2 }],
      },
    ],
  }),
  perk("lowTide", "black", "common", {
    tags: ["charge", "dice"],
    effects: [
      { on: "rolled", if: [{ c: "isMinFace" }], do: [{ a: "charge", n: 1 }] },
    ],
  }),
  perk("brinkmanship", "black", "common", {
    tags: ["risk"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "countTag", tag: "risk", n: 3 }],
        do: [{ a: "modDieValue", n: 1 }],
      },
    ],
  }),
  perk("blackTithe", "black", "common", {
    tags: ["scrap", "risk"],
    effects: [
      {
        on: "nodeEnter",
        if: [{ c: "not", of: { c: "hullPctLt", n: 25 } }],
        do: [
          { a: "scrap", n: 5 },
          { a: "hull", n: -1 },
        ],
      },
    ],
  }),
  perk("coldFusion", "black", "common", {
    tags: ["charge", "reactor"],
    mods: { chargeCapDelta: 4, scrapMultPct: -15 },
  }),
  perk("longOdds", "black", "common", {
    tags: ["risk"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "school", is: "black" }, { c: "isMinFace" }],
        do: [{ a: "modDieValue", n: 3 }],
      },
    ],
  }),
  perk("hardBargain", "black", "common", {
    tags: ["scrap", "risk"],
    mods: { scrapMultPct: 15, hullMaxDelta: -1 },
  }),
  perk("nightShift", "black", "common", {
    tags: ["reactor", "charge"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "reactor" }, { c: "isMaxFace" }],
        do: [{ a: "charge", n: 2 }],
      },
    ],
  }),
  perk("back-door", "black", "common", {
    tags: ["scrap", "risk"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "school", is: "black" }, { c: "isMinFace" }],
        do: [{ a: "scrap", n: 6 }],
      },
    ],
  }),
  perk("snakeEyes", "black", "common", {
    tags: ["weapons", "risk"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "isMinFace" }],
        do: [{ a: "dmg", n: 3 }],
      },
    ],
  }),
  perk("looseBallast", "black", "common", {
    tags: ["reroll", "risk"],
    mods: { extraRerolls: 1, hullMaxDelta: -3 },
  }),
  perk("downPayment", "black", "common", {
    tags: ["risk", "spike"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [
          { c: "firstOfTurn" },
          { c: "not", of: { c: "hullPctLt", n: 80 } },
        ],
        do: [
          { a: "modDieValue", n: 6 },
          { a: "hull", n: -1 },
        ],
      },
    ],
  }),
  perk("hazardPay", "black", "common", {
    tags: ["scrap", "survival"],
    effects: [
      {
        on: "battleStart",
        if: [{ c: "hullPctLt", n: 50 }],
        do: [{ a: "scrap", n: 10 }],
      },
    ],
  }),
  perk("on-edge", "black", "uncommon", {
    tags: ["risk"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "hullPctLt", n: 30 }],
        do: [{ a: "modDieValue", n: 1 }],
      },
    ],
  }),
  perk("eventHorizon", "black", "uncommon", {
    tags: ["reactor"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "reactor" }, { c: "school", is: "black" }],
        do: [{ a: "modDieValue", n: 3 }],
      },
    ],
  }),
  perk("bloodPrice", "black", "uncommon", {
    tags: ["weapons", "risk"],
    effects: [
      {
        on: "turnEnd",
        if: [{ c: "not", of: { c: "hullPctLt", n: 85 } }],
        do: [
          { a: "hull", n: -1 },
          { a: "dmg", n: 9 },
        ],
      },
    ],
  }),
  perk("heatShroud", "black", "uncommon", {
    tags: ["reactor", "shieldwall"],
    traits: ["overflowShield"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "reactor" }, { c: "chargeAtLeast", n: 8 }],
        do: [{ a: "shield", n: 4 }],
      },
    ],
  }),
  perk("scrapheap", "black", "uncommon", {
    tags: ["charge", "scrap", "dice"],
    traits: ["recycler"],
    effects: [
      {
        on: "battleEnd",
        if: [{ c: "battleOutcome", is: "victory" }],
        do: [{ a: "scrap", n: 5 }],
      },
    ],
  }),
  perk("deadReckoning", "black", "uncommon", {
    tags: ["charge", "risk"],
    mods: { chargeCapDelta: 3, hullMaxDelta: -3 },
  }),
  perk("singularity", "black", "uncommon", {
    tags: ["reactor", "charge", "risk"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [
          { c: "slot", is: "reactor" },
          { c: "not", of: { c: "hullPctLt", n: 40 } },
        ],
        do: [
          { a: "charge", n: 3 },
          { a: "hull", n: -1 },
        ],
      },
    ],
  }),
  perk("overdraft", "black", "uncommon", {
    tags: ["overcap", "weapons", "risk"],
    effects: [
      {
        on: "battleStart",
        do: [{ a: "allowExceedCap", slot: "weapons", hullCost: 2 }],
      },
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "valueGte", n: 9 }],
        do: [{ a: "charge", n: 2 }],
      },
    ],
  }),
  perk("debtCollector", "black", "uncommon", {
    tags: ["risk", "spike"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "isMinFace" }],
        do: [{ a: "counter", scope: "battle", key: "blackDebt", delta: 1 }],
      },
      {
        on: "turnEnd",
        if: [{ c: "counterAtLeast", scope: "battle", key: "blackDebt", n: 4 }],
        do: [{ a: "dmg", n: 1, perTag: "risk" }],
      },
    ],
  }),
  perk("obsidianCreed", "black", "rare", {
    synergy: ["black", "risk"],
    tags: ["risk", "charge"],
    traits: ["obsidianPact"],
    mods: { chargeCapDelta: 2 },
    effects: [
      {
        on: "battleStart",
        do: [{ a: "charge", n: 1, perTag: "risk" }],
      },
    ],
  }),
  perk("blood-reactor", "black", "rare", {
    synergy: ["reactor", "charge"],
    tags: ["reactor", "charge", "risk"],
    traits: ["bloodReactor"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [
          { c: "slot", is: "reactor" },
          { c: "countTag", tag: "charge", n: 4 },
        ],
        do: [{ a: "charge", n: 2 }],
      },
    ],
  }),
  perk("sacrifice", "black", "rare", {
    synergy: ["risk", "weapons"],
    tags: ["weapons", "risk", "dice"],
    traits: ["sacrifice"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "hullPctLt", n: 34 }],
        do: [{ a: "crit" }],
      },
    ],
  }),
  perk("lastBreath", "black", "rare", {
    synergy: ["survival"],
    tags: ["survival", "shieldwall"],
    traits: ["escapePod"],
    effects: [
      {
        on: "battleStart",
        if: [{ c: "hullPctLt", n: 34 }],
        do: [{ a: "shield", n: 8 }],
      },
    ],
  }),
];
