import { A6_ELITE_SUBSYSTEM } from "@/data/ascension";
import { ENEMY_BY_ID } from "@/data/enemies";
import { applyStatus, markMagnitude } from "@/game/battle/statuses";
import type {
  BattleSnapshot,
  EnemyState,
  SubsystemState,
} from "@/types/battle";
import type {
  EnemyDef,
  PartDeathEffect,
  School,
  SubsystemDef,
} from "@/types/content";

export const aliveEnemies = (snapshot: BattleSnapshot): EnemyState[] =>
  snapshot.enemies.filter((e) => e.hp > 0);

const aliveSubsystems = (enemy: EnemyState): SubsystemState[] =>
  enemy.subsystems.filter((s) => s.hp > 0);

export const partDefOf = (
  def: EnemyDef,
  part: SubsystemState,
): SubsystemDef | undefined =>
  (def.subsystems ?? []).find((s) => s.id === part.key) ??
  (part.key === A6_ELITE_SUBSYSTEM.id ? A6_ELITE_SUBSYSTEM : undefined);

export const aliveCoreParts = (enemy: EnemyState): number =>
  aliveSubsystems(enemy).length;

export const coreLocked = (
  snapshot: BattleSnapshot,
  enemy: EnemyState,
): boolean => {
  const def = ENEMY_BY_ID.get(enemy.defId);
  if (def === undefined || def.shell !== true) return false;
  if (snapshot.turn <= (enemy.coreOpenUntilTurn ?? 0)) return false;
  return aliveCoreParts(enemy) > (def.coreLockAt ?? 0);
};

export const isBodyImmune = (
  snapshot: BattleSnapshot,
  enemy: EnemyState,
): boolean => {
  const def = ENEMY_BY_ID.get(enemy.defId);
  if (def === undefined) return false;
  if (coreLocked(snapshot, enemy)) return true;
  return (
    def.guarded === true &&
    aliveEnemies(snapshot).some((e) => e.id !== enemy.id)
  );
};

export const silencePartsOnBodyDeath = (enemy: EnemyState): void => {
  for (const part of enemy.subsystems) {
    part.hp = 0;
    delete part.nextIntent;
  }
};

const bleedPlayer = (next: BattleSnapshot, n: number): void => {
  const absorbed = Math.min(next.shield, n);
  next.shield -= absorbed;
  next.hull = Math.max(0, next.hull - (n - absorbed));
};

export const handlePartDeath = (
  next: BattleSnapshot,
  enemy: EnemyState,
  part: SubsystemState,
): void => {
  next.partsDowned = [...(next.partsDowned ?? []), part.id];
  delete part.nextIntent;
  const def = ENEMY_BY_ID.get(enemy.defId);
  const onDeath = def === undefined ? undefined : partDefOf(def, part)?.onDeath;
  if (onDeath === undefined) return;
  switch (onDeath.t) {
    case "explodePart":
      bleedPlayer(next, onDeath.n);
      return;
    case "enrageCore":
      enemy.rage = (enemy.rage ?? 0) + onDeath.n;
      return;
    case "openCore":
      enemy.coreOpenUntilTurn = next.turn + onDeath.turns - 1;
      return;
    case "shieldCore":
      enemy.shield += onDeath.n;
      return;
    case "spawnAdds":
      next.pendingAdds = [...(next.pendingAdds ?? []), onDeath.id];
      return;
  }
};

export const applyJam = (next: BattleSnapshot, enemy: EnemyState): void => {
  applyStatus(enemy.statuses, "jam");
  const def = ENEMY_BY_ID.get(enemy.defId);
  if (def?.jamReleasesBlocks === true) next.blockedSlots = [];
  if (def?.jamClearsRage === true) enemy.rage = 0;
};

const otherAlive = (
  next: BattleSnapshot,
  enemy: EnemyState,
): EnemyState[] => aliveEnemies(next).filter((ally) => ally.id !== enemy.id);

