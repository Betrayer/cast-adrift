import { resonanceGrantActive } from "@/data/resonance";
import type { RngStream } from "@/services/rng";
import type { ResonanceCensus, RolledDie } from "@/types/battle";

export const dieValueCeiling = (die: RolledDie): number =>
  die.tier + (die.growth ?? 0);

export const rerollFace = (
  die: Pick<RolledDie, "tier" | "growth" | "school">,
  rng: RngStream,
  blueFloor = false,
): number => {
  const face = rng.int(1, die.tier) + (die.growth ?? 0);
  return blueFloor && die.school === "blue" ? Math.max(face, 2) : face;
};

export const applyRollFloors = (
  dice: readonly RolledDie[],
  census: ResonanceCensus,
  stabilizer = false,
): void => {
  const blueFloor = resonanceGrantActive(census.counts, "blueRollFloor");
  const blueAvg = resonanceGrantActive(census.counts, "blueAverageFloor");
  if (!blueFloor && !blueAvg && !stabilizer) return;
  let avgUsed = false;
  let stabilizerUsed = false;
  for (const die of dice) {
    if (die.school !== "blue") continue;
    if (blueFloor) die.value = Math.max(die.value, 2);
    if (stabilizer && !stabilizerUsed) {
      die.value = Math.max(die.value, 2);
      stabilizerUsed = true;
    }
    if (blueAvg && !avgUsed) {
      die.value = Math.max(die.value, Math.ceil((die.tier + 1) / 2));
      avgUsed = true;
    }
  }
};

export const applySpareLowest = (dice: readonly RolledDie[]): void => {
  let lowest: RolledDie | undefined;
  for (const die of dice) {
    if (die.state !== "tray") continue;
    if (lowest === undefined || die.value < lowest.value) lowest = die;
  }
  if (lowest !== undefined)
    lowest.value = Math.min(dieValueCeiling(lowest), lowest.value + 1);
};
