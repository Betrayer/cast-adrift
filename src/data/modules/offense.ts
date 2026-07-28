import type { ModuleDef } from "@/data/modules/types";

export const OFFENSE_MODULES: readonly ModuleDef[] = [
  {
    id: "siegeMount",
    name: "content:modules.siegeMount.name",
    desc: "content:modules.siegeMount.desc",
    rarity: "common",
    price: 55,
    tag: "offense",
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "isMaxFace" }],
        do: [{ a: "modDieValue", n: 2 }],
      },
    ],
  },
  {
    id: "piercer",
    name: "content:modules.piercer.name",
    desc: "content:modules.piercer.desc",
    rarity: "uncommon",
    price: 70,
    tag: "offense",
    traits: ["firstHitPierce"],
  },
  {
    id: "emberInjector",
    name: "content:modules.emberInjector.name",
    desc: "content:modules.emberInjector.desc",
    rarity: "common",
    price: 50,
    tag: "offense",
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "isMaxFace" }],
        do: [{ a: "addStatus", s: "burn", n: 2, target: "target" }],
      },
    ],
  },
  {
    id: "railCradle",
    name: "content:modules.railCradle.name",
    desc: "content:modules.railCradle.desc",
    rarity: "uncommon",
    price: 60,
    tag: "offense",
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "spinal" }],
        do: [{ a: "modDieValue", n: 3 }],
      },
    ],
  },
  {
    id: "targetingMesh",
    name: "content:modules.targetingMesh.name",
    desc: "content:modules.targetingMesh.desc",
    rarity: "common",
    price: 50,
    tag: "offense",
    mods: { markBonusDelta: 2 },
  },
  {
    id: "overpressure",
    name: "content:modules.overpressure.name",
    desc: "content:modules.overpressure.desc",
    rarity: "uncommon",
    price: 65,
    tag: "offense",
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "turnLte", n: 1 }],
        do: [{ a: "modDieValue", n: 3 }],
      },
    ],
  },
  {
    id: "ricochetHousing",
    name: "content:modules.ricochetHousing.name",
    desc: "content:modules.ricochetHousing.desc",
    rarity: "rare",
    price: 85,
    tag: "offense",
    traits: ["ricochet"],
  },
  {
    id: "splinterHead",
    name: "content:modules.splinterHead.name",
    desc: "content:modules.splinterHead.desc",
    rarity: "common",
    price: 45,
    tag: "offense",
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "isMinFace" }],
        do: [{ a: "modDieValue", n: 3 }],
      },
    ],
  },
  {
    id: "lanceCapacitor",
    name: "content:modules.lanceCapacitor.name",
    desc: "content:modules.lanceCapacitor.desc",
    rarity: "uncommon",
    price: 60,
    tag: "offense",
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "valueGte", n: 7 }],
        do: [{ a: "modDieValue", n: 2 }],
      },
    ],
  },
  {
    id: "executioner",
    name: "content:modules.executioner.name",
    desc: "content:modules.executioner.desc",
    rarity: "rare",
    price: 80,
    tag: "offense",
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "hullPctLt", n: 30 }],
        do: [{ a: "modDieValue", n: 3 }],
      },
    ],
  },
];
