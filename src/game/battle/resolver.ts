import { ENEMY_BY_ID } from "@/data/enemies/sector1";
import {
  drawIntent,
  isDieLocked,
  isSlotBlocked,
  MAX_ENEMIES,
  spawnEnemy,
} from "@/game/battle/setup";
import {
  applyStatus,
  consumeStatus,
  tickBurn,
} from "@/game/battle/statuses";
import type { RngStream, RngStreams } from "@/services/rng";
import type {
  BattleSnapshot,
  Beat,
  EnemyBeat,
  EnemyState,
  EngineTier,
  SlotId,
  SubsystemState,
} from "@/types/battle";

export const RESOLUTION_ORDER: readonly SlotId[] = [
  "sensors",
  "weaponA",
  "weaponB",
  "spinal",
  "shields",
  "engines",
  "reactor",
];

export const CHARGE_CAP = 10;
export const OVERFLOW_HULL_COST = 2;
export const NUDGE_COST = 3;
export const BONUS_REROLL_COST = 5;
export const SURGE_COST = 10;
export const BASE_REROLL_SIZE = 2;

const clone = (snapshot: BattleSnapshot): BattleSnapshot =>
  structuredClone(snapshot);

export const engineTier = (value: number): EngineTier => {
  if (value <= 3) return "brace";
  if (value <= 6) return "dodge";
  return "dodgePlus";
};

const aliveEnemies = (snapshot: BattleSnapshot): EnemyState[] =>
  snapshot.enemies.filter((e) => e.hp > 0);

const hasAliveAura = (
  enemy: EnemyState,
  aura: SubsystemState["aura"],
): boolean => enemy.subsystems.some((s) => s.hp > 0 && s.aura === aura);

