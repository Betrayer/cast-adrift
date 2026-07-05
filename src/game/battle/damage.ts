import { ENEMY_BY_ID } from "@/data/enemies/sector1";
import { consumeStatus } from "@/game/battle/statuses";
import type {
  BattleSnapshot,
  EnemyState,
  SubsystemState,
} from "@/types/battle";

export const aliveEnemies = (snapshot: BattleSnapshot): EnemyState[] =>
  snapshot.enemies.filter((e) => e.hp > 0);

export const handleDeath = (next: BattleSnapshot, enemy: EnemyState): void => {
  const def = ENEMY_BY_ID.get(enemy.defId);
  if (def?.onDeath?.t === "blockSlot") {
    next.blockedSlots.push({
      slot: def.onDeath.slot,
      untilTurn: next.turn + 1,
    });
  }
};

const retargetAfterKill = (
  next: BattleSnapshot,
  parent: EnemyState,
  killedSubsystem: boolean,
): void => {
  if (killedSubsystem && parent.hp > 0) {
    next.targetId = parent.id;
    return;
  }
  next.targetId = aliveEnemies(next)[0]?.id ?? null;
};

export interface WeaponTarget {
  enemy: EnemyState;
  subsystem?: SubsystemState;
}

export const resolveWeaponTarget = (
  next: BattleSnapshot,
): WeaponTarget | undefined => {
  if (next.targetId !== null) {
    for (const enemy of aliveEnemies(next)) {
      const subsystem = enemy.subsystems.find(
        (s) => s.id === next.targetId && s.hp > 0,
      );
      if (subsystem !== undefined) return { enemy, subsystem };
    }
    const enemy = next.enemies.find((e) => e.id === next.targetId && e.hp > 0);
    if (enemy !== undefined) return { enemy };
  }
  const fallback = aliveEnemies(next)[0];
  if (fallback === undefined) return undefined;
  next.targetId = fallback.id;
  return { enemy: fallback };
};

export const applyWeaponDamage = (
  next: BattleSnapshot,
  target: WeaponTarget,
  baseDamage: number,
  crit = false,
): number => {
  let damage = baseDamage;
  if (target.subsystem !== undefined) {
    if (crit) damage = Math.floor(damage * 1.5);
    target.subsystem.hp = Math.max(0, target.subsystem.hp - damage);
    if (target.subsystem.hp === 0) retargetAfterKill(next, target.enemy, true);
    return damage;
  }
  if (consumeStatus(target.enemy.statuses, "mark")) damage += 2;
  if (crit) damage = Math.floor(damage * 1.5);
  const absorbed = Math.min(target.enemy.shield, damage);
  target.enemy.shield -= absorbed;
  target.enemy.hp = Math.max(0, target.enemy.hp - (damage - absorbed));
  if (target.enemy.hp === 0) {
    for (const sub of target.enemy.subsystems) sub.hp = 0;
    handleDeath(next, target.enemy);
    retargetAfterKill(next, target.enemy, false);
  }
  return damage;
};
