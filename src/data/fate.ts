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

// DESIGN §7: the d100 is never slotted. Once per battle it rolls against this
// table — 1 catastrophe · 2–20 setback · 21–60 mixed · 61–95 boon · 96–100
// miracle — through the ordinary Action vocabulary, so no bespoke code path.
export const FATE_TABLE: readonly FateOutcome[] = [
  {
    id: "severance",
    min: 1,
    max: 1,
    band: "catastrophe",
    text: "content:fate.severance",
    do: [{ a: "hull", n: -8 }],
  },
  {
    id: "misfire",
    min: 2,
    max: 10,
    band: "setback",
    text: "content:fate.misfire",
    do: [{ a: "hull", n: -4 }],
  },
  {
    id: "interference",
    min: 11,
    max: 20,
    band: "setback",
    text: "content:fate.interference",
    do: [
      { a: "scrap", n: -10 },
      { a: "charge", n: -3 },
    ],
  },
  {
    id: "trade",
    min: 21,
    max: 35,
    band: "mixed",
    text: "content:fate.trade",
    do: [
      { a: "hull", n: -2 },
      { a: "charge", n: 5 },
    ],
  },
  {
    id: "wash",
    min: 36,
    max: 48,
    band: "mixed",
    text: "content:fate.wash",
    do: [{ a: "scrap", n: 8 }],
  },
  {
    id: "ripple",
    min: 49,
    max: 60,
    band: "mixed",
    text: "content:fate.ripple",
    do: [{ a: "shield", n: 4 }],
  },
  {
    id: "tailwind",
    min: 61,
    max: 75,
    band: "boon",
    text: "content:fate.tailwind",
    do: [
      { a: "charge", n: 5 },
      { a: "shield", n: 3 },
    ],
  },
  {
    id: "cache",
    min: 76,
    max: 88,
    band: "boon",
    text: "content:fate.cache",
    do: [{ a: "scrap", n: 25 }],
  },
  {
    id: "volley",
    min: 89,
    max: 95,
    band: "boon",
    text: "content:fate.volley",
    do: [
      { a: "dmg", n: 12, target: "target" },
      { a: "addStatus", s: "burn", n: 2, target: "target" },
    ],
  },
  {
    id: "mercy",
    min: 96,
    max: 99,
    band: "miracle",
    text: "content:fate.mercy",
    do: [
      { a: "heal", n: 10 },
      { a: "shield", n: 10 },
      { a: "charge", n: 5 },
    ],
  },
  {
    id: "miracle",
    min: 100,
    max: 100,
    band: "miracle",
    text: "content:fate.miracle",
    do: [
      { a: "dmg", n: 30, target: "target" },
      { a: "heal", n: 15 },
      { a: "scrap", n: 40 },
    ],
  },
];

export const FATE_DIE_ID = "fate-d100";

export const fateOutcomeFor = (roll: number): FateOutcome => {
  const clamped = Math.max(1, Math.min(100, Math.round(roll)));
  const found = FATE_TABLE.find((o) => clamped >= o.min && clamped <= o.max);
  if (found === undefined)
    throw new Error(`fateOutcomeFor: no band for ${String(clamped)}`);
  return found;
};