const handleDeath = (next: BattleSnapshot, enemy: EnemyState): void => {
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

interface WeaponTarget {
  enemy: EnemyState;
  subsystem?: SubsystemState;
}

const resolveWeaponTarget = (
  next: BattleSnapshot,
): WeaponTarget | undefined => {
  if (next.targetId !== null) {
    for (const enemy of aliveEnemies(next)) {
      const subsystem = enemy.subsystems.find(
        (s) => s.id === next.targetId && s.hp > 0,
      );
      if (subsystem !== undefined) return { enemy, subsystem };
    }
    const enemy = next.enemies.find(
      (e) => e.id === next.targetId && e.hp > 0,
    );
    if (enemy !== undefined) return { enemy };
  }
  const fallback = aliveEnemies(next)[0];
  if (fallback === undefined) return undefined;
  next.targetId = fallback.id;
  return { enemy: fallback };
};

const applyWeaponDamage = (
  next: BattleSnapshot,
  target: WeaponTarget,
  baseDamage: number,
): number => {
  let damage = baseDamage;
  if (target.subsystem !== undefined) {
    target.subsystem.hp = Math.max(0, target.subsystem.hp - damage);
    if (target.subsystem.hp === 0) retargetAfterKill(next, target.enemy, true);
    return damage;
  }
  if (consumeStatus(target.enemy.statuses, "mark")) damage += 2;
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

export const resolvePlayerPhase = (
  snapshot: BattleSnapshot,
): { next: BattleSnapshot; beats: Beat[] } => {
  const next = clone(snapshot);
  const beats: Beat[] = [];
  const mods = next.nextTurnMods;
  next.nextTurnMods = {};
  for (const slotId of RESOLUTION_ORDER) {
    const slot = next.slots[slotId];
    if (slot?.dieUid === undefined) continue;
    const die = next.dice.find((d) => d.uid === slot.dieUid);
    if (die === undefined) continue;

    if (slotId === "sensors") {
      const target =
        next.enemies.find((e) => e.id === next.targetId && e.hp > 0) ??
        aliveEnemies(next)[0];
      if (target === undefined) continue;
      applyStatus(target.statuses, "mark");
      const jam = die.value >= 4;
      if (jam) applyStatus(target.statuses, "jam");
      const deepScan = die.value >= 7;
      if (deepScan) next.pendingDeepScan = true;
      beats.push({
        slot: slotId,
        kind: "sensor",
        amount: die.value,
        targetId: target.id,
        sensor: { mark: true, jam, deepScan },
        after: clone(next),
      });
    } else if (slotId === "weaponA" || slotId === "weaponB") {
      const target = resolveWeaponTarget(next);
      if (target === undefined) continue;
      const targetId = (target.subsystem ?? target.enemy).id;
      const dealt = applyWeaponDamage(
        next,
        target,
        die.value + (mods.weapons ?? 0),
      );
      beats.push({
        slot: slotId,
        kind: "damage",
        amount: dealt,
        targetId,
        after: clone(next),
      });
    } else if (slotId === "spinal") {
      if (die.value <= (slot.jamOn ?? 4)) {
        next.nextTurnMods.spinal = (mods.spinal ?? 0) + 2;
        beats.push({
          slot: slotId,
          kind: "spinalJam",
          amount: 0,
          after: clone(next),
        });
      } else {
        const target = resolveWeaponTarget(next);
        if (target === undefined) continue;
        const targetId = (target.subsystem ?? target.enemy).id;
        const dealt = applyWeaponDamage(
          next,
          target,
          die.value + (mods.spinal ?? 0),
        );
        beats.push({
          slot: slotId,
          kind: "damage",
          amount: dealt,
          targetId,
          after: clone(next),
        });
      }
    } else if (slotId === "shields") {
      next.shield += die.value;
      beats.push({
        slot: slotId,
        kind: "shield",
        amount: die.value,
        after: clone(next),
      });
    } else if (slotId === "engines") {
      const tier = engineTier(die.value);
      next.engineState = tier;
      if (tier === "dodgePlus") {
        next.nextTurnMods.weapons = (next.nextTurnMods.weapons ?? 0) + 2;
      }
      beats.push({
        slot: slotId,
        kind: "engine",
        amount: die.value,
        engineTier: tier,
        after: clone(next),
      });
    } else if (slotId === "reactor") {
      next.charge += die.value;
      let overflow = 0;
      if (next.charge > CHARGE_CAP) {
        next.charge = CHARGE_CAP;
        overflow = OVERFLOW_HULL_COST;
        next.hull = Math.max(0, next.hull - OVERFLOW_HULL_COST);
      }
      beats.push({
        slot: slotId,
        kind: "charge",
        amount: die.value,
        overflowHull: overflow > 0 ? overflow : undefined,
        after: clone(next),
      });
    }
  }
  if (next.hull <= 0) next.outcome = "defeat";
  else if (aliveEnemies(next).length === 0) next.outcome = "victory";
  return { next, beats };
};

interface AttackContext {
  dodgeSpent: boolean;
}

const applyAttack = (
  next: BattleSnapshot,
  enemy: EnemyState,
  perHit: number,
  hits: number,
  context: AttackContext,
): { dealt: number; hullDamage: number; shieldDamage: number } => {
  const aura = hasAliveAura(enemy, "atk+2") ? 2 : 0;
  const chargeMult = consumeStatus(enemy.statuses, "charge") ? 2 : 1;
  const jamPenalty = consumeStatus(enemy.statuses, "jam") ? 2 : 0;
  const brace = next.engineState === "brace" ? 1 : 0;
  const dodges =
    next.engineState === "dodge" || next.engineState === "dodgePlus";
  let dealt = 0;
  let hullDamage = 0;
  let shieldDamage = 0;
  for (let i = 0; i < hits; i += 1) {
    let damage = Math.max(
      0,
      (perHit + aura) * chargeMult - (i === 0 ? jamPenalty : 0),
    );
    if (dodges && !context.dodgeSpent) {
      context.dodgeSpent = true;
      continue;
    }
    damage = Math.max(0, damage - brace);
    const absorbed = Math.min(next.shield, damage);
    next.shield -= absorbed;
    const toHull = damage - absorbed;
    next.hull = Math.max(0, next.hull - toHull);
    dealt += damage;
    hullDamage += toHull;
    shieldDamage += absorbed;
  }
  return { dealt, hullDamage, shieldDamage };
};

const lockRandomTrayDie = (
  next: BattleSnapshot,
  enemyStream: RngStream,
): string | undefined => {
  const candidates = next.dice.filter(
    (d) => d.state === "tray" && !isDieLocked(next, d.uid),
  );
  if (candidates.length === 0) return undefined;
  const die = enemyStream.pick(candidates);
  next.lockedDice.push({ uid: die.uid, untilTurn: next.turn + 1 });
  return die.uid;
};

export const resolveEnemyPhase = (
  snapshot: BattleSnapshot,
  enemyStream: RngStream,
): { next: BattleSnapshot; beats: EnemyBeat[] } => {
  const next = clone(snapshot);
  const beats: EnemyBeat[] = [];
  const context: AttackContext = { dodgeSpent: false };

  for (const enemy of aliveEnemies(next)) {
    if (hasAliveAura(enemy, "shieldAllies3")) {
      for (const ally of aliveEnemies(next)) ally.shield += 3;
      beats.push({
        enemyId: enemy.id,
        kind: "shieldAll",
        amount: 3,
        hullDamage: 0,
        shieldDamage: 0,
        after: clone(next),
      });
    }
    if (hasAliveAura(enemy, "lockEachTurn")) {
      const uid = lockRandomTrayDie(next, enemyStream);
      if (uid !== undefined) {
        beats.push({
          enemyId: enemy.id,
          kind: "lockDie",
          amount: 0,
          hullDamage: 0,
          shieldDamage: 0,
          dieUid: uid,
          after: clone(next),
        });
      }
    }
  }

  for (const enemy of next.enemies) {
    if (enemy.hp <= 0) continue;
    const def = ENEMY_BY_ID.get(enemy.defId);
    if (def === undefined) continue;
    const intent = enemy.nextIntent;

    if (intent.t === "attack" || intent.t === "multi") {
      const hits = intent.t === "multi" ? intent.k : 1;
      const result = applyAttack(next, enemy, intent.n, hits, context);
      beats.push({
        enemyId: enemy.id,
        kind: "attack",
        amount: result.dealt,
        hullDamage: result.hullDamage,
        shieldDamage: result.shieldDamage,
        after: clone(next),
      });
    } else if (intent.t === "shield") {
      enemy.shield += intent.n;
      beats.push({
        enemyId: enemy.id,
        kind: "shield",
        amount: intent.n,
        hullDamage: 0,
        shieldDamage: 0,
        after: clone(next),
      });
    } else if (intent.t === "shieldAll") {
      for (const ally of aliveEnemies(next)) ally.shield += intent.n;
      beats.push({
        enemyId: enemy.id,
        kind: "shieldAll",
        amount: intent.n,
        hullDamage: 0,
        shieldDamage: 0,
        after: clone(next),
      });
    } else if (intent.t === "charge") {
      applyStatus(enemy.statuses, "charge");
      beats.push({
        enemyId: enemy.id,
        kind: "charge",
        amount: 0,
        hullDamage: 0,
        shieldDamage: 0,
        after: clone(next),
      });
    } else if (intent.t === "jamSlot") {
      const candidates = (Object.keys(next.slots) as SlotId[]).filter(
        (slotId) => !isSlotBlocked(next, slotId),
      );
      if (candidates.length > 0) {
        const slot = enemyStream.pick(candidates);
        next.blockedSlots.push({ slot, untilTurn: next.turn + 1 });
        beats.push({
          enemyId: enemy.id,
          kind: "jamSlot",
          amount: 0,
          hullDamage: 0,
          shieldDamage: 0,
          slot,
          after: clone(next),
        });
      }
    } else if (intent.t === "lockDie") {
      const uid = lockRandomTrayDie(next, enemyStream);
      if (uid !== undefined) {
        beats.push({
          enemyId: enemy.id,
          kind: "lockDie",
          amount: 0,
          hullDamage: 0,
          shieldDamage: 0,
          dieUid: uid,
          after: clone(next),
        });
      }
    } else {
      if (aliveEnemies(next).length < MAX_ENEMIES) {
        const spawned = spawnEnemy(
          intent.id,
          `enemy-${String(next.enemies.length)}`,
          enemyStream,
        );
        next.enemies.push(spawned);
        beats.push({
          enemyId: enemy.id,
          kind: "summon",
          amount: 0,
          hullDamage: 0,
          shieldDamage: 0,
          after: clone(next),
        });
      }
    }

    enemy.intentIndex = (enemy.intentIndex + 1) % def.pattern.length;
    enemy.nextIntent = drawIntent(def, enemy.intentIndex, enemyStream);
  }

  for (const enemy of aliveEnemies(next)) {
    const burnDamage = tickBurn(enemy.statuses);
    if (burnDamage <= 0) continue;
    enemy.hp = Math.max(0, enemy.hp - burnDamage);
    if (enemy.hp === 0) {
      for (const sub of enemy.subsystems) sub.hp = 0;
      handleDeath(next, enemy);
      if (enemy.id === next.targetId) {
        next.targetId = aliveEnemies(next)[0]?.id ?? null;
      }
    }
    beats.push({
      enemyId: enemy.id,
      kind: "burnTick",
      amount: burnDamage,
      hullDamage: 0,
      shieldDamage: 0,
      after: clone(next),
    });
  }

  next.shield = 0;
  if (next.hull <= 0) next.outcome = "defeat";
  else if (aliveEnemies(next).length === 0) next.outcome = "victory";
  return { next, beats };
};

export const advanceTurn = (
  snapshot: BattleSnapshot,
  streams: RngStreams,
): BattleSnapshot => {
  const next = clone(snapshot);
  next.turn += 1;
  next.blockedSlots = next.blockedSlots.filter(
    (b) => b.untilTurn >= next.turn,
  );
  next.lockedDice = next.lockedDice.filter((l) => l.untilTurn >= next.turn);
  next.dice = next.dice.map((die) => {
    if (isDieLocked(next, die.uid)) {
      return { ...die, state: "locked" as const, slot: undefined };
    }
    if (die.state === "reserved") {
      return { ...die, state: "tray" as const, slot: undefined };
    }
    const rolled = streams.dice.int(1, die.tier);
    return {
      ...die,
      value: Math.min(die.tier, Math.max(1, rolled + next.nextRollBonus)),
      state: "tray" as const,
      slot: undefined,
    };
  });
  for (const slot of Object.values(next.slots)) {
    slot.dieUid = undefined;
  }
  next.engineState = null;
  next.nextRollBonus = 0;
  return next;
};
