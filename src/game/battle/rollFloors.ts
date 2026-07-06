import { resonanceAtLeast } from "@/game/battle/resonance";
import type { ResonanceCensus, RolledDie } from "@/types/battle";

export const applyRollFloors = (
  dice: readonly RolledDie[],
  census: ResonanceCensus,
  stabilizer = false,
): void => {
  const blueFloor = resonanceAtLeast(census, "blue", 2);
  const blueAvg = resonanceAtLeast(census, "blue", 6);
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
  if (lowest !== undefined) lowest.value = Math.min(lowest.tier, lowest.value + 1);
};
