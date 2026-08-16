import { perk } from "@/data/perks/builder";
import type { PerkDef } from "@/data/perks/types";

export const GREEN_PERKS: readonly PerkDef[] = [
  perk("rootHold", "green", "common", {
    tags: ["engines"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [
          { c: "slot", is: "engines" },
          { c: "not", of: { c: "turnLte", n: 2 } },
        ],
        do: [{ a: "modDieValue", n: 2 }],
      },
    ],
  }),
  perk("secondGrowth", "green", "common", {
    tags: ["growth"],
    effects: [
      { on: "rolled", if: [{ c: "equalsLast" }], do: [{ a: "modDieValue", n: 2 }] },
    ],
  }),
  perk("echo", "green", "common", {
    tags: ["growth", "charge"],
    effects: [
      { on: "rolled", if: [{ c: "equalsLast" }], do: [{ a: "charge", n: 1 }] },
    ],
  }),
  perk("sapline", "green", "common", {
    tags: ["growth", "survival"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "equalsLast" }],
        do: [{ a: "heal", n: 2 }],
      },
    ],
  }),
  perk("pollen", "green", "common", {
    tags: ["survival"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "school", is: "green" }, { c: "isMaxFace" }],
        do: [{ a: "heal", n: 1 }],
      },
    ],
  }),
  perk("greenwake", "green", "common", {
    tags: ["engines", "shieldwall"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "engines" }, { c: "valueGte", n: 5 }],
        do: [{ a: "shield", n: 2 }],
      },
    ],
  }),
  perk("compost", "green", "common", {
    tags: ["scrap"],
    traits: ["compost"],
  }),
  perk("regen", "green", "common", {
    tags: ["survival"],
    mods: { battleEndHeal: 2 },
  }),
  perk("overgrowth", "green", "common", {
    tags: ["growth"],
    mods: { growthCapDelta: 1 },
  }),
  perk("takeRoot", "green", "common", {
    tags: ["dice", "precision"],
    effects: [
      {
        on: "place",
        if: [{ c: "valueLt", n: 3 }],
        do: [{ a: "setDieValue", n: 3 }],
      },
    ],
  }),
  perk("seedBank", "green", "common", {
    tags: ["growth", "shieldwall"],
    effects: [
      {
        on: "battleStart",
        do: [
          {
            a: "schedule",
            on: "forTurns",
            turns: 3,
            do: [{ a: "shield", n: 1, perTag: "growth" }],
          },
        ],
      },
    ],
  }),
  perk("longRoots", "green", "common", {
    tags: ["growth"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "isMaxFace" }],
        do: [{ a: "grow", n: 1, cap: 2 }],
      },
    ],
  }),
  perk("understory", "green", "common", {
    tags: ["survival", "shieldwall"],
    effects: [
      {
        on: "turnEnd",
        if: [{ c: "shieldAtLeast", n: 4 }],
        do: [{ a: "heal", n: 1 }],
      },
    ],
  }),
  perk("bloomCycle", "green", "uncommon", {
    tags: ["growth"],
    effects: [
      {
        on: "rolled",
        if: [{ c: "school", is: "green" }, { c: "equalsLast" }],
        do: [{ a: "modDieValue", n: 3 }],
      },
    ],
  }),
  perk("photosynth", "green", "uncommon", {
    tags: ["charge"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "school", is: "green" }],
        do: [{ a: "charge", n: 1 }],
      },
    ],
  }),
  perk("thicket", "green", "uncommon", {
    tags: ["survival"],
    mods: { hullMaxDelta: 8, scrapMultPct: -15 },
  }),
  perk("evergreen", "green", "uncommon", {
    tags: ["growth"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "countTag", tag: "growth", n: 3 }, { c: "equalsLast" }],
        do: [{ a: "grow", n: 1, cap: 3 }],
      },
    ],
  }),
  perk("tideRoots", "green", "uncommon", {
    tags: ["control"],
    mods: { tideEffectDelta: -1 },
  }),
  perk("mycelium", "green", "uncommon", {
    tags: ["survival", "growth"],
    effects: [
      {
        on: "afterResolveSlot",
        do: [{ a: "counter", scope: "battle", key: "greenMycelium", delta: 1 }],
      },
      {
        on: "turnEnd",
        if: [
          { c: "counterAtLeast", scope: "battle", key: "greenMycelium", n: 6 },
        ],
        do: [
          { a: "heal", n: 2 },
          { a: "shield", n: 3 },
        ],
      },
    ],
  }),
  perk("rhizome", "green", "uncommon", {
    tags: ["engines", "dodge"],
    mods: { enginesThresholdDelta: 2, hullMaxDelta: -2 },
  }),
  perk("taproot", "green", "uncommon", {
    tags: ["survival", "shieldwall"],
    effects: [
      {
        on: "nodeEnter",
        do: [{ a: "counter", scope: "run", key: "greenTaproot", delta: 1 }],
      },
      {
        on: "battleStart",
        if: [{ c: "counterAtLeast", scope: "run", key: "greenTaproot", n: 8 }],
        do: [
          { a: "shield", n: 6 },
          { a: "heal", n: 3 },
        ],
      },
    ],
  }),
  perk("perennial", "green", "uncommon", {
    tags: ["engines", "growth"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "engines" }, { c: "equalsLast" }],
        do: [{ a: "modDieValue", n: 4 }],
      },
    ],
  }),
  perk("worldTree", "green", "rare", {
    synergy: ["green"],
    tags: ["survival", "growth"],
    effects: [
      {
        on: "turnEnd",
        if: [{ c: "resonanceAtLeast", school: "green", n: 4 }],
        do: [{ a: "heal", n: 1, perTag: "green" }],
      },
    ],
  }),
  perk("overgrowthPact", "green", "rare", {
    synergy: ["growth"],
    tags: ["growth", "risk"],
    mods: { growthCapDelta: 2, hullMaxDelta: -4 },
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "countTag", tag: "growth", n: 4 }],
        do: [{ a: "modDieValue", n: 2 }],
      },
    ],
  }),
  perk("standingWave", "green", "rare", {
    synergy: ["engines"],
    tags: ["engines", "charge"],
    mods: { enginesThresholdDelta: 1 },
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "engines" }, { c: "valueGte", n: 6 }],
        do: [
          {
            a: "schedule",
            on: "nextTurn",
            do: [
              { a: "shield", n: 4 },
              { a: "charge", n: 2 },
            ],
          },
        ],
      },
    ],
  }),
  perk("annualRings", "green", "rare", {
    synergy: ["growth"],
    tags: ["growth", "precision"],
    effects: [
      {
        on: "rolled",
        if: [{ c: "equalsLast" }],
        do: [{ a: "counter", scope: "battle", key: "greenRings", delta: 1 }],
      },
      {
        on: "beforeResolveSlot",
        if: [{ c: "counterAtLeast", scope: "battle", key: "greenRings", n: 3 }],
        do: [{ a: "modDieValue", n: 3 }],
      },
    ],
  }),
];
