import { DIE_BY_ID } from "@/data/dice/basic";
import { ENEMY_BY_ID } from "@/data/enemies/sector1";
import type { RngStreams } from "@/services/rng";
import type { EnemyState, RolledDie, SlotId, SlotState } from "@/types/battle";

export const WANDERER_HULL_MAX = 30;

export const buildWandererSlots = (): Partial<Record<SlotId, SlotState>> => ({
  weaponA: { cap: 8, mk: 1 },
  shields: { cap: 8, mk: 1 },
  reactor: { cap: 10, mk: 1 },
});

export const rollDeck = (
  deckDefIds: readonly string[],
  streams: RngStreams,
): RolledDie[] =>
  deckDefIds.map((defId, index) => {
    const def = DIE_BY_ID.get(defId);
    if (def === undefined)
      throw new Error(`rollDeck: unknown die def "${defId}"`);
    return {
      uid: `die-${String(index)}`,
      defId,
      tier: def.tier,
      school: def.school,
      value: streams.dice.int(1, def.tier),
      state: "tray",
    };
  });

export const buildEnemies = (enemyIds: readonly string[]): EnemyState[] =>
  enemyIds.map((defId, index) => {
    const def = ENEMY_BY_ID.get(defId);
    if (def === undefined)
      throw new Error(`buildEnemies: unknown enemy "${defId}"`);
    return {
      id: `enemy-${String(index)}`,
      defId,
      hp: def.hp,
      hpMax: def.hp,
      shield: 0,
      intentIndex: 0,
    };
  });

export const currentIntentOf = (enemy: EnemyState) => {
  const def = ENEMY_BY_ID.get(enemy.defId);
  if (def === undefined)
    throw new Error(`currentIntentOf: unknown enemy "${enemy.defId}"`);
  const intent = def.pattern[enemy.intentIndex % def.pattern.length];
  if (intent === undefined)
    throw new Error(`currentIntentOf: "${enemy.defId}" empty pattern`);
  return intent;
};
