import { die } from "@/data/dice/builder";
import type { DieItemDef } from "@/types/content";

export const YELLOW_DICE: readonly DieItemDef[] = [
  die("lucky-chip", 4, "yellow", "common", {
    tags: ["scrap"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "isMaxFace" }],
        do: [{ a: "scrap", n: 2 }],
      },
    ],
  }),
  die("token", 4, "yellow", "common", {
    tags: ["scrap"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "isMaxFace" }],
        do: [
          { a: "scrap", n: 3 },
          { a: "counter", scope: "battle", key: "payout", delta: 1 },
        ],
      },
    ],
  }),
  die("glint", 6, "yellow", "common", {
    tags: ["scrap"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "any", of: [{ c: "isMinFace" }, { c: "isMaxFace" }] }],
        do: [
          { a: "scrap", n: 2 },
          { a: "counter", scope: "battle", key: "payout", delta: 1 },
        ],
      },
    ],
  }),
  die("smallChange", 6, "yellow", "common", {
    tags: ["dice", "swarm"],
    faces: [2, 2, 3, 3, 4, 4],
    active: "split",
  }),
  die("wager", 6, "yellow", "uncommon", {
    tags: ["dice", "risk"],
    faces: [1, 1, 1, 6, 6, 6],
    active: "swap",
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "isMinFace" }],
        do: [
          { a: "setDieValue", n: 6 },
          { a: "hull", n: -2 },
        ],
      },
    ],
  }),
  die("hedge", 8, "yellow", "uncommon", {
    tags: ["dice", "precision"],
    faces: [1, 3, 5, 7],
    active: "bank",
  }),
  die("bonanza", 8, "yellow", "uncommon", {
    tags: ["scrap", "precision"],
    faces: [2, 2, 4, 6, 8, 8],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "isMaxFace" }],
        do: [{ a: "counter", scope: "battle", key: "payout", delta: 1 }],
      },
      {
        on: "afterResolveSlot",
        if: [{ c: "counterAtLeast", scope: "battle", key: "payout", n: 3 }],
        do: [
          { a: "scrap", n: 4 },
          { a: "charge", n: 1 },
        ],
      },
    ],
  }),
  die("vulture", 8, "yellow", "rare", {
    tags: ["scrap", "crit"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [
          { c: "slot", is: "weapons" },
          { c: "counterAtLeast", scope: "battle", key: "payout", n: 2 },
        ],
        do: [{ a: "crit" }],
      },
      {
        on: "afterResolveSlot",
        if: [{ c: "isMaxFace" }],
        do: [
          { a: "scrap", n: 8 },
          { a: "counter", scope: "battle", key: "payout", delta: 1 },
        ],
      },
    ],
  }),
  die("jackpot", 10, "yellow", "rare", {
    tags: ["scrap", "spike"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "isMaxFace" }],
        do: [
          { a: "scrap", n: 6 },
          { a: "charge", n: 1 },
          { a: "counter", scope: "battle", key: "payout", delta: 1 },
        ],
      },
      {
        on: "afterResolveSlot",
        if: [
          { c: "isMaxFace" },
          { c: "counterAtLeast", scope: "battle", key: "payout", n: 4 },
        ],
        do: [{ a: "scrap", n: 12 }],
      },
    ],
  }),
  die("midas", 12, "yellow", "legendary", {
    tags: ["scrap"],
    effects: [
      { on: "turnEnd", do: [{ a: "scrap", n: 1, perTag: "scrap" }] },
      {
        on: "afterResolveSlot",
        if: [{ c: "isMaxFace" }],
        do: [{ a: "counter", scope: "battle", key: "payout", delta: 2 }],
      },
      {
        on: "beforeResolveSlot",
        if: [{ c: "counterAtLeast", scope: "battle", key: "payout", n: 3 }],
        do: [{ a: "modDieValue", n: 3 }],
      },
    ],
  }),
];
