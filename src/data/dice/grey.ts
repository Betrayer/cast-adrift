import { die } from "@/data/dice/builder";
import type { DieItemDef } from "@/types/content";

export const GREY_DICE: readonly DieItemDef[] = [
  die("shim", 4, "grey", "common", {
    tags: ["precision"],
    faces: [2, 2, 3, 3],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "turnLte", n: 1 }],
        do: [{ a: "modDieValue", n: 1 }],
      },
    ],
  }),
  die("ballast", 4, "grey", "common", {
    tags: ["dice", "precision"],
    active: "bank",
  }),
  die("plumbline", 6, "grey", "common", {
    tags: ["precision"],
    faces: [2, 2, 4, 4, 6, 6],
  }),
  die("spool", 6, "grey", "common", {
    tags: ["reroll", "dice"],
    effects: [
      {
        on: "rolled",
        if: [{ c: "valueLt", n: 3 }],
        do: [{ a: "rerollDie" }],
      },
    ],
  }),
  die("copycat", 6, "grey", "uncommon", {
    tags: ["dice"],
    faces: [1, 2, 2, 3, 3, 4],
    active: "copy",
  }),
  die("mimic", 8, "grey", "uncommon", {
    tags: ["dice"],
    active: "swap",
    effects: [
      {
        on: "battleStart",
        if: [{ c: "countTag", tag: "dice", n: 3 }],
        do: [{ a: "grant", what: "nudge", n: 1 }],
      },
    ],
  }),
  die("pivot", 8, "grey", "uncommon", {
    tags: ["dice"],
    faces: [1, 2, 3, 6, 7, 8],
    active: "flip",
  }),
  die("chaff", 8, "grey", "uncommon", {
    tags: ["dice", "swarm"],
    faces: [1, 1, 2, 3, 5, 8],
    active: "split",
  }),
  die("beaconChip", 10, "grey", "rare", {
    tags: ["sensors", "precision", "dice"],
    effects: [
      {
        on: "battleStart",
        do: [{ a: "grant", what: "nudge", n: 1 }],
      },
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "sensors" }],
        do: [{ a: "modDieValue", n: 2 }],
      },
    ],
  }),
  die("lodestar", 12, "grey", "legendary", {
    tags: ["dice", "reroll", "precision"],
    active: "bank",
    effects: [
      {
        on: "battleStart",
        do: [
          { a: "grant", what: "nudge", n: 1 },
          { a: "grant", what: "rerollUses", n: 1 },
        ],
      },
      {
        on: "beforeResolveSlot",
        do: [{ a: "modDieValue", n: 1 }],
      },
    ],
  }),
  die("fate-d100", 100, "grey", "legendary"),
  // «Тихий свет» is the answer to The Hush: the fewer systems you still have, the
  // more this one is worth.
  die("hushlight", 8, "grey", "rare", {
    tags: ["survival", "precision", "dice"],
    effects: [
      {
        on: "rolled",
        if: [{ c: "isMinFace" }],
        do: [{ a: "setDieValue", n: 4 }],
      },
      {
        on: "afterResolveSlot",
        if: [{ c: "hullPctLt", n: 50 }],
        do: [
          { a: "heal", n: 2 },
          { a: "shield", n: 2 },
        ],
      },
    ],
  }),
];
