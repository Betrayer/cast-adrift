import type { EffectDef } from "@/game/effects/types";
import type { LocKey } from "@/types/content";

export type MutatorId =
  | "brittleShields"
  | "fatLoot"
  | "fog"
  | "overheat"
  | "richVein"
  | "wilds"
  | "resonantStorm"
  | "heavyDice"
  | "glassFleet"
  | "risingTide"
  | "radioSilence"
  | "doubles";

export interface MutatorMods {
  shieldDecayPct: number;
  lootRarityStep: number;
  enemyHpPct: number;
  fogRowDelta: number;
  chargeCapDelta: number;
  scrapMultPct: number;
  noShops: boolean;
  resonanceBonus: number;
  nudgeCostDelta: number;
  damageMultPct: number;
  jumpsPerTideDelta: number;
  sensorsTierDelta: number;
  barksOff: boolean;
  enemyCopies: number;
  copyHpPct: number;
}

export interface MutatorDef {
  id: MutatorId;
  name: LocKey;
  desc: LocKey;
  mods: Partial<MutatorMods>;
  effects?: readonly EffectDef[];
}

export const ZERO_MUTATOR_MODS: MutatorMods = {
  shieldDecayPct: 0,
  lootRarityStep: 0,
  enemyHpPct: 0,
  fogRowDelta: 0,
  chargeCapDelta: 0,
  scrapMultPct: 0,
  noShops: false,
  resonanceBonus: 0,
  nudgeCostDelta: 0,
  damageMultPct: 0,
  jumpsPerTideDelta: 0,
  sensorsTierDelta: 0,
  barksOff: false,
  enemyCopies: 0,
  copyHpPct: 0,
};

export const MUTATORS: readonly MutatorDef[] = [
  {
    id: "brittleShields",
    name: "content:mutators.brittleShields.name",
    desc: "content:mutators.brittleShields.desc",
    mods: { shieldDecayPct: 50 },
  },
  {
    id: "fatLoot",
    name: "content:mutators.fatLoot.name",
    desc: "content:mutators.fatLoot.desc",
    mods: { lootRarityStep: 1, enemyHpPct: 15 },
  },
  {
    id: "fog",
    name: "content:mutators.fog.name",
    desc: "content:mutators.fog.desc",
    mods: { fogRowDelta: -1 },
  },
  {
    id: "overheat",
    name: "content:mutators.overheat.name",
    desc: "content:mutators.overheat.desc",
    mods: { chargeCapDelta: -2 },
  },
  {
    id: "richVein",
    name: "content:mutators.richVein.name",
    desc: "content:mutators.richVein.desc",
    mods: { scrapMultPct: 50 },
  },
  {
    id: "wilds",
    name: "content:mutators.wilds.name",
    desc: "content:mutators.wilds.desc",
    mods: { noShops: true },
  },
  {
    id: "resonantStorm",
    name: "content:mutators.resonantStorm.name",
    desc: "content:mutators.resonantStorm.desc",
    mods: { resonanceBonus: 2 },
  },
  {
    id: "heavyDice",
    name: "content:mutators.heavyDice.name",
    desc: "content:mutators.heavyDice.desc",
    mods: { nudgeCostDelta: 2 },
  },
  {
    id: "glassFleet",
    name: "content:mutators.glassFleet.name",
    desc: "content:mutators.glassFleet.desc",
    mods: { damageMultPct: 50 },
  },
  {
    id: "risingTide",
    name: "content:mutators.risingTide.name",
    desc: "content:mutators.risingTide.desc",
    mods: { jumpsPerTideDelta: -1 },
  },
  {
    id: "radioSilence",
    name: "content:mutators.radioSilence.name",
    desc: "content:mutators.radioSilence.desc",
    mods: { sensorsTierDelta: -1, barksOff: true },
  },
  {
    id: "doubles",
    name: "content:mutators.doubles.name",
    desc: "content:mutators.doubles.desc",
    mods: { enemyCopies: 1, copyHpPct: -30 },
  },
];

export const MUTATOR_BY_ID: ReadonlyMap<string, MutatorDef> = new Map(
  MUTATORS.map((def) => [def.id, def]),
);

export const isMutatorId = (id: string): id is MutatorId =>
  MUTATOR_BY_ID.has(id);

const NUMERIC_KEYS = [
  "shieldDecayPct",
  "lootRarityStep",
  "enemyHpPct",
  "fogRowDelta",
  "chargeCapDelta",
  "scrapMultPct",
  "resonanceBonus",
  "nudgeCostDelta",
  "damageMultPct",
  "jumpsPerTideDelta",
  "sensorsTierDelta",
  "enemyCopies",
  "copyHpPct",
] as const;

// Numbers add, booleans OR — the same aggregation shape as ascension mods, so a
// daily's two mutators and a contract's forced set stack without special cases.
export const computeMutatorMods = (
  ids: readonly string[],
): MutatorMods => {
  const out: MutatorMods = { ...ZERO_MUTATOR_MODS };
  for (const id of ids) {
    const def = MUTATOR_BY_ID.get(id);
    if (def === undefined) continue;
    for (const key of NUMERIC_KEYS) out[key] += def.mods[key] ?? 0;
    out.noShops = out.noShops || def.mods.noShops === true;
    out.barksOff = out.barksOff || def.mods.barksOff === true;
  }
  out.shieldDecayPct = Math.max(0, Math.min(100, out.shieldDecayPct));
  return out;
};

export const DAILY_MUTATOR_COUNT = 2;

// Two distinct mutators per day, drawn from a stream the client cannot influence.
export const pickDailyMutators = (
  pick: (max: number) => number,
): MutatorId[] => {
  const pool = MUTATORS.map((m) => m.id);
  const chosen: MutatorId[] = [];
  for (let i = 0; i < DAILY_MUTATOR_COUNT && pool.length > 0; i += 1) {
    const index = Math.min(pool.length - 1, Math.max(0, pick(pool.length)));
    const [taken] = pool.splice(index, 1);
    if (taken !== undefined) chosen.push(taken);
  }
  return chosen;
};
