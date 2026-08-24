import { DIE_BY_ID } from "@/data/dice";
import { resonanceGrantActive } from "@/data/resonance";
import { TIER_LADDER } from "@/game/battle/setup";
import type { DieActive, DieTier } from "@/types/content";
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

export const isSwapTarget = (
  source: RolledDie,
  candidate: RolledDie,
): boolean =>
  candidate.uid !== source.uid &&
  (candidate.state === "tray" || candidate.state === "placed");

export const FUSE_TIER_CEILING: DieTier = 20;

export const growTier = (tier: DieTier, steps: number): DieTier => {
  const index = TIER_LADDER.indexOf(tier);
  const ceiling = TIER_LADDER.indexOf(FUSE_TIER_CEILING);
  if (index < 0) return tier;
  const capped = Math.min(ceiling, index + Math.max(0, steps));
  return TIER_LADDER[capped] ?? tier;
};

export const canFuse = (die: RolledDie): boolean =>
  die.state === "tray" && die.tier <= FUSE_TIER_CEILING;

export const isFuseTarget = (
  source: RolledDie,
  candidate: RolledDie,
): boolean =>
  candidate.uid !== source.uid &&
  candidate.state === "tray" &&
  candidate.tier <= FUSE_TIER_CEILING &&
  candidate.value === source.value;

export const fusedDie = (
  source: RolledDie,
  target: RolledDie,
  tierStep: number,
): RolledDie => {
  const tier = growTier(
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
