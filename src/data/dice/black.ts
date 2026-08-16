import { die } from "@/data/dice/builder";
import type { DieItemDef } from "@/types/content";

export const BLACK_DICE: readonly DieItemDef[] = [
  die("cinderblack", 4, "black", "common", {
    tags: ["charge", "risk"],
    faces: [1, 1, 4, 4],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "isMinFace" }],
        do: [{ a: "charge", n: 1 }],
      },
    ],
  }),
  die("slag", 4, "black", "common", {
    tags: ["reactor", "charge"],
    faces: [1, 1, 1, 4],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "reactor" }],
        do: [{ a: "setDieValue", n: 4 }],
      },
    ],
  }),
  die("pitch", 6, "black", "common", {
    tags: ["reactor"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "reactor" }],
        do: [{ a: "modDieValue", n: 1 }],
      },
    ],
  }),
  die("ashen", 6, "black", "uncommon", {
    tags: ["dice", "risk"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "isMinFace" }],
        do: [{ a: "primeSchool", school: "black", n: 2 }],
      },
    ],
  }),
  die("tar", 6, "black", "uncommon", {
    tags: ["risk", "survival"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "hullPctLt", n: 50 }],
        do: [{ a: "modDieValue", n: 1 }],
      },
      {
        on: "beforeResolveSlot",
        if: [{ c: "hullPctLt", n: 25 }],
        do: [{ a: "modDieValue", n: 3 }],
      },
    ],
  }),
  die("nadir", 8, "black", "uncommon", {
    tags: ["dice", "charge"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "isMinFace" }],
        do: [{ a: "primeSchool", school: "black", n: 3 }],
      },
    ],
  }),
  die("obsidian", 8, "black", "rare", {
    tags: ["risk", "spike"],
    faces: [1, 8],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "isMinFace" }],
        do: [
          { a: "setDieValue", n: 8 },
          { a: "hull", n: -2 },
        ],
      },
    ],
  }),
  die("fissure", 10, "black", "uncommon", {
    tags: ["dice", "swarm"],
    faces: [1, 2, 3, 8, 9, 10],
    active: "split",
  }),
  die("eclipse", 10, "black", "rare", {
    tags: ["overcap", "reactor", "dice"],
    active: "bank",
    effects: [
      {
        on: "battleStart",
        do: [{ a: "allowExceedCap", slot: "reactor", hullCost: 1 }],
      },
    ],
  }),
  die("anthracite", 12, "black", "uncommon", {
    tags: ["risk", "spike", "dice"],
    faces: [1, 1, 2, 11, 12, 12],
    active: "swap",
  }),
  die("abyss", 12, "black", "rare", {
    tags: ["risk", "spike"],
    faces: [1, 12],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "isMinFace" }],
        do: [{ a: "counter", scope: "battle", key: "abyssDebt", delta: 1 }],
      },
      {
        on: "beforeResolveSlot",
        if: [
          { c: "isMaxFace" },
          { c: "counterAtLeast", scope: "battle", key: "abyssDebt", n: 1 },
        ],
        do: [{ a: "modDieValue", n: 6 }],
      },
    ],
  }),
  die("voidmaw", 20, "black", "legendary", {
    tags: ["reactor", "spike"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "reactor" }],
        do: [{ a: "modDieValue", n: 2 }],
      },
    ],
  }),
  die("retrograde", 10, "black", "rare", {
    tags: ["reactor", "charge", "overcap"],
    active: "bank",
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "inverted" }],
        do: [{ a: "modDieValue", n: 3 }],
      },
      {
        on: "afterResolveSlot",
        if: [{ c: "inverted" }, { c: "slot", is: "reactor" }],
        do: [{ a: "charge", n: 2 }],
      },
    ],
  }),
];
