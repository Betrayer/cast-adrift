import { perk } from "@/data/perks/builder";
import type { PerkDef } from "@/data/perks/types";

export const YELLOW_PERKS: readonly PerkDef[] = [
  perk("pocketChange", "yellow", "common", { mods: { battleStartScrap: 2 } }),
  perk("finderFee", "yellow", "common", { mods: { scrapPerKill: 2 } }),
  perk("streetPrice", "yellow", "common", { mods: { shopDiscountPct: 8 } }),
  perk("luckyStreak", "yellow", "common", {
    effects: [
      { on: "afterResolveSlot", if: [{ c: "isMaxFace" }], do: [{ a: "scrap", n: 3 }] },
    ],
  }),
  perk("scrapline", "yellow", "common", { mods: { scrapMultPct: 12 } }),
  perk("smallMercies", "yellow", "common", {
    effects: [
      { on: "afterResolveSlot", if: [{ c: "isMinFace" }], do: [{ a: "scrap", n: 2 }] },
    ],
  }),
  perk("goldTooth", "yellow", "common", {
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "school", is: "yellow" }],
        do: [{ a: "scrap", n: 1 }],
      },
    ],
  }),
  perk("tallyMark", "yellow", "common", { mods: { xpMultPct: 10 } }),
  perk("bountyBoard", "yellow", "uncommon", { mods: { scrapPerKill: 4 } }),
  perk("marketRun", "yellow", "uncommon", {
    mods: { shopDiscountPct: 10, freeShopRerolls: 1 },
  }),
  perk("goldRush", "yellow", "uncommon", {
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "school", is: "yellow" }, { c: "isMaxFace" }],
        do: [{ a: "scrap", n: 8 }],
      },
    ],
  }),
  perk("houseEdge", "yellow", "uncommon", {
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "school", is: "yellow" }, { c: "isMaxFace" }],
        do: [{ a: "modDieValue", n: 3 }],
      },
    ],
  }),
  perk("ledgerTrick", "yellow", "uncommon", {
    mods: { scrapMultPct: 20, hullMaxDelta: -2 },
  }),
  perk("mintCondition", "yellow", "rare", {
    synergy: { kind: "school", school: "yellow" },
    effects: [
      {
        on: "afterResolveSlot",
        if: [
          { c: "isMaxFace" },
          { c: "resonanceAtLeast", school: "yellow", n: 4 },
        ],
        do: [
          { a: "scrap", n: 12 },
          { a: "charge", n: 1 },
        ],
      },
    ],
  }),
  perk("silentPartner", "yellow", "rare", {
    synergy: { kind: "module", id: "tithePlate" },
    mods: { scrapMultPct: 30, shopDiscountPct: 10 },
  }),
  perk("veinTap", "yellow", "rare", {
    synergy: { kind: "engraving", id: "mint" },
    mods: { scrapPerKill: 6, battleStartScrap: 6 },
  }),
];
