import { DIE_PTS } from "@/data/tiers";
import type { DieItemDef, DieTier, Rarity, School } from "@/types/content";

const die = (
  id: string,
  tier: DieTier,
  school: School,
  rarity: Rarity,
  extra: Omit<
    DieItemDef,
    "id" | "name" | "desc" | "tier" | "school" | "rarity" | "pts"
  > = {},
): DieItemDef => ({
  id,
  name: `content:dice.${id}`,
  desc: `content:diceDesc.${id}`,
  tier,
  school,
  rarity,
  pts: DIE_PTS[tier],
  ...extra,
});

// Phase-10 fill to the DESIGN §14 target of 70. School totals land at
// red 11 / blue 11 / green 10 / yellow 10 / black 11 / grey 12 (Fate included) /
// prismatic 5 once the Phase-4 items and fusion results are counted.
export const PHASE10_DICE: readonly DieItemDef[] = [
  // ── red ───────────────────────────────────────────────────────────────────
  die("flare", 4, "red", "common", {
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "valueGte", n: 3 }],
        do: [{ a: "modDieValue", n: 1 }],
      },
    ],
  }),
  die("magma", 10, "red", "rare", {
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "isMaxFace" }],
        do: [{ a: "addStatus", s: "burn", n: 3, target: "target" }],
      },
    ],
  }),
  die("thermite", 12, "red", "rare", {
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "hullPctLt", n: 50 }],
        do: [{ a: "modDieValue", n: 2 }],
      },
    ],
  }),
  die("lancehead", 20, "red", "legendary", {
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "spinal" }],
        do: [{ a: "modDieValue", n: 3 }],
      },
    ],
  }),

  // ── blue ──────────────────────────────────────────────────────────────────
  die("hoarfrost", 4, "blue", "common", {
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "shields" }],
        do: [{ a: "shield", n: 1 }],
      },
    ],
  }),
  die("aegis", 10, "blue", "rare", {
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "shields" }],
        do: [{ a: "modDieValue", n: 2 }],
      },
    ],
  }),
  die("deepblue", 12, "blue", "rare", {
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "isMinFace" }],
        do: [{ a: "shield", n: 4 }],
      },
    ],
  }),
  die("glacierspike", 20, "blue", "legendary", {
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "shields" }],
        do: [{ a: "modDieValue", n: 3 }],
      },
    ],
  }),

  // ── green ─────────────────────────────────────────────────────────────────
  die("tendon", 6, "green", "common", {
    effects: [
      { on: "rolled", if: [{ c: "equalsLast" }], do: [{ a: "modDieValue", n: 2 }] },
    ],
  }),
  die("bramble", 8, "green", "uncommon", { growth: { perMax: 1, cap: 2 } }),
  die("heartwood", 10, "green", "rare", {
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "engines" }],
        do: [{ a: "modDieValue", n: 2 }],
      },
    ],
  }),
  die("worldseed", 12, "green", "legendary", { growth: { perMax: 1, cap: 4 } }),

  // ── yellow ────────────────────────────────────────────────────────────────
  die("token", 4, "yellow", "common", {
    effects: [
      { on: "afterResolveSlot", if: [{ c: "isMaxFace" }], do: [{ a: "scrap", n: 3 }] },
    ],
  }),
  die("glint", 6, "yellow", "common", {
    effects: [
      { on: "afterResolveSlot", if: [{ c: "isMinFace" }], do: [{ a: "scrap", n: 2 }] },
    ],
  }),
  die("bonanza", 8, "yellow", "uncommon", {
    effects: [
      { on: "afterResolveSlot", if: [{ c: "isMaxFace" }], do: [{ a: "scrap", n: 6 }] },
    ],
  }),
  die("jackpot", 10, "yellow", "rare", {
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "isMaxFace" }],
        do: [
          { a: "scrap", n: 10 },
          { a: "charge", n: 1 },
        ],
      },
    ],
  }),
  die("midas", 12, "yellow", "legendary", {
    effects: [{ on: "afterResolveSlot", do: [{ a: "scrap", n: 2 }] }],
  }),

  // ── black ─────────────────────────────────────────────────────────────────
  die("cinderblack", 4, "black", "common", {
    effects: [
      { on: "afterResolveSlot", if: [{ c: "isMinFace" }], do: [{ a: "charge", n: 1 }] },
    ],
  }),
  die("pitch", 6, "black", "common", {
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "reactor" }],
        do: [{ a: "modDieValue", n: 1 }],
      },
    ],
  }),
  die("tar", 6, "black", "uncommon", {
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "hullPctLt", n: 40 }],
        do: [{ a: "modDieValue", n: 2 }],
      },
    ],
  }),
  die("nadir", 8, "black", "uncommon", {
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "isMinFace" }],
        do: [{ a: "primeSchool", school: "black", n: 3 }],
      },
    ],
  }),
  die("eclipse", 10, "black", "rare", {
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "reactor" }],
        do: [{ a: "modDieValue", n: 3 }],
      },
    ],
  }),
  die("abyss", 12, "black", "rare", { faces: [1, 12] }),
  die("voidmaw", 20, "black", "legendary", {
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "reactor" }],
        do: [{ a: "modDieValue", n: 2 }],
      },
    ],
  }),

  // ── grey ──────────────────────────────────────────────────────────────────
  die("shim", 4, "grey", "common", {
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "turnLte", n: 1 }],
        do: [{ a: "modDieValue", n: 1 }],
      },
    ],
  }),
  die("spool", 6, "grey", "common", {
    effects: [
      { on: "rolled", if: [{ c: "valueLt", n: 2 }], do: [{ a: "modDieValue", n: 1 }] },
    ],
  }),
  die("mimic", 8, "grey", "uncommon", { active: "copy" }),
  die("pivot", 8, "grey", "uncommon", { active: "flip" }),
  die("beaconChip", 10, "grey", "rare", {
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "sensors" }],
        do: [{ a: "modDieValue", n: 2 }],
      },
    ],
  }),
  die("lodestar", 12, "grey", "legendary", {
    effects: [{ on: "beforeResolveSlot", do: [{ a: "modDieValue", n: 1 }] }],
  }),

  // ── prismatic ─────────────────────────────────────────────────────────────
  die("prismChip", 4, "prismatic", "uncommon"),
  die("prismCore", 6, "prismatic", "rare", {
    effects: [{ on: "beforeResolveSlot", do: [{ a: "modDieValue", n: 1 }] }],
  }),
  die("spectra", 8, "prismatic", "rare", {
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
  }),
  die("aurora", 12, "prismatic", "legendary", {
    effects: [{ on: "beforeResolveSlot", do: [{ a: "modDieValue", n: 2 }] }],
  }),

  // ── the Fate die ──────────────────────────────────────────────────────────
  // Never slotted (DESIGN §7); its whole behaviour is the once-per-battle table
  // in `src/data/fate.ts`. Grey school keeps it off the prismatic points surcharge.
  die("fate-d100", 100, "grey", "legendary"),
];
