import { perk } from "@/data/perks/builder";
import type { PerkDef } from "@/data/perks/types";

export const GREY_PERKS: readonly PerkDef[] = [
  perk("widerGrip", "grey", "common", { mods: { rerollSizeDelta: 1 } }),
  perk("shimStock", "grey", "common", { mods: { nudgeCostDelta: -1 } }),
  perk("deckHand", "grey", "common", { mods: { reserveDelta: 1 } }),
  perk("toolRoll", "grey", "common", { mods: { extraRerolls: 1 } }),
  perk("counterweight", "grey", "common", {
    effects: [
      { on: "rolled", if: [{ c: "valueLt", n: 2 }], do: [{ a: "modDieValue", n: 1 }] },
    ],
  }),
  perk("checklist", "grey", "common", {
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "turnLte", n: 1 }],
        do: [{ a: "modDieValue", n: 1 }],
      },
    ],
  }),
  perk("greyMarket", "grey", "common", { mods: { shopDiscountPct: 6, scrapMultPct: 6 } }),
  perk("spareParts", "grey", "common", { mods: { battleStartScrap: 4 } }),
  perk("dampers", "grey", "common", { mods: { hullMaxDelta: 2, chargeCapDelta: 1 } }),
  perk("routineCheck", "grey", "common", { mods: { battleEndHeal: 1 } }),
  perk("switchboard", "grey", "uncommon", {
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "sensors" }],
        do: [{ a: "modDieValue", n: 2 }],
      },
    ],
  }),
  perk("gimbalMount", "grey", "uncommon", { mods: { markBonusDelta: 2 } }),
  perk("logistics", "grey", "uncommon", {
    mods: { freeShopRerolls: 2, shopDiscountPct: 5 },
  }),
  perk("quickHands", "grey", "uncommon", { mods: { rerollSizeDelta: 2 } }),
  perk("balanceBeam", "grey", "uncommon", { traits: ["stabilizer"] }),
  // Reworked after the dead-perk sweep: it duplicated «Запас» exactly, so the
  // two split the same pick and neither read as a choice.
  perk("holdBack", "grey", "uncommon", {
    mods: { nudgeCostDelta: -1, chargeCapDelta: 2 },
  }),
  perk("payloadShuffle", "grey", "uncommon", {
    mods: { reserveDelta: 1, blueReserveDelta: 1 },
  }),
  perk("shortHaul", "grey", "uncommon", { mods: { xpMultPct: 15 } }),
  perk("dryDock", "grey", "rare", {
    synergy: { kind: "slot", slot: "repairBay" },
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "repairBay" }],
        do: [{ a: "heal", n: 3 }],
      },
    ],
  }),
  perk("masterKey", "grey", "rare", {
    synergy: { kind: "engraving", id: "edge" },
    mods: { extraRerolls: 2, rerollSizeDelta: 1 },
  }),
  perk("greyProtocol", "grey", "rare", {
    synergy: { kind: "school", school: "grey" },
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "resonanceAtLeast", school: "grey", n: 4 }],
        do: [{ a: "modDieValue", n: 2 }],
      },
    ],
  }),
];
