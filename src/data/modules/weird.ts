import type { ModuleDef } from "@/data/modules/types";

export const WEIRD_MODULES: readonly ModuleDef[] = [
  {
    id: "jamBreaker",
    name: "content:modules.jamBreaker.name",
    desc: "content:modules.jamBreaker.desc",
    rarity: "common",
    price: 45,
    tag: "weird",
    mods: { jamPowerDelta: 2 },
  },
  {
    id: "entropySink",
    name: "content:modules.entropySink.name",
    desc: "content:modules.entropySink.desc",
    rarity: "uncommon",
    price: 60,
    tag: "weird",
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "isMinFace" }],
        do: [{ a: "charge", n: 2 }],
      },
    ],
  },
  {
    id: "paradoxLoop",
    name: "content:modules.paradoxLoop.name",
    desc: "content:modules.paradoxLoop.desc",
    rarity: "rare",
    price: 90,
    tag: "weird",
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "isMaxFace" }],
        do: [{ a: "repeatSlot" }],
      },
    ],
  },
  {
    id: "blackLedger",
    name: "content:modules.blackLedger.name",
    desc: "content:modules.blackLedger.desc",
    rarity: "uncommon",
    price: 65,
    tag: "weird",
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "school", is: "black" }],
        do: [{ a: "modDieValue", n: 3 }],
      },
    ],
  },
  {
    id: "prismLens",
    name: "content:modules.prismLens.name",
    desc: "content:modules.prismLens.desc",
    rarity: "rare",
    price: 85,
    tag: "weird",
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "turnLte", n: 1 }],
        do: [{ a: "modDieValue", n: 1 }],
      },
    ],
  },
  {
    id: "hushAntenna",
    name: "content:modules.hushAntenna.name",
    desc: "content:modules.hushAntenna.desc",
    rarity: "common",
    price: 50,
    tag: "weird",
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "sensors" }],
        do: [{ a: "modDieValue", n: 2 }],
      },
    ],
  },
  {
    id: "coldLogicCore",
    name: "content:modules.coldLogicCore.name",
    desc: "content:modules.coldLogicCore.desc",
    rarity: "rare",
    price: 80,
    tag: "weird",
    traits: ["coldLogic"],
    mods: { nudgeCostDelta: -3 },
  },
  {
    id: "gamblersChip",
    name: "content:modules.gamblersChip.name",
    desc: "content:modules.gamblersChip.desc",
    rarity: "common",
    price: 45,
    tag: "weird",
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "isMaxFace" }],
        do: [
          { a: "charge", n: 1 },
          { a: "scrap", n: 1 },
        ],
      },
    ],
  },
];
