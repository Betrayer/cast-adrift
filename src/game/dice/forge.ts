import { DIE_BY_ID } from "@/data/dice";
import { fusionTarget } from "@/data/dice/fusion";
import { FATE_DIE_ID } from "@/data/fate";
import { FUSION_COST, sellValue } from "@/game/economy/prices";
import {
  FORGE_MAX_LEVEL,
  FORGE_TIER_CEILING,
  dieTier,
  forgeLevel,
  type ForgeLevel,
  type HandDie,
} from "@/game/dice/tier";
import type { School } from "@/types/content";

export interface ForgeDie extends HandDie {
  uid: string;
}

export type ForgeOption =
  | {
      kind: "colour";
      signature: string;
      consumed: string;
      level: ForgeLevel;
      cost: number;
    }
  | {
      kind: "recipe";
      first: string;
      second: string;
      result: string;
      cost: number;
    };

const schoolOf = (die: HandDie): School | undefined =>
  DIE_BY_ID.get(die.defId)?.school;

export const isForgeable = (die: HandDie): boolean =>
  die.defId !== FATE_DIE_ID && DIE_BY_ID.has(die.defId);

export const canBeSignature = (die: HandDie): boolean =>
  isForgeable(die) &&
  forgeLevel(die) < FORGE_MAX_LEVEL &&
  dieTier(die) !== FORGE_TIER_CEILING;

const sameForgeSchool =(a: HandDie, b: HandDie): boolean => {
  const school = schoolOf(a);
  return school !== undefined && school === schoolOf(b);
};

export const forgeCost = (signature: HandDie): number =>
  FUSION_COST * (1 + forgeLevel(signature));

const recipeFor =(a: HandDie, b: HandDie): string | undefined =>
  a.defId === b.defId && forgeLevel(a) === 0 && forgeLevel(b) === 0
    ? fusionTarget(a.defId)
    : undefined;

export const forgeOptions = (a: ForgeDie, b: ForgeDie): ForgeOption[] => {
  if (a.uid === b.uid || !isForgeable(a) || !isForgeable(b)) return [];
  if (!sameForgeSchool(a, b)) return [];
  const options: ForgeOption[] = [];
  const recipe = recipeFor(a, b);
  if (recipe !== undefined) {
    options.push({
      kind: "recipe",
      first: a.uid,
      second: b.uid,
      result: recipe,
      cost: FUSION_COST,
    });
  }
  for (const [signature, consumed] of [
    [a, b],
    [b, a],
  ] as const) {
    if (!canBeSignature(signature)) continue;
    options.push({
      kind: "colour",
      signature: signature.uid,
      consumed: consumed.uid,
      level: (forgeLevel(signature) + 1) as ForgeLevel,
      cost: forgeCost(signature),
    });
  }
  return options;
};

export const forgePartners = (
  hand: readonly ForgeDie[],
  uid: string,
): string[] => {
  const picked = hand.find((die) => die.uid === uid);
  if (picked === undefined) return [];
  return hand
    .filter((die) => forgeOptions(picked, die).length > 0)
    .map((die) => die.uid);
};

export const hasForgeablePair = (hand: readonly ForgeDie[]): boolean =>
  hand.some((die) => forgePartners(hand, die.uid).length > 0);

export const forgedDie = <T extends ForgeDie>(signature: T, consumed: HandDie): T => {
  const level = (forgeLevel(signature) + 1) as ForgeLevel;
  return {
    ...signature,
    fusion: {
      level,
      consumed: [...(signature.fusion?.consumed ?? []), consumed.defId],
    },
  };
};

export const growthRefund = (consumed: HandDie): number =>
  sellValue(Math.max(0, consumed.growthBonus ?? 0));
