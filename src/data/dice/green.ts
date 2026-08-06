import { die } from "@/data/dice/builder";
import type { DieItemDef } from "@/types/content";

export const GREEN_DICE: readonly DieItemDef[] = [
  die("coil", 4, "green", "common", {
    tags: ["swarm", "precision"],
    faces: [2, 2, 3, 3],
    effects: [
      {
        on: "rolled",
        if: [{ c: "equalsLast" }],
        do: [{ a: "modDieValue", n: 1 }],
      },
      {
        on: "beforeResolveSlot",
        if: [{ c: "countTag", tag: "swarm", n: 3 }],
        do: [{ a: "modDieValue", n: 2 }],
      },
    ],
  }),
  die("tendon", 6, "green", "common", {
    tags: ["precision"],
    effects: [
      {
        on: "rolled",
        if: [{ c: "equalsLast" }],
        do: [
          { a: "modDieValue", n: 2 },
          { a: "primeSchool", school: "green", n: 1 },
        ],
      },
    ],
  }),
  die("sprout", 6, "green", "uncommon", {
    tags: ["growth", "engines"],
    growth: { perMax: 1, cap: 2 },
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "engines" }],
        do: [{ a: "grow", n: 1, cap: 4 }],
      },
    ],
  }),
  die("bramble", 8, "green", "uncommon", {
    tags: ["growth", "weapons"],
    growth: { perMax: 2, cap: 2 },
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "weapons" }],
        do: [{ a: "grow", n: 2, cap: 4 }],
      },
    ],
  }),
  die("taproot", 8, "green", "uncommon", {
    tags: ["growth", "survival"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "counterAtLeast", scope: "battle", key: "taprootDepth", n: 2 }],
        do: [{ a: "modDieValue", n: 1 }],
      },
      {
        on: "beforeResolveSlot",
        if: [{ c: "counterAtLeast", scope: "battle", key: "taprootDepth", n: 4 }],
        do: [{ a: "modDieValue", n: 2 }],
      },
      {
        on: "afterResolveSlot",
        do: [{ a: "counter", scope: "battle", key: "taprootDepth", delta: 1 }],
      },
    ],
  }),
  die("heartwood", 10, "green", "rare", {
    tags: ["engines", "dice"],
    active: "bank",
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "engines" }],
        do: [{ a: "modDieValue", n: 2 }],
      },
    ],
  }),
  die("seedpod", 10, "green", "rare", {
    tags: ["swarm", "dice"],
    active: "split",
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "isMaxFace" }],
        do: [{ a: "addTempDie", defId: "green-d4", turns: 2 }],
      },
    ],
  }),
  die("evergreen", 12, "green", "rare", {
    tags: ["growth", "precision"],
    faces: [2, 4, 6, 8, 10, 12],
    growth: { perMax: 2, cap: 4 },
  }),
  die("worldseed", 12, "green", "legendary", {
    tags: ["growth", "spike"],
    growth: { perMax: 1, cap: 4 },
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "isMaxFace" }],
        do: [{ a: "repeatSlot" }],
      },
    ],
  }),
];
