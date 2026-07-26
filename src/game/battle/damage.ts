import { ENEMY_BY_ID } from "@/data/enemies";
import { consumeStatus } from "@/game/battle/statuses";
import type {
  BattleSnapshot,
  EnemyState,
  SubsystemState,
} from "@/types/battle";

export const aliveEnemies = (snapshot: BattleSnapshot): EnemyState[] =>
  snapshot.enemies.filter((e) => e.hp > 0);

const aliveSubsystems = (enemy: EnemyState): SubsystemState[] =>
  enemy.subsystems.filter((s) => s.hp > 0);

// Two data-driven immunities (Phase-8 amendment 5): `shell` keeps the body safe
// while its own subsystems live; `guarded` keeps it safe while any other enemy
// lives (kill-order fights).
export const isBodyImmune = (
  snapshot: BattleSnapshot,
  enemy: EnemyState,
): boolean => {
  const def = ENEMY_BY_ID.get(enemy.defId);
  if (def === undefined) return false;
  if (def.shell === true && aliveSubsystems(enemy).length > 0) return true;
  return (
    def.guarded === true &&
    aliveEnemies(snapshot).some((e) => e.id !== enemy.id)
  );
};

export const handleDeath = (next: BattleSnapshot, enemy: EnemyState): void => {
  const def = ENEMY_BY_ID.get(enemy.defId);
  if (def?.onDeath?.t === "blockSlot") {
    next.blockedSlots.push({
      slot: def.onDeath.slot,
      untilTurn: next.turn + 1,
    });
    return;
  }
  if (def?.onDeath?.t === "explode") {
    const damage = def.onDeath.n;
    const absorbed = Math.min(next.shield, damage);
    next.shield -= absorbed;
    next.hull = Math.max(0, next.hull - (damage - absorbed));
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
  markBonus = 2,
): number => {
  let damage = baseDamage;
  if (target.subsystem !== undefined) {
    if (crit) damage = Math.floor(damage * 1.5);
    target.subsystem.hp = Math.max(0, target.subsystem.hp - damage);
    if (target.subsystem.hp === 0) retargetAfterKill(next, target.enemy, true);
    return damage;
  }
  if (isBodyImmune(next, target.enemy)) return 0;
  const def = ENEMY_BY_ID.get(target.enemy.defId);
  const bonus = def?.markVulnerable === true ? markBonus * 2 : markBonus;
  if (consumeStatus(target.enemy.statuses, "mark")) damage += bonus;
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
