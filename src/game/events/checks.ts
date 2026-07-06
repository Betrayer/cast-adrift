import { DIE_BY_ID } from "@/data/dice";
import type { RngStream } from "@/services/rng";
import type { CheckPick } from "@/types/events";
import type { DieTier } from "@/types/content";

export interface FaceDie {
  defId: string;
  tier: DieTier;
  faces: readonly number[];
}

export const resolveFaces = (defId: string, tier: DieTier): number[] => {
  const faces = DIE_BY_ID.get(defId)?.faces;
  if (faces !== undefined && faces.length > 0) return [...faces];
  return Array.from({ length: tier }, (_, i) => i + 1);
};

export interface DeckRef {
  defId: string;
  tier: DieTier;
}

export const topDiceForCheck = (
  deck: readonly DeckRef[],
  count: number,
): FaceDie[] =>
  [...deck]
    .sort((a, b) => b.tier - a.tier)
    .slice(0, count)
    .map((d) => ({ defId: d.defId, tier: d.tier, faces: resolveFaces(d.defId, d.tier) }));

const sumDistribution = (dice: readonly FaceDie[]): Map<number, number> => {
  let dist = new Map<number, number>([[0, 1]]);
  for (const die of dice) {
    const next = new Map<number, number>();
    const p = 1 / die.faces.length;
    for (const [sum, prob] of dist) {
      for (const face of die.faces) {
        const key = sum + face;
        next.set(key, (next.get(key) ?? 0) + prob * p);
      }
    }
    dist = next;
  }
  return dist;
};

export const sumSuccessOdds = (
  dice: readonly FaceDie[],
  target: number,
): number => {
  const dist = sumDistribution(dice);
  let odds = 0;
  for (const [sum, prob] of dist) {
    if (sum >= target) odds += prob;
  }
  return odds;
};

export const highestSuccessOdds = (
  dice: readonly FaceDie[],
  target: number,
): number => {
  let allBelow = 1;
  for (const die of dice) {
    const below = die.faces.filter((f) => f < target).length / die.faces.length;
    allBelow *= below;
  }
  return 1 - allBelow;
};

export const checkOdds = (
  dice: readonly FaceDie[],
  pick: CheckPick,
  target: number,
): number => {
  if (dice.length === 0) return 0;
  const raw =
    pick === "sum"
      ? sumSuccessOdds(dice, target)
      : highestSuccessOdds(dice, target);
  return Math.max(0, Math.min(1, raw));
};

export const oddsPercent = (odds: number): number => Math.round(odds * 100);

export const rollCheckDice = (
  dice: readonly FaceDie[],
  stream: RngStream,
): number[] => dice.map((die) => stream.pick(die.faces));

export const checkTotal = (values: readonly number[], pick: CheckPick): number =>
  pick === "sum"
    ? values.reduce((a, b) => a + b, 0)
    : values.reduce((a, b) => Math.max(a, b), 0);
