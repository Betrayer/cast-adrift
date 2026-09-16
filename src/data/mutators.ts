import type { EffectDef } from "@/game/effects/types";
import { WEATHER_BY_ID } from "@/data/weather";
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

const mutator = (
  id: MutatorId,
  body: Omit<MutatorDef, "id" | "name" | "desc">,
): MutatorDef => ({
  id,
  name: `content:mutators.${id}.name`,
  desc: `content:mutators.${id}.desc`,
  ...body,
});

export const MUTATORS: readonly MutatorDef[] = [
  mutator("brittleShields", { mods: { shieldDecayPct: 50 } }),
  mutator("fatLoot", { mods: { lootRarityStep: 1, enemyHpPct: 15 } }),
  mutator("fog", { mods: { fogRowDelta: -1 } }),
  mutator("overheat", { mods: { chargeCapDelta: -2 } }),
  mutator("richVein", { mods: { scrapMultPct: 50 } }),
  mutator("wilds", { mods: { noShops: true } }),
  mutator("resonantStorm", { mods: { resonanceBonus: 2 } }),
  mutator("heavyDice", { mods: { nudgeCostDelta: 2 } }),
  mutator("glassFleet", { mods: { damageMultPct: 50 } }),
  mutator("risingTide", { mods: { jumpsPerTideDelta: -1 } }),
  mutator("radioSilence", { mods: { sensorsTierDelta: -1, barksOff: true } }),
  mutator("doubles", { mods: { enemyCopies: 1, copyHpPct: -30 } }),
];

export const MUTATOR_BY_ID: ReadonlyMap<string, MutatorDef> = new Map(
  MUTATORS.map((def) => [def.id, def]),
);

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

const modsById = (id: string): Partial<MutatorMods> | undefined =>
  MUTATOR_BY_ID.get(id)?.mods ?? WEATHER_BY_ID.get(id)?.mods;

export const computeMutatorMods = (
  ids: readonly string[],
): MutatorMods => {
  const out: MutatorMods = { ...ZERO_MUTATOR_MODS };
  for (const id of ids) {
    const def = modsById(id);
    if (def === undefined) continue;
    for (const key of NUMERIC_KEYS) out[key] += def[key] ?? 0;
    out.noShops = out.noShops || def.noShops === true;
    out.barksOff = out.barksOff || def.barksOff === true;
  }
  out.shieldDecayPct = Math.max(0, Math.min(100, out.shieldDecayPct));
  return out;
};

export const DAILY_MUTATOR_COUNT = 2;

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
