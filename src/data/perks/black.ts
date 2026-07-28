import { perk } from "@/data/perks/builder";
import type { PerkDef } from "@/data/perks/types";

export const BLACK_PERKS: readonly PerkDef[] = [
  perk("darkCurrent", "black", "common", {
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "reactor" }],
        do: [{ a: "modDieValue", n: 1 }],
      },
    ],
  }),
  perk("lowTide", "black", "common", {
    effects: [
      { on: "afterResolveSlot", if: [{ c: "isMinFace" }], do: [{ a: "charge", n: 2 }] },
    ],
  }),
  perk("brinkmanship", "black", "common", {
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "hullPctLt", n: 40 }],
        do: [{ a: "modDieValue", n: 1 }],
      },
    ],
  }),
  perk("blackTithe", "black", "common", {
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "school", is: "black" }],
        do: [{ a: "scrap", n: 2 }],
      },
    ],
  }),
  perk("coldFusion", "black", "common", { mods: { chargeCapDelta: 2 } }),
  perk("longOdds", "black", "common", {
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "school", is: "black" }, { c: "isMinFace" }],
        do: [{ a: "modDieValue", n: 3 }],
      },
    ],
  }),
  // Reworked after the dead-perk sweep: losing end-of-battle healing compounded
  // across a sector far faster than 15% scrap paid it back.
  perk("hardBargain", "black", "common", {
    mods: { scrapMultPct: 15, hullMaxDelta: -1 },
  }),
  perk("nightShift", "black", "common", {
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "reactor" }, { c: "isMaxFace" }],
        do: [{ a: "charge", n: 2 }],
      },
    ],
  }),
  perk("eventHorizon", "black", "uncommon", {
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "reactor" }, { c: "school", is: "black" }],
        do: [{ a: "modDieValue", n: 3 }],
      },
    ],
  }),
  perk("bloodPrice", "black", "uncommon", {
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "hullPctLt", n: 25 }],
        do: [{ a: "modDieValue", n: 4 }],
      },
    ],
  }),
  perk("heatShroud", "black", "uncommon", { traits: ["overflowShield"] }),
  perk("scrapheap", "black", "uncommon", { traits: ["recycler"] }),
  perk("deadReckoning", "black", "uncommon", {
    mods: { chargeCapDelta: 3, hullMaxDelta: -3 },
  }),
  perk("obsidianCreed", "black", "rare", {
    synergy: { kind: "school", school: "black" },
    traits: ["obsidianPact"],
    mods: { chargeCapDelta: 2 },
  }),
  perk("lastBreath", "black", "rare", {
    synergy: { kind: "module", id: "escapePod" },
    traits: ["escapePod"],
  }),
  perk("singularity", "black", "rare", {
    synergy: { kind: "slot", slot: "reactor" },
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "reactor" }],
        do: [{ a: "charge", n: 3 }],
      },
    ],
  }),
];
