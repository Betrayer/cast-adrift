import { perk } from "@/data/perks/builder";
import type { PerkDef } from "@/data/perks/types";

export const SYSTEM_PERKS: readonly PerkDef[] = [
  perk("targeter", "systems", "common", {
    tags: ["sensors", "precision"],
    mods: { markBonusDelta: 1, jamPowerDelta: -1 },
  }),
  perk("plating", "systems", "common", {
    tags: ["survival"],
    mods: { hullMaxDelta: 5 },
    effects: [
      {
        on: "battleEnd",
        if: [{ c: "battleOutcome", is: "victory" }],
        do: [{ a: "heal", n: 2 }],
      },
    ],
  }),
  perk("afterburner", "systems", "common", {
    tags: ["engines", "dodge"],
    mods: { evasionDelta: 6, hullMaxDelta: -2 },
  }),
  perk("hullWeld", "systems", "common", {
    tags: ["repairBay"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "repairBay" }],
        do: [{ a: "heal", n: 1 }],
      },
    ],
  }),
  perk("spotterCall", "systems", "common", {
    tags: ["sensors", "charge"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "sensors" }, { c: "valueGte", n: 5 }],
        do: [{ a: "charge", n: 1 }],
      },
    ],
  }),
  perk("crewDrill", "systems", "common", {
    tags: ["precision"],
    mods: { xpMultPct: 12 },
  }),
  perk("autoAlign", "systems", "common", {
    tags: ["sensors", "reroll", "precision"],
    effects: [
      {
        on: "place",
        if: [{ c: "slot", is: "sensors" }, { c: "valueLt", n: 3 }],
        do: [{ a: "rerollDie" }],
      },
    ],
  }),
  perk("coreTap", "systems", "common", {
    tags: ["reactor", "charge"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [
          { c: "slot", is: "reactor" },
          { c: "slotMk", slot: "reactor", n: 2 },
        ],
        do: [{ a: "charge", n: 2 }],
      },
    ],
  }),
  perk("damageControl", "systems", "common", {
    tags: ["survival", "shieldwall"],
    effects: [
      {
        on: "turnEnd",
        if: [{ c: "hullPctLt", n: 50 }],
        do: [{ a: "shield", n: 3 }],
      },
    ],
  }),
  perk("spallLiner", "systems", "common", {
    tags: ["shieldwall", "survival"],
    effects: [
      {
        on: "battleStart",
        do: [{ a: "shield", n: 2, perTag: "survival" }],
      },
    ],
  }),
  perk("scavengedArmour", "systems", "common", {
    tags: ["survival", "scrap"],
    mods: { hullMaxDelta: 6, scrapMultPct: -10 },
  }),
  perk("crashPriority", "systems", "common", {
    tags: ["reactor", "charge", "risk"],
    effects: [
      {
        on: "battleStart",
        if: [{ c: "not", of: { c: "hullPctLt", n: 50 } }],
        do: [
          { a: "hull", n: -1 },
          { a: "charge", n: 4 },
        ],
      },
    ],
  }),
  perk("spareHands", "systems", "common", {
    tags: ["precision", "dice"],
    effects: [
      {
        on: "battleStart",
        if: [{ c: "countTag", tag: "precision", n: 3 }],
        do: [{ a: "grant", what: "nudge", n: 1 }],
      },
    ],
  }),
  perk("jammer-plus", "systems", "uncommon", {
    tags: ["sensors", "control"],
    mods: { jamPowerDelta: 2, markBonusDelta: -1 },
  }),
  perk("targetingSuite", "systems", "uncommon", {
    tags: ["sensors", "precision", "charge"],
    mods: { markBonusDelta: 2 },
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "sensors" }],
        do: [{ a: "charge", n: 1, perTag: "precision" }],
      },
    ],
  }),
  perk("tug", "systems", "uncommon", {
    tags: ["engines", "dodge", "charge"],
    traits: ["dodgeCharge"],
  }),
  perk("reinforcedBay", "systems", "uncommon", {
    tags: ["risk"],
    mods: { moduleSlotDelta: 1, hullMaxDelta: -3 },
  }),
  perk("hardenedHull", "systems", "uncommon", {
    tags: ["survival"],
    mods: { hullMaxDelta: 6, battleEndHeal: 1 },
  }),
  perk("overrideKeys", "systems", "uncommon", {
    tags: ["overcap", "weapons", "risk"],
    effects: [
      {
        on: "battleStart",
        if: [{ c: "not", of: { c: "hullPctLt", n: 60 } }],
        do: [{ a: "allowExceedCap", slot: "weapons", hullCost: 2 }],
      },
    ],
  }),
  perk("markLedger", "systems", "uncommon", {
    tags: ["sensors", "precision", "crit"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "sensors" }],
        do: [{ a: "counter", scope: "battle", key: "markLog", delta: 1 }],
      },
      {
        on: "beforeResolveSlot",
        if: [
          { c: "slot", is: "weapons" },
          { c: "counterAtLeast", scope: "battle", key: "markLog", n: 3 },
        ],
        do: [{ a: "crit" }],
      },
    ],
  }),
  perk("refitCrew", "systems", "uncommon", {
    tags: ["repairBay", "survival"],
    effects: [
      {
        on: "nodeEnter",
        if: [{ c: "hullPctLt", n: 50 }],
        do: [{ a: "heal", n: 3 }],
      },
    ],
  }),
  perk("flightLog", "systems", "uncommon", {
    tags: ["scrap"],
    mods: { xpMultPct: 25, scrapMultPct: -15 },
  }),
  perk("shockLance", "systems", "rare", {
    synergy: ["spinal"],
    tags: ["spinal", "spike", "weapons"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "spinal" }],
        do: [{ a: "modDieValue", n: 5 }],
      },
      {
        on: "place",
        if: [{ c: "slot", is: "spinal" }, { c: "valueLt", n: 5 }],
        do: [{ a: "rerollDie" }],
      },
    ],
  }),
  perk("piercingRounds", "systems", "rare", {
    synergy: ["pierce"],
    tags: ["weapons", "pierce", "precision"],
    traits: ["firstHitPierce"],
    mods: { markBonusDelta: 1 },
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "isMaxFace" }],
        do: [{ a: "dmg", n: 2, perTag: "pierce" }],
      },
    ],
  }),
  perk("fullRefit", "systems", "rare", {
    synergy: ["precision"],
    tags: ["precision", "dice"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "countTag", tag: "precision", n: 4 }],
        do: [{ a: "modDieValue", n: 2 }],
      },
    ],
  }),
];
