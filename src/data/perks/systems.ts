import { perk } from "@/data/perks/builder";
import type { PerkDef } from "@/data/perks/types";

export const SYSTEM_PERKS: readonly PerkDef[] = [
  perk("armorPlate", "systems", "common", { mods: { hullMaxDelta: 4 } }),
  perk("coolantLoop", "systems", "common", { mods: { chargeCapDelta: 1 } }),
  perk("finePitch", "systems", "common", { mods: { enginesThresholdDelta: 1 } }),
  perk("boresight", "systems", "common", { mods: { markBonusDelta: 1 } }),
  perk("bilgePump", "systems", "common", { mods: { battleEndHeal: 1 } }),
  perk("dockRates", "systems", "common", { mods: { shopDiscountPct: 7 } }),
  perk("crewDrill", "systems", "common", { mods: { xpMultPct: 12 } }),
  perk("scrapHopper", "systems", "common", { mods: { battleStartScrap: 3 } }),
  perk("spotterCall", "systems", "common", {
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "sensors" }, { c: "valueGte", n: 5 }],
        do: [{ a: "charge", n: 1 }],
      },
    ],
  }),
  perk("hullWeld", "systems", "common", {
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "repairBay" }],
        do: [{ a: "heal", n: 1 }],
      },
    ],
  }),
  perk("reinforcedBay", "systems", "uncommon", { mods: { moduleSlotDelta: 1 } }),
  perk("surgeTank", "systems", "uncommon", { mods: { chargeCapDelta: 3 } }),
  // Reworked after the dead-perk sweep: the engine-threshold drawback cost
  // dodges, which measured at −38% winrate — far past any hull bonus.
  perk("hardenedHull", "systems", "uncommon", {
    mods: { hullMaxDelta: 6, battleEndHeal: 1 },
  }),
  perk("kineticDampers", "systems", "uncommon", { traits: ["dodgeCharge"] }),
  perk("targetingSuite", "systems", "uncommon", {
    mods: { markBonusDelta: 2, jamPowerDelta: 1 },
  }),
  perk("pressureValve", "systems", "uncommon", { traits: ["overflowShield"] }),
  perk("resonanceTuner", "systems", "uncommon", { mods: { setCompleteCharge: 2 } }),
  perk("shockLance", "systems", "rare", {
    synergy: { kind: "slot", slot: "spinal" },
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "spinal" }],
        do: [{ a: "modDieValue", n: 5 }],
      },
    ],
  }),
  perk("piercingRounds", "systems", "rare", {
    synergy: { kind: "module", id: "piercer" },
    traits: ["firstHitPierce"],
    mods: { markBonusDelta: 1 },
  }),
];
