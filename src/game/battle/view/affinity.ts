import { AFFINITY, affinitySchoolForSlot, slotInAffinity } from "@/data/slots";
import type { RolledDie, SlotId, SlotState } from "@/types/battle";
import type { School } from "@/types/content";

export interface SlotAffinity {
  school: School;
  kind: "valueBonus" | "chargeMult";
  amount: number;
}

export const slotAffinity = (
  slotId: SlotId,
  slot: Pick<SlotState, "mk">,
): SlotAffinity | null => {
  const school = affinitySchoolForSlot(slotId);
  if (school === undefined) return null;
  const aff = AFFINITY[school];
  if (aff === undefined) return null;
  if (!slotInAffinity(slotId, aff.slot)) return null;
  if (aff.kind === "chargeMult") {
    return { school, kind: "chargeMult", amount: aff.mult };
  }
  return {
    school,
    kind: "valueBonus",
    amount: aff.values[slot.mk - 1] ?? 0,
  };
};

export const inheritedSchool = (
  die: Pick<RolledDie, "school">,
  slotId: SlotId,
): School | null =>
  die.school === "prismatic" ? affinitySchoolForSlot(slotId) ?? null : null;

export const effectiveSlotValue = (
  die: RolledDie,
  slotId: SlotId,
  slot: Pick<SlotState, "mk">,
): number => {
  const school = die.school === "prismatic" ? affinitySchoolForSlot(slotId) : die.school;
  if (school === undefined) return die.value;
  const aff = AFFINITY[school];
  if (aff === undefined || aff.kind !== "valueBonus") return die.value;
  if (!slotInAffinity(slotId, aff.slot)) return die.value;
  return die.value + (aff.values[slot.mk - 1] ?? 0);
};
