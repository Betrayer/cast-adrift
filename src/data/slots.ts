import type { DieTier, School } from "@/types/content";
import type { SlotId } from "@/types/battle";

export type MkLevel = 1 | 2 | 3;

export const nextMkLevel = (mk: MkLevel): Exclude<MkLevel, 1> | null =>
  mk === 1 ? 2 : mk === 2 ? 3 : null;

export const SLOT_MK: Record<SlotId, readonly [DieTier, DieTier, DieTier]> = {
  weaponA: [8, 10, 12],
  weaponB: [8, 10, 12],
  spinal: [20, 20, 20],
  shields: [8, 10, 12],
  shieldsB: [8, 10, 12],
  engines: [6, 8, 10],
  enginesB: [6, 8, 10],
  sensors: [6, 8, 10],
  reactor: [10, 12, 20],
  repairBay: [6, 8, 10],
};

export const SLOT_IDS: readonly SlotId[] = Object.keys(SLOT_MK) as SlotId[];

export const SLOT_FAMILY: Readonly<Record<"weapons" | "shields" | "engines", readonly SlotId[]>> = {
  weapons: ["weaponA", "weaponB", "spinal"],
  shields: ["shields", "shieldsB"],
  engines: ["engines", "enginesB"],
};

export const slotCapForMk = (slotId: SlotId, mk: MkLevel): DieTier => {
  const caps = SLOT_MK[slotId];
  return caps[mk - 1] ?? caps[0];
};

export type AffinitySlot =
  | "weapons"
  | "shields"
  | "engines"
  | "sensors"
  | "reactor";

export type AffinityDef =
  | {
      slot: Exclude<AffinitySlot, "reactor">;
      kind: "valueBonus";
      values: readonly [number, number, number];
    }
  | { slot: "reactor"; kind: "chargeMult"; mult: number };

export const AFFINITY: Partial<Record<School, AffinityDef>> = {
  red: { slot: "weapons", kind: "valueBonus", values: [2, 3, 4] },
  blue: { slot: "shields", kind: "valueBonus", values: [2, 3, 4] },
  green: { slot: "engines", kind: "valueBonus", values: [2, 3, 4] },
  grey: { slot: "sensors", kind: "valueBonus", values: [1, 2, 3] },
  black: { slot: "reactor", kind: "chargeMult", mult: 1.5 },
};

const WEAPON_SLOTS: ReadonlySet<SlotId> = new Set(SLOT_FAMILY.weapons);

const SHIELD_SLOTS: ReadonlySet<SlotId> = new Set(SLOT_FAMILY.shields);

export const ENGINE_SLOTS: ReadonlySet<SlotId> = new Set(SLOT_FAMILY.engines);

export const slotInAffinity = (slotId: SlotId, affSlot: AffinitySlot): boolean =>
  affSlot === "weapons"
    ? WEAPON_SLOTS.has(slotId)
    : affSlot === "shields"
      ? SHIELD_SLOTS.has(slotId)
      : affSlot === "engines"
        ? ENGINE_SLOTS.has(slotId)
        : slotId === affSlot;

export const affinitySchoolForSlot = (slotId: SlotId): School | undefined => {
  if (WEAPON_SLOTS.has(slotId)) return "red";
  if (SHIELD_SLOTS.has(slotId)) return "blue";
  if (ENGINE_SLOTS.has(slotId)) return "green";
  if (slotId === "sensors") return "grey";
  if (slotId === "reactor") return "black";
  return undefined;
};
