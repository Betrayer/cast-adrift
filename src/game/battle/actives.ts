import { DIE_BY_ID } from "@/data/dice";
import { resonanceAtLeast } from "@/game/battle/resonance";
import type { ResonanceCensus, RolledDie } from "@/types/battle";

export const canFlip = (die: RolledDie): boolean =>
  DIE_BY_ID.get(die.defId)?.active === "flip" && die.activeUsed !== true;

export const canCopy = (
  die: RolledDie,
  resonance: ResonanceCensus,
): boolean => {
  if (die.activeUsed === true) return false;
  if (DIE_BY_ID.get(die.defId)?.active === "copy") return true;
  return die.school === "grey" && resonanceAtLeast(resonance, "grey", 4);
};

export const flippedValue = (die: RolledDie): number => die.tier + 1 - die.value;

export const adjacentCopyValue = (
  dice: readonly RolledDie[],
  uid: string,
): number | undefined => {
  const index = dice.findIndex((d) => d.uid === uid);
  if (index < 0) return undefined;
  const neighbors = [dice[index - 1], dice[index + 1]].filter(
    (d): d is RolledDie => d !== undefined && d.state === "tray",
  );
  if (neighbors.length === 0) return undefined;
  return Math.max(...neighbors.map((d) => d.value));
};
