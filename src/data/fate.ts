import type { Action } from "@/game/effects/types";
import type { LocKey } from "@/types/content";

export type FateBand =
  | "catastrophe"
  | "setback"
  | "mixed"
  | "boon"
  | "miracle";

export interface FateOutcome {
  id: string;
  min: number;
  max: number;
  band: FateBand;
  text: LocKey;
  do: readonly Action[];
}

const fate = (
  id: string,
  body: Omit<FateOutcome, "id" | "text">,
): FateOutcome => ({
  id,
  text: `content:fate.${id}`,
  ...body,
});

export const FATE_TABLE: readonly FateOutcome[] = [
  fate("severance", {
    min: 1,
    max: 1,
    band: "catastrophe",
    do: [{ a: "hull", n: -8 }],
  }),
  fate("misfire", {
    min: 2,
    max: 10,
    band: "setback",
    do: [{ a: "hull", n: -4 }],
  }),
  fate("interference", {
    min: 11,
    max: 20,
    band: "setback",
    do: [
      { a: "scrap", n: -10 },
      { a: "charge", n: -3 },
    ],
  }),
  fate("trade", {
    min: 21,
    max: 35,
    band: "mixed",
    do: [
      { a: "hull", n: -2 },
      { a: "charge", n: 5 },
    ],
  }),
  fate("wash", {
    min: 36,
    max: 48,
    band: "mixed",
    do: [{ a: "scrap", n: 8 }],
  }),
  fate("ripple", {
    min: 49,
    max: 60,
    band: "mixed",
    do: [{ a: "shield", n: 4 }],
  }),
  fate("tailwind", {
    min: 61,
    max: 75,
    band: "boon",
    do: [
      { a: "charge", n: 5 },
      { a: "shield", n: 3 },
    ],
  }),
  fate("cache", {
    min: 76,
    max: 88,
    band: "boon",
    do: [{ a: "scrap", n: 25 }],
  }),
  fate("volley", {
    min: 89,
    max: 95,
    band: "boon",
    do: [
      { a: "dmg", n: 12, target: "target" },
      { a: "addStatus", s: "burn", n: 2, target: "target" },
    ],
  }),
  fate("mercy", {
    min: 96,
    max: 99,
    band: "miracle",
    do: [
      { a: "heal", n: 10 },
      { a: "shield", n: 10 },
      { a: "charge", n: 5 },
    ],
  }),
  fate("miracle", {
    min: 100,
    max: 100,
    band: "miracle",
    do: [
      { a: "dmg", n: 30, target: "target" },
      { a: "heal", n: 15 },
      { a: "scrap", n: 40 },
    ],
  }),
];

export const FATE_DIE_ID = "fate-d100";

export const fateOutcomeFor = (roll: number): FateOutcome => {
  const clamped = Math.max(1, Math.min(100, Math.round(roll)));
  const found = FATE_TABLE.find((o) => clamped >= o.min && clamped <= o.max);
  if (found === undefined)
    throw new Error(`fateOutcomeFor: no band for ${String(clamped)}`);
  return found;
};
