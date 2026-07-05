import { resonanceAtLeast } from "@/game/battle/resonance";
import type { ResonanceCensus, RolledDie } from "@/types/battle";

export const applyRollFloors = (
  dice: readonly RolledDie[],
  census: ResonanceCensus,
): void => {
  const blueFloor = resonanceAtLeast(census, "blue", 2);
  const blueAvg = resonanceAtLeast(census, "blue", 6);
  if (!blueFloor && !blueAvg) return;
  let avgUsed = false;
  for (const die of dice) {
    if (die.school !== "blue") continue;
    if (blueFloor) die.value = Math.max(die.value, 2);
    if (blueAvg && !avgUsed) {
      die.value = Math.max(die.value, Math.ceil((die.tier + 1) / 2));
      avgUsed = true;
    }
  }
};
