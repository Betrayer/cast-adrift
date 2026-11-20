import { AFFINITY, SLOT_IDS, SLOT_MK } from "@/data/slots";
import { SHIP_BY_ID, type ShipId } from "@/data/ships";
import { CRIT_MULT } from "@/game/battle/damage";
import {
  BONUS_REROLL_COST,
  DEFAULT_SPINAL_JAM_ON,
  evasionTuningFor,
  INTERCEPT_VALUE,
  INTERCEPT_WEAPONS_BONUS,
  nudgeChargeCost,
  OVERFLOW_HULL_COST,
  REPAIR_DIVISOR,
  SPINAL_JAM_CARRY,
  SURGE_COST,
  VULNERABLE_CAP,
} from "@/game/battle/resolver";
import { BASE_FOG_ROWS, FOG_ROWS_PER_SENSORS_MK } from "@/game/map/fog";
import { BASE_CHARGE_CAP } from "@/game/run/perkMods";
import type { SlotId } from "@/types/battle";
import type { LocKey, School } from "@/types/content";

export type SystemFactId =
  | "weaponDamage"
  | "spinalJam"
  | "shieldGain"
  | "shieldKeep"
  | "manoeuvre"
  | "manoeuvreFlat"
  | "targeting"
  | "reactorStore"
  | "charge"
  | "repair"
  | "fit"
  | "weaponsAffinity"
  | "shieldsAffinity"
  | "enginesAffinity"
  | "sensorsAffinity"
  | "reactorAffinity"
  | "mk"
  | "spinalMk"
  | "reactorMk"
  | "repairMk"
  | "fog";

export type SystemFactSection = "how" | "dice" | "improve";

export interface FactInput {
  shipId?: ShipId;
  nudgeCost?: number;
  chargeCap?: number;
  markBonus?: number;
  evasionFlat?: number;
  fogRows?: number;
}

export type FactVars = Readonly<Record<string, number>>;

export interface SystemFact {
  id: SystemFactId;
  section: SystemFactSection;
  text: LocKey;
  brief?: LocKey;
  slots: readonly SlotId[];
  vars: (input: FactInput) => FactVars;
  when?: (input: FactInput) => boolean;
}

const NO_VARS = (): FactVars => ({});

const bonusVars = (school: School): FactVars => {
  const aff = AFFINITY[school];
  if (aff?.kind !== "valueBonus") return {};
  return { mk1: aff.values[0], mk2: aff.values[1], mk3: aff.values[2] };
};

export const blackChargeMult = (): number => {
  const aff = AFFINITY.black;
  return aff?.kind === "chargeMult" ? aff.mult : 1;
};

export const spinalJamOn = (shipId: ShipId | undefined): number =>
  (shipId === undefined
    ? undefined
    : SHIP_BY_ID.get(shipId)?.slots.spinal?.jamOn) ?? DEFAULT_SPINAL_JAM_ON;

export const manoeuvreVars = (shipId: ShipId | undefined): FactVars => {
  const tuning = evasionTuningFor(shipId);
  return {
    dodge: tuning.dodgePerValue,
    glancing: tuning.glancingPerValue,
    dodgeCap: tuning.dodgeCap,
    glancingCap: tuning.glancingCap,
    intercept: INTERCEPT_VALUE,
    interceptBonus: INTERCEPT_WEAPONS_BONUS,
  };
};

