import { DIE_BY_ID } from "@/data/dice";
import { FATE_DIE_ID } from "@/data/fate";
import { resonanceGrantActive } from "@/data/resonance";
import { tableSeats } from "@/game/battle/table";
import { FORGE_TIER_CEILING, stepTier } from "@/game/dice/tier";
import type { DieActive } from "@/types/content";
import type { ResonanceCensus, RolledDie } from "@/types/battle";

export const SPLIT_DIE_DEF = "grey-d4";
export const SPLIT_DIE_COUNT = 2;

const activeOf = (die: RolledDie): DieActive | undefined =>
  DIE_BY_ID.get(die.defId)?.active;

const ready = (die: RolledDie, kind: DieActive): boolean =>
  activeOf(die) === kind && die.activeUsed !== true;

export const canFlip = (die: RolledDie): boolean => ready(die, "flip");

export const canSwap = (die: RolledDie): boolean => ready(die, "swap");

export const canBank = (die: RolledDie): boolean =>
  ready(die, "bank") && die.bankedValue === undefined;

export const canSplit = (die: RolledDie): boolean =>
  ready(die, "split") && die.state === "tray";

export const canCopy = (
  die: RolledDie,
  resonance: ResonanceCensus,
): boolean => {
  if (die.activeUsed === true) return false;
  if (activeOf(die) === "copy") return true;
  return (
    die.school === "grey" &&
    resonanceGrantActive(resonance.counts, "copyAdjacent")
  );
};

export const flippedValue = (die: RolledDie): number => die.tier + 1 - die.value;

const lendsValue = (die: RolledDie): boolean => die.defId !== FATE_DIE_ID;

export const adjacentCopyValue = (
  dice: readonly RolledDie[],
  uid: string,
): number | undefined => {
  const seats = tableSeats(dice);
  const own = seats.get(uid);
  if (own === undefined) return undefined;
  const neighbors = dice.filter((d) => {
    const seat = seats.get(d.uid);
    return (
      seat !== undefined &&
      Math.abs(seat - own) === 1 &&
      d.state === "tray" &&
      lendsValue(d)
    );
  });
  if (neighbors.length === 0) return undefined;
  return Math.max(...neighbors.map((d) => d.value));
};

export const isSwapTarget = (
  source: RolledDie,
  candidate: RolledDie,
): boolean =>
  candidate.uid !== source.uid &&
  lendsValue(candidate) &&
  (candidate.state === "tray" || candidate.state === "placed");

export const canFuse = (die: RolledDie): boolean =>
  die.state === "tray" && die.tier <= FORGE_TIER_CEILING;

export const isFuseTarget = (
  source: RolledDie,
  candidate: RolledDie,
): boolean =>
  candidate.uid !== source.uid &&
  candidate.state === "tray" &&
  candidate.tier <= FORGE_TIER_CEILING &&
  candidate.value === source.value;

export const fusedDie = (
  source: RolledDie,
  target: RolledDie,
  tierStep: number,
): RolledDie => {
  const tier = stepTier(
    source.tier >= target.tier ? source.tier : target.tier,
    tierStep,
  );
  return {
    uid: `${source.uid}-fused`,
    defId: source.defId,
    tier,
    school: source.school,
    value: Math.min(tier, source.value + target.value),
    state: "tray",
    temp: true,
  };
};

export const canReschool = (die: RolledDie): boolean =>
  (die.state === "tray" || die.state === "placed") &&
  die.school !== "prismatic";
