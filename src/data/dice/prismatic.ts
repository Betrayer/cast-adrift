import { die } from "@/data/dice/builder";
import type { DieItemDef } from "@/types/content";

export const PRISMATIC_DICE: readonly DieItemDef[] = [
  die("glimmer", 4, "prismatic", "common", {
    faces: [1, 1, 4, 4],
    tags: ["reroll", "swarm"],
    effects: [
      {
        on: "rolled",
        if: [{ c: "isMinFace" }, { c: "countTag", tag: "prismatic", n: 2 }],
        do: [{ a: "rerollDie" }],
      },
    ],
  }),
  die("prismChip", 4, "prismatic", "uncommon", {
    faces: [2, 3, 3, 4],
    tags: ["swarm", "scrap", "precision"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "isMaxFace" }],
        do: [{ a: "scrap", n: 2, perTag: "prismatic" }],
      },
    ],
  }),
  die("facet", 8, "prismatic", "uncommon", {
    faces: [4, 4, 5, 5, 6, 6],
    active: "swap",
    tags: ["dice", "precision"],
  }),
  die("prismCore", 6, "prismatic", "rare", {
    tags: ["dice", "precision"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "sensors" }],
        do: [{ a: "primeSchool", school: "red", n: 2 }],
      },
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "weapons" }],
        do: [{ a: "primeSchool", school: "blue", n: 2 }],
      },
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "shields" }],
        do: [{ a: "primeSchool", school: "green", n: 2 }],
      },
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "shieldsB" }],
        do: [{ a: "primeSchool", school: "green", n: 2 }],
      },
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "engines" }],
        do: [{ a: "primeSchool", school: "black", n: 2 }],
      },
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "reactor" }],
        do: [{ a: "primeSchool", school: "yellow", n: 2 }],
      },
    ],
  }),
  die("spectra", 8, "prismatic", "rare", {
    active: "bank",
    tags: ["charge", "scrap", "dice"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "isMaxFace" }],
        do: [
          { a: "charge", n: 2 },
          { a: "scrap", n: 4 },
        ],
      },
    ],
  }),
  die("gamut", 10, "prismatic", "rare", {
    tags: ["spike", "dice"],
    faces: [2, 4, 6, 8, 10, 10],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "countTag", tag: "spike", n: 2 }],
        do: [{ a: "modDieValue", n: 2 }],
      },
      {
        on: "afterResolveSlot",
        if: [{ c: "isMaxFace" }],
        do: [{ a: "charge", n: 1, perTag: "prismatic" }],
      },
    ],
  }),
  die("coreshard", 10, "prismatic", "legendary", {
    tags: ["dice", "spike", "overcap"],
    effects: [
      {
        on: "battleStart",
        do: [{ a: "allowExceedCap", school: "prismatic", hullCost: 1 }],
      },
      {
        on: "afterResolveSlot",
        if: [{ c: "isMaxFace" }],
        do: [
          { a: "primeSchool", school: "red", n: 2 },
          { a: "primeSchool", school: "blue", n: 2 },
          { a: "primeSchool", school: "green", n: 2 },
          { a: "primeSchool", school: "yellow", n: 2 },
          { a: "primeSchool", school: "black", n: 2 },
          { a: "primeSchool", school: "grey", n: 2 },
        ],
      },
    ],
  }),
  die("aurora", 12, "prismatic", "legendary", {
    tags: ["charge", "scrap", "survival"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "countTag", tag: "prismatic", n: 3 }],
        do: [{ a: "modDieValue", n: 2 }],
      },
      {
        on: "afterResolveSlot",
        if: [{ c: "valueGte", n: 10 }],
        do: [
          { a: "dmg", n: 2 },
          { a: "shield", n: 2 },
          { a: "charge", n: 1 },
          { a: "scrap", n: 3 },
          { a: "heal", n: 1 },
        ],
      },
    ],
  }),
];