export const handleDeath = (next: BattleSnapshot, enemy: EnemyState): void => {
  const onDeath = ENEMY_BY_ID.get(enemy.defId)?.onDeath;
  if (onDeath === undefined) return;
  switch (onDeath.t) {
    case "blockSlot":
      next.blockedSlots.push({ slot: onDeath.slot, untilTurn: next.turn + 1 });
      return;
    case "explode":
      bleedPlayer(next, onDeath.n);
      return;
    case "healAllies":
      for (const ally of otherAlive(next, enemy))
        ally.hp = Math.min(ally.hpMax, ally.hp + onDeath.n);
      return;
    case "shieldAllies":
      for (const ally of otherAlive(next, enemy)) ally.shield += onDeath.n;
      return;
    case "chargeAllies":
      for (const ally of otherAlive(next, enemy))
        applyStatus(ally.statuses, "charge");
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

const BACKFIRING_DEATHS: ReadonlySet<PartDeathEffect["t"]> = new Set([
  "explodePart",
  "enrageCore",
  "spawnAdds",
]);

const partBackfires = (enemy: EnemyState, part: SubsystemState): boolean => {
  const def = ENEMY_BY_ID.get(enemy.defId);
  const onDeath = def === undefined ? undefined : partDefOf(def, part)?.onDeath;
  return onDeath !== undefined && BACKFIRING_DEATHS.has(onDeath.t);
};

const lockedOutByAlternating = (
  enemy: EnemyState,
  part: SubsystemState,
): boolean =>
  ENEMY_BY_ID.get(enemy.defId)?.alternating === true &&
  enemy.lastHitKey === part.key &&
  aliveSubsystems(enemy).length > 1;

export const preferredPart = (
  enemy: EnemyState,
): SubsystemState | undefined => {
  const reachable = aliveSubsystems(enemy).filter(
    (part) => !lockedOutByAlternating(enemy, part),
  );
  const pool = reachable.length > 0 ? reachable : aliveSubsystems(enemy);
  const quiet = pool.filter((part) => !partBackfires(enemy, part));
  const choose = quiet.length > 0 ? quiet : pool;
  return [...choose].sort((a, b) => a.hp - b.hp)[0];
};

export const reaimOffLockedCore = (next: BattleSnapshot): void => {
  if (next.targetId === null) return;
  const owner = next.targetId.split(":")[0] ?? next.targetId;
  const alive = next.enemies.find((e) => e.id === owner)?.hp ?? 0;
  if (alive <= 0) next.targetId = aliveEnemies(next)[0]?.id ?? null;
  if (next.targetId === null) return;
  const body = next.enemies.find((e) => e.id === next.targetId);
  if (body === undefined) return;
  if (coreLocked(next, body)) {
    const survivor = preferredPart(body);
    if (survivor !== undefined) next.targetId = survivor.id;
    return;
  }
  if (!isBodyImmune(next, body)) return;
  const reachable = aliveEnemies(next).find((e) => !isBodyImmune(next, e));
  if (reachable !== undefined) next.targetId = reachable.id;
};

const retargetAfterKill = (
  next: BattleSnapshot,
  parent: EnemyState,
  killedSubsystem: boolean,
): void => {
  if (killedSubsystem && parent.hp > 0) {
    const survivor = coreLocked(next, parent)
      ? preferredPart(parent)
      : undefined;
    next.targetId = survivor?.id ?? parent.id;
    return;
  }
  next.targetId = aliveEnemies(next)[0]?.id ?? null;
  reaimOffLockedCore(next);
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

export const scatterTargets = (next: BattleSnapshot): EnemyState[] => {
  const chosen = resolveWeaponTarget(next);
  const alive = aliveEnemies(next);
  if (chosen === undefined) return alive;
  const headId = chosen.enemy.id;
  return [
    ...alive.filter((e) => e.id === headId),
    ...alive.filter((e) => e.id !== headId),
  ];
};

export const stripShield = (enemy: EnemyState, n: number): number => {
  const stripped = Math.max(0, Math.min(n, enemy.shield));
  enemy.shield -= stripped;
  return stripped;
};

export const applyWeaponDamage = (
  next: BattleSnapshot,
  target: WeaponTarget,
  baseDamage: number,
  crit = false,
  pierce = false,
  school?: School,
): number => {
  const def = ENEMY_BY_ID.get(target.enemy.defId);
  let damage = baseDamage;
  if (def?.ward === true && school !== undefined && target.enemy.ward === school) {
    damage = Math.ceil(damage / 2);
  }
  if (target.subsystem !== undefined) {
    if (lockedOutByAlternating(target.enemy, target.subsystem)) return 0;
    if (crit) damage = Math.floor(damage * 1.5);
    if (def?.alternating === true) target.enemy.lastHitKey = target.subsystem.key;
    const partAlive = target.subsystem.hp > 0;
    target.subsystem.hp = Math.max(0, target.subsystem.hp - damage);
    if (partAlive && target.subsystem.hp === 0) {
      handlePartDeath(next, target.enemy, target.subsystem);
      retargetAfterKill(next, target.enemy, true);
    }
    return damage;
  }
  if (isBodyImmune(next, target.enemy)) return 0;
  const vulnerable = markMagnitude(target.enemy.statuses);
  const marked = vulnerable > 0;
  if (marked) {
    damage += def?.markVulnerable === true ? vulnerable * 2 : vulnerable;
  }
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
    silencePartsOnBodyDeath(target.enemy);
    handleDeath(next, target.enemy);
    retargetAfterKill(next, target.enemy, false);
  }
  return damage;
};
