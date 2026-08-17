import { AFFINITY, slotInAffinity, affinitySchoolForSlot } from "@/data/slots";
import { evasionFor, vulnerableFor } from "@/game/battle/resolver";
import { sourceMods, type RunModSource } from "@/game/run/runMods";
import type { EvasionState, RolledDie, SlotId, SlotState } from "@/types/battle";

export const effectiveSlotValue = (
  die: RolledDie,
  slotId: SlotId,
  slot: SlotState,
): number => {
  const school =
    die.school === "prismatic" ? affinitySchoolForSlot(slotId) : die.school;
  if (school === undefined) return die.value;
  const aff = AFFINITY[school];
  if (aff === undefined || aff.kind !== "valueBonus") return die.value;
  if (!slotInAffinity(slotId, aff.slot)) return die.value;
  return die.value + (aff.values[slot.mk - 1] ?? 0);
};

export const projectedEvasion = (
  source: RunModSource,
  die: RolledDie,
  slot: SlotState,
): EvasionState =>
  evasionFor(
    effectiveSlotValue(die, "engines", slot),
    sourceMods(source).evasionDelta,
  );

export const projectedVulnerable = (
  source: RunModSource,
  die: RolledDie,
  slot: SlotState,
): number =>
  vulnerableFor(
    effectiveSlotValue(die, "sensors", slot),
    sourceMods(source).markBonusDelta,
  );
