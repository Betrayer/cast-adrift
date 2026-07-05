import type { EffectDef } from "@/game/effects/types";
import type { ResonanceThreshold } from "@/types/battle";
import type { LocKey, School } from "@/types/content";

export interface ResonanceBonus {
  school: School;
  threshold: ResonanceThreshold;
  desc: LocKey;
  effects?: readonly EffectDef[];
}

export const RESONANCE_BONUSES: readonly ResonanceBonus[] = [
  {
    school: "red",
    threshold: 2,
    desc: "content:resonance.red-2",
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "school", is: "red" }],
        do: [{ a: "modDieValue", n: 1 }],
      },
    ],
  },
  {
    school: "red",
    threshold: 4,
    desc: "content:resonance.red-4",
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "isMaxFace" }],
        do: [{ a: "addStatus", s: "burn", n: 2, target: "target" }],
      },
    ],
  },
  {
    school: "red",
    threshold: 6,
    desc: "content:resonance.red-6",
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "weaponA" }],
        do: [{ a: "repeatSlot" }],
      },
    ],
  },
  { school: "blue", threshold: 2, desc: "content:resonance.blue-2" },
  { school: "blue", threshold: 4, desc: "content:resonance.blue-4" },
  { school: "blue", threshold: 6, desc: "content:resonance.blue-6" },
  {
    school: "green",
    threshold: 2,
    desc: "content:resonance.green-2",
    effects: [
      {
        on: "rolled",
        if: [{ c: "school", is: "green" }, { c: "equalsLast" }],
        do: [{ a: "modDieValue", n: 2 }],
      },
    ],
  },
  { school: "green", threshold: 4, desc: "content:resonance.green-4" },
  { school: "green", threshold: 6, desc: "content:resonance.green-6" },
  {
    school: "yellow",
    threshold: 2,
    desc: "content:resonance.yellow-2",
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "isMaxFace" }],
        do: [{ a: "scrap", n: 4 }],
      },
    ],
  },
  { school: "yellow", threshold: 4, desc: "content:resonance.yellow-4" },
  { school: "yellow", threshold: 6, desc: "content:resonance.yellow-6" },
  { school: "black", threshold: 2, desc: "content:resonance.black-2" },
  {
    school: "black",
    threshold: 4,
    desc: "content:resonance.black-4",
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "school", is: "black" }, { c: "isMinFace" }],
        do: [{ a: "primeSchool", school: "black", max: true }],
      },
    ],
  },
  { school: "black", threshold: 6, desc: "content:resonance.black-6" },
  { school: "grey", threshold: 2, desc: "content:resonance.grey-2" },
  { school: "grey", threshold: 4, desc: "content:resonance.grey-4" },
  { school: "grey", threshold: 6, desc: "content:resonance.grey-6" },
  { school: "prismatic", threshold: 2, desc: "content:resonance.prismatic-2" },
];
