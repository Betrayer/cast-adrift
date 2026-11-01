import { ENEMY_BY_ID } from "@/data/enemies";
import type { ResolutionBundle, ResonanceCensus } from "@/types/battle";

export interface TurnTally {
  shieldAbsorbed: number;
  damageDealt: number;
  damageTaken: number;
  repairBayHealed: number;
  spinalMaxHit: number;
  burnKilledElite: boolean;
}

export const tallyBundle = (bundle: ResolutionBundle): TurnTally => {
  let shieldAbsorbed = 0;
  let damageDealt = 0;
  let damageTaken = 0;
  let repairBayHealed = 0;
  let spinalMaxHit = 0;
  let burnKilledElite = false;

  for (const beat of bundle.beats) {
    if (beat.kind === "damage") damageDealt += beat.amount;
    if (beat.slot === "spinal" && beat.kind === "damage") {
      spinalMaxHit = Math.max(spinalMaxHit, beat.amount);
    }
    if (beat.slot === "repairBay" && beat.kind === "repair") {
      repairBayHealed += beat.amount;
    }
  }
  for (const beat of bundle.enemyBeats) {
    shieldAbsorbed += beat.shieldDamage;
    damageTaken += beat.hullDamage;
    if (beat.kind !== "burnTick") continue;
    const enemy = beat.after.enemies.find((e) => e.id === beat.enemyId);
    if (enemy === undefined || enemy.hp > 0) continue;
    const def = ENEMY_BY_ID.get(enemy.defId);
    if (def?.elite === true || def?.miniboss === true || def?.boss === true) {
      burnKilledElite = true;
    }
  }
  return {
    shieldAbsorbed,
    damageDealt,
    damageTaken,
    repairBayHealed,
    spinalMaxHit,
    burnKilledElite,
  };
};

export const largestResonance = (census: ResonanceCensus): number =>
  Math.max(0, ...Object.values(census.counts));
