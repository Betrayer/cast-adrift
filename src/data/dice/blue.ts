import { die } from "@/data/dice/builder";
import type { DieItemDef } from "@/types/content";

export const BLUE_DICE: readonly DieItemDef[] = [
  die("hoarfrost", 4, "blue", "common", {
    tags: ["shields", "shieldwall"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "shields" }],
        do: [{ a: "shield", n: 1 }],
      },
    ],
  }),
  die("frostplate", 6, "blue", "common", {
    tags: ["shields", "shieldwall"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [
          { c: "slot", is: "shields" },
          { c: "countTag", tag: "shieldwall", n: 4 },
        ],
        do: [{ a: "shield", n: 2 }],
      },
    ],
  }),
  die("stillwater", 6, "blue", "common", {
    tags: ["sensors", "control", "precision"],
    faces: [3, 3, 4, 4, 5, 5],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "sensors" }],
        do: [{ a: "addStatus", s: "jam", n: 1, target: "target" }],
      },
    ],
  }),
  die("gyro", 6, "blue", "uncommon", {
    tags: ["dice", "control"],
    faces: [2, 3, 3, 4, 4, 5],
    active: "flip",
  }),
  die("bulwark", 8, "blue", "uncommon", {
    tags: ["shields", "shieldwall"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "shields" }],
        do: [{ a: "modDieValue", n: 1 }],
      },
    ],
  }),
  die("floodgate", 8, "blue", "uncommon", {
    tags: ["dice", "shieldwall"],
    faces: [3, 4, 5, 6, 7, 8],
    active: "bank",
  }),
  die("aegis", 10, "blue", "rare", {
    tags: ["shields", "shieldwall", "survival"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "shields" }],
        do: [{ a: "modDieValue", n: 2 }],
      },
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "shields" }],
        do: [
          { a: "schedule", on: "nextTurn", do: [{ a: "shield", n: 3 }] },
        ],
      },
    ],
  }),
  die("undertow", 10, "blue", "rare", {
    tags: ["dice", "control", "precision"],
    active: "swap",
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "valueLt", n: 5 }],
        do: [{ a: "setDieValue", n: 5 }],
      },
    ],
  }),
  die("deepblue", 12, "blue", "rare", {
    tags: ["shieldwall", "survival"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "isMinFace" }],
        do: [{ a: "shield", n: 4 }],
      },
    ],
  }),
  die("glacierspike", 20, "blue", "legendary", {
    tags: ["spinal", "shieldwall", "control"],
    faces: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
    effects: [
      {
        on: "afterResolveSlot",
        do: [{ a: "shield", n: 3 }],
      },
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "spinal" }],
        do: [{ a: "addStatus", s: "jam", n: 1, target: "target" }],
      },
    ],
  }),
];