export const SYSTEM_FACTS: readonly SystemFact[] = [
  {
    id: "weaponDamage",
    section: "how",
    text: "battle:system.weapons.damage",
    slots: ["weaponA", "weaponB"],
    vars: () => ({ crit: CRIT_MULT }),
  },
  {
    id: "spinalJam",
    section: "how",
    text: "battle:system.spinal.jam",
    slots: ["spinal"],
    vars: (input) => ({
      jamOn: spinalJamOn(input.shipId),
      carry: SPINAL_JAM_CARRY,
      crit: CRIT_MULT,
    }),
  },
  {
    id: "shieldGain",
    section: "how",
    text: "battle:system.shields.gain",
    slots: ["shields", "shieldsB"],
    vars: NO_VARS,
  },
  {
    id: "shieldKeep",
    section: "how",
    text: "battle:system.shields.keep",
    slots: ["shields", "shieldsB"],
    vars: NO_VARS,
  },
  {
    id: "manoeuvre",
    section: "how",
    text: "battle:manoeuvreWhy",
    brief: "battle:manoeuvreBrief",
    slots: ["engines", "enginesB"],
    vars: (input) => manoeuvreVars(input.shipId),
  },
  {
    id: "manoeuvreFlat",
    section: "how",
    text: "battle:system.engines.flat",
    slots: ["engines", "enginesB"],
    vars: (input) => ({ n: input.evasionFlat ?? 0 }),
    when: (input) => (input.evasionFlat ?? 0) !== 0,
  },
  {
    id: "targeting",
    section: "how",
    text: "battle:targetingWhy",
    brief: "battle:targetingBrief",
    slots: ["sensors"],
    vars: (input) => ({ cap: VULNERABLE_CAP + (input.markBonus ?? 0) }),
  },
  {
    id: "reactorStore",
    section: "how",
    text: "battle:system.reactor.store",
    slots: ["reactor"],
    vars: (input) => ({
      cap: input.chargeCap ?? BASE_CHARGE_CAP,
      overflow: OVERFLOW_HULL_COST,
    }),
  },
  {
    id: "charge",
    section: "how",
    text: "battle:chargeWhy",
    slots: ["reactor"],
    vars: (input) => ({
      n: input.nudgeCost ?? nudgeChargeCost(0, false),
      reroll: BONUS_REROLL_COST,
      surge: SURGE_COST,
    }),
  },
  {
    id: "repair",
    section: "how",
    text: "battle:system.repairBay.repair",
    slots: ["repairBay"],
    vars: () => ({ divisor: REPAIR_DIVISOR }),
  },
  {
    id: "fit",
    section: "dice",
    text: "battle:system.fit",
    slots: SLOT_IDS,
    vars: NO_VARS,
  },
  {
    id: "weaponsAffinity",
    section: "dice",
    text: "battle:system.weapons.affinity",
    slots: ["weaponA", "weaponB", "spinal"],
    vars: () => bonusVars("red"),
  },
  {
    id: "shieldsAffinity",
    section: "dice",
    text: "battle:system.shields.affinity",
    slots: ["shields", "shieldsB"],
    vars: () => bonusVars("blue"),
  },
  {
    id: "enginesAffinity",
    section: "dice",
    text: "battle:system.engines.affinity",
    slots: ["engines", "enginesB"],
    vars: () => bonusVars("green"),
  },
  {
    id: "sensorsAffinity",
    section: "dice",
    text: "battle:system.sensors.affinity",
    slots: ["sensors"],
    vars: () => bonusVars("grey"),
  },
  {
    id: "reactorAffinity",
    section: "dice",
    text: "battle:system.reactor.affinity",
    slots: ["reactor"],
    vars: () => ({ mult: blackChargeMult() }),
  },
  {
    id: "mk",
    section: "improve",
    text: "battle:mkWhy",
    slots: [
      "weaponA",
      "weaponB",
      "shields",
      "shieldsB",
      "engines",
      "enginesB",
      "sensors",
    ],
    vars: NO_VARS,
  },
  {
    id: "spinalMk",
    section: "improve",
    text: "battle:system.spinal.mk",
    slots: ["spinal"],
    vars: () => ({ cap: SLOT_MK.spinal[0] }),
  },
  {
    id: "reactorMk",
    section: "improve",
    text: "battle:system.reactor.mk",
    slots: ["reactor"],
    vars: () => ({ mult: blackChargeMult() }),
  },
  {
    id: "repairMk",
    section: "improve",
    text: "battle:system.repairBay.mk",
    slots: ["repairBay"],
    vars: NO_VARS,
  },
  {
    id: "fog",
    section: "improve",
    text: "battle:system.sensors.fog",
    slots: ["sensors"],
    vars: (input) => ({ base: input.fogRows ?? BASE_FOG_ROWS, perMk: FOG_ROWS_PER_SENSORS_MK }),
  },
];

export const SYSTEM_FACT_BY_ID: ReadonlyMap<SystemFactId, SystemFact> = new Map(
  SYSTEM_FACTS.map((fact) => [fact.id, fact]),
);

export const systemFact = (id: SystemFactId): SystemFact => {
  const fact = SYSTEM_FACT_BY_ID.get(id);
  if (fact === undefined) throw new Error(`systemFact: unknown fact "${id}"`);
  return fact;
};

export const factVars = (id: SystemFactId, input: FactInput = {}): FactVars =>
  systemFact(id).vars(input);

export const factsForSlot = (
  slotId: SlotId,
  input: FactInput = {},
): readonly SystemFact[] =>
  SYSTEM_FACTS.filter(
    (fact) => fact.slots.includes(slotId) && (fact.when?.(input) ?? true),
  );

export const mkFactFor = (slotId: SlotId): SystemFact | undefined =>
  factsForSlot(slotId).find(
    (fact) => fact.section === "improve" && fact.id !== "fog",
  );

export const systemWhatKey = (slotId: SlotId): LocKey =>
  `battle:system.${slotId}.what`;
