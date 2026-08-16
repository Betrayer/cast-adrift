import { die } from "@/data/dice/builder";
import type { DieItemDef } from "@/types/content";

export const RED_DICE: readonly DieItemDef[] = [
  die("cinder", 4, "red", "common", {
    tags: ["burn", "weapons"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "isMaxFace" }],
        do: [{ a: "addStatus", s: "burn", n: 1, target: "target" }],
      },
    ],
  }),
  die("flare", 4, "red", "common", {
    faces: [1, 2, 4, 4],
    tags: ["spike", "weapons"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "valueGte", n: 3 }],
        do: [{ a: "modDieValue", n: 1 }],
      },
    ],
  }),
  die("ember", 6, "red", "common", {
    tags: ["weapons"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "countTag", tag: "red", n: 4 }],
        do: [{ a: "modDieValue", n: 2 }],
      },
    ],
  }),
  die("salvo", 6, "red", "uncommon", {
    tags: ["swarm", "weapons"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "weapons" }],
        do: [{ a: "dmg", n: 1, perTag: "swarm" }],
      },
    ],
  }),
  die("slug", 8, "red", "uncommon", {
    tags: ["weapons"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "weapons" }],
        do: [{ a: "modDieValue", n: 1 }],
      },
    ],
  }),
  die("crucible", 8, "red", "uncommon", {
    active: "bank",
    tags: ["dice", "spike"],
  }),
  die("magma", 10, "red", "rare", {
    tags: ["burn", "weapons"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "isMaxFace" }],
        do: [{ a: "addStatus", s: "burn", n: 3, target: "target" }],
      },
    ],
  }),
  die("bombard", 12, "red", "rare", {
    faces: [1, 2, 3, 4, 12, 12],
    tags: ["spike", "weapons"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "isMaxFace" }],
        do: [{ a: "dmg", n: 5 }],
      },
    ],
  }),
  die("thermite", 12, "red", "rare", {
    active: "split",
    tags: ["risk", "weapons", "dice"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "hullPctLt", n: 50 }],
        do: [{ a: "modDieValue", n: 2 }],
      },
    ],
  }),
  die("lancehead", 20, "red", "legendary", {
    tags: ["spinal", "spike", "crit"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "spinal" }],
        do: [{ a: "modDieValue", n: 3 }],
      },
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "spinal" }, { c: "valueGte", n: 15 }],
        do: [{ a: "crit" }],
      },
    ],
  }),
];
