import type { EffectDef } from "@/game/effects/types";
import type { ResonanceThreshold } from "@/types/battle";
import type { LocKey, School } from "@/types/content";

export type ResonanceGrant =
  | "blueRollFloor"
  | "blueAverageFloor"
  | "shieldPersist"
  | "surviveLethal"
  | "copyAdjacent";

export interface ResonanceBonus {
  school: School;
  threshold: ResonanceThreshold;
  desc: LocKey;
  effects?: readonly EffectDef[];
  grant?: ResonanceGrant;
}

const res = (
  school: School,
  threshold: ResonanceThreshold,
  body: Omit<ResonanceBonus, "school" | "threshold" | "desc">,
): ResonanceBonus => ({
  school,
  threshold,
  desc: `content:resonance.${school}-${String(threshold)}`,
  ...body,
});

export const RESONANCE_BONUSES: readonly ResonanceBonus[] = [
  res("red", 2, {
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "school", is: "red" }],
        do: [{ a: "modDieValue", n: 1 }],
      },
    ],
  }),
  res("red", 4, {
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "isMaxFace" }],
        do: [{ a: "addStatus", s: "burn", n: 2, target: "target" }],
      },
    ],
  }),
  res("red", 6, {
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "weaponA" }],
        do: [{ a: "repeatSlot" }],
      },
    ],
  }),
  res("blue", 2, {
    grant: "blueRollFloor",
  }),
  res("blue", 4, {
    grant: "shieldPersist",
  }),
  res("blue", 6, {
    grant: "blueAverageFloor",
  }),
  res("green", 2, {
    effects: [
      {
        on: "rolled",
        if: [{ c: "school", is: "green" }, { c: "equalsLast" }],
        do: [{ a: "modDieValue", n: 2 }],
      },
    ],
  }),
  res("green", 4, {
    effects: [
      {
        on: "battleEnd",
        if: [{ c: "battleOutcome", is: "victory" }],
        do: [{ a: "heal", n: 1, perTag: "green" }],
      },
    ],
  }),
  res("green", 6, {
    effects: [
      {
        on: "afterResolveSlot",
        if: [
          { c: "school", is: "green", exact: true },
          { c: "isMaxFace" },
        ],
        do: [{ a: "grow", n: 1, cap: 3 }],
      },
    ],
  }),
  res("yellow", 2, {
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "isMaxFace" }],
        do: [{ a: "scrap", n: 4 }],
      },
    ],
  }),
  res("yellow", 4, {
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "isMaxFace" }],
        do: [{ a: "crit" }],
      },
    ],
  }),
  res("yellow", 6, {
    effects: [
      {
        on: "battleStart",
        do: [{ a: "grant", what: "rerollSize", n: 1 }],
      },
    ],
  }),
  res("black", 2, {
    effects: [
      {
        on: "battleStart",
        do: [{ a: "allowExceedCap", school: "black", hullCost: 1 }],
      },
    ],
  }),
  res("black", 4, {
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "school", is: "black" }, { c: "isMinFace" }],
        do: [{ a: "primeSchool", school: "black", max: true }],
      },
    ],
  }),
  res("black", 6, {
    grant: "surviveLethal",
  }),
  res("grey", 2, {
    effects: [
      {
        on: "battleStart",
        do: [{ a: "grant", what: "rerollSize", n: 1 }],
      },
    ],
  }),
  res("grey", 4, {
    grant: "copyAdjacent",
  }),
  res("grey", 6, {
    effects: [
      {
        on: "battleStart",
        do: [{ a: "grant", what: "reserve", n: 1 }],
      },
    ],
  }),
  res("prismatic", 2, {
    effects: [
      {
        on: "battleStart",
        do: [{ a: "grant", what: "nudge", n: 1 }],
      },
    ],
  }),
];

export const resonanceGrantActive = (
  counts: Readonly<Record<School, number>>,
  grant: ResonanceGrant,
): boolean =>
  RESONANCE_BONUSES.some(
    (bonus) =>
      bonus.grant === grant && counts[bonus.school] >= bonus.threshold,
  );
