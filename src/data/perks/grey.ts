import { perk } from "@/data/perks/builder";
import type { PerkDef } from "@/data/perks/types";

export const GREY_PERKS: readonly PerkDef[] = [
  perk("widerGrip", "grey", "common", {
    tags: ["reroll"],
    mods: { rerollSizeDelta: 1 },
  }),
  perk("shimStock", "grey", "common", {
    tags: ["precision"],
    mods: { nudgeCostDelta: -1 },
  }),
  perk("deckHand", "grey", "common", {
    tags: ["dice"],
    mods: { reserveDelta: 1 },
  }),
  perk("greyMarket", "grey", "common", {
    tags: ["scrap"],
    mods: { shopDiscountPct: 6, scrapMultPct: 6 },
  }),
  perk("dampers", "grey", "common", {
    tags: ["survival", "charge"],
    mods: { hullMaxDelta: 2, chargeCapDelta: 1 },
  }),
  perk("toolRoll", "grey", "common", {
    tags: ["reroll", "risk"],
    mods: { extraRerolls: 1, hullMaxDelta: -2 },
  }),
  perk("counterweight", "grey", "common", {
    tags: ["dice", "precision"],
    effects: [
      { on: "rolled", if: [{ c: "valueLt", n: 2 }], do: [{ a: "modDieValue", n: 1 }] },
    ],
  }),
  perk("checklist", "grey", "common", {
    tags: ["charge", "precision"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "firstOfTurn" }],
        do: [{ a: "charge", n: 1 }],
      },
    ],
  }),
  perk("dryRun", "grey", "common", {
    tags: ["reroll", "dice"],
    effects: [
      {
        on: "rolled",
        if: [{ c: "equalsLast" }, { c: "valueLt", n: 4 }],
        do: [{ a: "rerollDie" }],
      },
    ],
  }),
  perk("spareParts", "grey", "common", {
    tags: ["dice"],
    effects: [
      {
        on: "battleStart",
        do: [{ a: "addTempDie", defId: "grey-d4", turns: 2 }],
      },
    ],
  }),
  perk("teardown", "grey", "common", {
    tags: ["dice", "scrap"],
    effects: [
      {
        on: "turnEnd",
        do: [{ a: "removeTempDie" }, { a: "scrap", n: 1, perTag: "dice" }],
      },
    ],
  }),
  perk("tallySheet", "grey", "common", {
    tags: ["charge", "precision"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "isMinFace" }],
        do: [{ a: "counter", scope: "battle", key: "greyTally", delta: 1 }],
      },
      {
        on: "turnEnd",
        if: [{ c: "counterAtLeast", scope: "battle", key: "greyTally", n: 3 }],
        do: [
          { a: "counter", scope: "battle", key: "greyTally", delta: -3 },
          { a: "charge", n: 3 },
        ],
      },
    ],
  }),
  perk("routineCheck", "grey", "common", {
    tags: ["reroll"],
    effects: [
      {
        on: "nodeEnter",
        do: [{ a: "counter", scope: "run", key: "greyLog", delta: 1 }],
      },
      {
        on: "battleStart",
        if: [{ c: "counterAtLeast", scope: "run", key: "greyLog", n: 10 }],
        do: [{ a: "grant", what: "rerollUses", n: 1 }],
      },
    ],
  }),
  perk("spare", "grey", "uncommon", {
    tags: ["dice", "reroll"],
    traits: ["spareLowest"],
    mods: { rerollSizeDelta: 1 },
  }),
  perk("quickHands", "grey", "uncommon", {
    tags: ["reroll", "dice"],
    mods: { rerollSizeDelta: 2, reserveDelta: -1 },
  }),
  perk("switchboard", "grey", "uncommon", {
    tags: ["sensors", "reroll", "precision"],
    mods: { markBonusDelta: 1 },
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "sensors" }],
        do: [{ a: "rerollDie", sel: { s: "lowestDie" } }],
      },
    ],
  }),
  perk("balanceBeam", "grey", "uncommon", {
    tags: ["dice", "precision"],
    effects: [
      {
        on: "rolled",
        if: [{ c: "isMaxFace" }],
        do: [
          { a: "modDieValue", n: -1 },
          { a: "modDieValue", n: 2, sel: { s: "lowestDie" } },
        ],
      },
    ],
  }),
  perk("holdBack", "grey", "uncommon", {
    tags: ["dice", "precision"],
    mods: { nudgeCostDelta: -1 },
    effects: [
      {
        on: "battleStart",
        if: [{ c: "countTag", tag: "dice", n: 3 }],
        do: [{ a: "grant", what: "reserve", n: 1 }],
      },
    ],
  }),
  perk("payloadShuffle", "grey", "uncommon", {
    tags: ["dice"],
    mods: { reserveDelta: 2, blueReserveDelta: 1, chargeCapDelta: -2 },
  }),
  perk("gimbalMount", "grey", "uncommon", {
    tags: ["engines", "sensors", "precision"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [
          {
            c: "any",
            of: [
              { c: "slot", is: "engines" },
              { c: "slot", is: "sensors" },
            ],
          },
          { c: "valueLt", n: 4 },
        ],
        do: [{ a: "setDieValue", n: 4 }],
      },
    ],
  }),
  perk("logistics", "grey", "uncommon", {
    tags: ["scrap"],
    mods: { freeShopRerolls: 2, shopDiscountPct: 12, scrapMultPct: -8 },
  }),
  perk("shortHaul", "grey", "uncommon", {
    tags: ["risk"],
    mods: { xpMultPct: 20, hullMaxDelta: -3 },
  }),
  perk("dryDock", "grey", "rare", {
    tags: ["repairBay"],
    synergy: ["repairBay"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "repairBay" }],
        do: [{ a: "heal", n: 2, perTag: "repairBay" }],
      },
    ],
  }),
  perk("masterKey", "grey", "rare", {
    tags: ["reroll"],
    synergy: ["reroll"],
    mods: { extraRerolls: 1, rerollSizeDelta: 1 },
    effects: [
      {
        on: "battleStart",
        if: [{ c: "countTag", tag: "reroll", n: 3 }],
        do: [
          { a: "grant", what: "rerollUses", n: 1 },
          { a: "grant", what: "rerollSize", n: 1 },
        ],
      },
    ],
  }),
  perk("greyProtocol", "grey", "rare", {
    tags: ["precision", "dice"],
    synergy: ["grey"],
    effects: [
      {
        on: "battleStart",
        if: [{ c: "resonanceAtLeast", school: "grey", n: 4 }],
        do: [
          { a: "grant", what: "nudge", n: 3 },
          { a: "grant", what: "reserve", n: 1 },
        ],
      },
    ],
  }),
  perk("cargoHold", "grey", "rare", {
    tags: ["dice"],
    synergy: ["dice"],
    mods: { reserveDelta: 2, rerollSizeDelta: -1 },
    effects: [
      { on: "battleStart", do: [{ a: "grant", what: "reserve", n: 1 }] },
    ],
  }),
];
