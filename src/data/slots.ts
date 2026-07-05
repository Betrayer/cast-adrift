import type { DieTier, School } from "@/types/content";
import type { SlotId } from "@/types/battle";

export type MkLevel = 1 | 2 | 3;

export const SLOT_MK: Record<SlotId, readonly [DieTier, DieTier, DieTier]> = {
  weaponA: [8, 10, 12],
  weaponB: [8, 10, 12],
  spinal: [20, 20, 20],
  shields: [8, 10, 12],
  engines: [6, 8, 10],
  sensors: [6, 8, 10],
  reactor: [10, 12, 20],
  repairBay: [6, 8, 10],
};

export const slotCapForMk = (slotId: SlotId, mk: MkLevel): DieTier => {
  const caps = SLOT_MK[slotId];
  return caps[mk - 1] ?? caps[0];
};

export type AffinitySlot = "weapons" | "shields" | "engines" | "reactor";

export type AffinityDef =
  | { slot: "weapons"; kind: "weaponBonus"; values: readonly [number, number, number] }
  | { slot: "shields"; kind: "shieldBonus"; values: readonly [number, number, number] }
  | { slot: "engines"; kind: "thresholdBonus"; values: readonly [number, number, number] }
  | { slot: "reactor"; kind: "chargeMult"; mult: number };

export const AFFINITY: Partial<Record<School, AffinityDef>> = {
  red: { slot: "weapons", kind: "weaponBonus", values: [2, 3, 4] },
  blue: { slot: "shields", kind: "shieldBonus", values: [2, 3, 4] },
  green: { slot: "engines", kind: "thresholdBonus", values: [2, 3, 4] },
  black: { slot: "reactor", kind: "chargeMult", mult: 1.5 },
};

const WEAPON_SLOTS: ReadonlySet<SlotId> = new Set([
  "weaponA",
  "weaponB",
  "spinal",
]);

export const slotInAffinity = (slotId: SlotId, affSlot: AffinitySlot): boolean =>
  affSlot === "weapons" ? WEAPON_SLOTS.has(slotId) : slotId === affSlot;

export const affinitySchoolForSlot = (slotId: SlotId): School | undefined => {
  if (WEAPON_SLOTS.has(slotId)) return "red";
  if (slotId === "shields") return "blue";
  if (slotId === "engines") return "green";
  if (slotId === "reactor") return "black";
  return undefined;
};
