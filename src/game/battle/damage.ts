import { ENEMY_BY_ID } from "@/data/enemies";
import { applyStatus, consumeStatus } from "@/game/battle/statuses";
import type {
  BattleSnapshot,
  EnemyState,
  SubsystemState,
} from "@/types/battle";
import type { School } from "@/types/content";

export const aliveEnemies = (snapshot: BattleSnapshot): EnemyState[] =>
  snapshot.enemies.filter((e) => e.hp > 0);

const aliveSubsystems = (enemy: EnemyState): SubsystemState[] =>
  enemy.subsystems.filter((s) => s.hp > 0);

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
  const onDeath = ENEMY_BY_ID.get(enemy.defId)?.onDeath;
  if (onDeath === undefined) return;
  switch (onDeath.t) {
    case "blockSlot":
      next.blockedSlots.push({ slot: onDeath.slot, untilTurn: next.turn + 1 });
      return;
    case "explode": {
      const absorbed = Math.min(next.shield, onDeath.n);
      next.shield -= absorbed;
      next.hull = Math.max(0, next.hull - (onDeath.n - absorbed));
      return;
    }
    case "healAllies":
      for (const ally of aliveEnemies(next)) {
        if (ally.id === enemy.id) continue;
        ally.hp = Math.min(ally.hpMax, ally.hp + onDeath.n);
      }
      return;
    case "shieldAllies":
      for (const ally of aliveEnemies(next)) {
        if (ally.id === enemy.id) continue;
        ally.shield += onDeath.n;
      }
      return;
    case "chargeAllies":
      for (const ally of aliveEnemies(next)) {
        if (ally.id === enemy.id) continue;
        applyStatus(ally.statuses, "charge");
      }
      return;
    case "stealScrap": {
      const fromBattle = Math.min(next.scrap, onDeath.n);
      next.scrap -= fromBattle;
      next.stolenScrap += onDeath.n - fromBattle;
      return;
    }
    case "curseDie": {
      const tray = next.dice.filter((d) => d.state === "tray");
      const worst = tray.reduce<(typeof tray)[number] | undefined>(
        (best, die) => (best === undefined || die.value > best.value ? die : best),
        undefined,
      );
      if (worst === undefined) return;
      next.cursedDice = [
        ...(next.cursedDice ?? []),
        { uid: worst.uid, n: onDeath.n, untilTurn: next.turn + 2 },
      ];
      return;
    }
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
  pierce = false,
  school?: School,
): number => {
  const def = ENEMY_BY_ID.get(target.enemy.defId);
  let damage = baseDamage;
  if (def?.ward === true && school !== undefined && target.enemy.ward === school) {
    damage = Math.ceil(damage / 2);
  }
  if (target.subsystem !== undefined) {
    if (def?.alternating === true && target.enemy.lastHitKey === target.subsystem.key) {
      return 0;
    }
    if (crit) damage = Math.floor(damage * 1.5);
    if (def?.alternating === true) target.enemy.lastHitKey = target.subsystem.key;
    target.subsystem.hp = Math.max(0, target.subsystem.hp - damage);
    if (target.subsystem.hp === 0) retargetAfterKill(next, target.enemy, true);
    return damage;
  }
  if (isBodyImmune(next, target.enemy)) return 0;
  const bonus = def?.markVulnerable === true ? markBonus * 2 : markBonus;
  const marked = consumeStatus(target.enemy.statuses, "mark");
  if (marked) damage += bonus;
  if (crit) damage = Math.floor(damage * 1.5);
  const gate = target.enemy.gate ?? 0;
  if (gate > 0 && !marked) {
    if (damage < gate) return 0;
    target.enemy.gate = 0;
  }
  if (def?.spikeCap !== undefined) damage = Math.min(damage, def.spikeCap);
  const absorbed = pierce ? 0 : Math.min(target.enemy.shield, damage);
  target.enemy.shield -= absorbed;
  target.enemy.hp = Math.max(0, target.enemy.hp - (damage - absorbed));
  if (target.enemy.hp === 0) {
    for (const sub of target.enemy.subsystems) sub.hp = 0;
    handleDeath(next, target.enemy);
    retargetAfterKill(next, target.enemy, false);
  }
  return damage;
};
