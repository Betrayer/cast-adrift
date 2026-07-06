import { DIE_BY_ID, rollBaseValue } from "@/data/dice";
import { ENEMY_BY_ID } from "@/data/enemies/sector1";
import {
  aliveEnemies,
  applyWeaponDamage,
  handleDeath,
  resolveWeaponTarget,
} from "@/game/battle/damage";
import { resonanceAtLeast } from "@/game/battle/resonance";
import { applyRollFloors, applySpareLowest } from "@/game/battle/rollFloors";
import {
  drawIntent,
  isDieLocked,
  isSlotBlocked,
  MAX_ENEMIES,
  spawnEnemy,
} from "@/game/battle/setup";
import { applyStatus, consumeStatus, tickBurn } from "@/game/battle/statuses";
import {
  BattleCtx,
  buildSources,
  dieFaceMax,
  emit,
  type EffectSource,
} from "@/game/effects";
import { computePerkMods, hasTrait } from "@/game/run/perkMods";
import type { PerkMods } from "@/data/perks/types";
import type { RngStream, RngStreams } from "@/services/rng";
import type {
  BattleSnapshot,
  Beat,
  EnemyBeat,
  EnemyState,
  EngineTier,
  RolledDie,
  SlotId,
  SlotState,
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
export const OVER_CAP_HULL_COST = 1;
export const REFLECT_DODGE_DAMAGE = 3;
export const SACRIFICE_DAMAGE = 4;
export const BLOOD_REACTOR_HULL = 2;
export const BLOOD_REACTOR_CHARGE = 3;

const clone = (snapshot: BattleSnapshot): BattleSnapshot =>
  structuredClone(snapshot);

export const engineTier = (value: number): EngineTier => {
  if (value <= 3) return "brace";
  if (value <= 6) return "dodge";
  return "dodgePlus";
};

const hasAliveAura = (
  enemy: EnemyState,
  aura: SubsystemState["aura"],
): boolean => enemy.subsystems.some((s) => s.hp > 0 && s.aura === aura);

const guardLethal = (next: BattleSnapshot): void => {
  if (
    next.hull <= 0 &&
    !next.survivedLethal &&
    resonanceAtLeast(next.resonance, "black", 6)
  ) {
    next.hull = 1;
    next.survivedLethal = true;
  }
};

const greenDiceCount = (next: BattleSnapshot): number =>
  next.dice.filter((d) => d.school === "green").length;

const finalizeOutcome = (next: BattleSnapshot): void => {
  guardLethal(next);
  if (next.hull <= 0) {
    next.outcome = "defeat";
    return;
  }
  if (aliveEnemies(next).length === 0) {
    if (resonanceAtLeast(next.resonance, "green", 4)) {
      next.hull = Math.min(next.hullMax, next.hull + greenDiceCount(next));
    }
    next.outcome = "victory";
  }
};

interface SlotContext {
  ctx: BattleCtx;
  sources: EffectSource[];
  mods: BattleSnapshot["nextTurnMods"];
  beats: Beat[];
  perkMods: PerkMods;
  ricochet: boolean;
}

const applySlotEffect = (
  next: BattleSnapshot,
  slotId: SlotId,
  die: RolledDie,
  value: number,
  thresholdBonus: number,
  chargeMult: number,
  crit: boolean,
  mods: BattleSnapshot["nextTurnMods"],
  beats: Beat[],
  perkMods: PerkMods,
  ricochet: boolean,
): void => {
  if (slotId === "sensors") {
    const target =
      next.enemies.find((e) => e.id === next.targetId && e.hp > 0) ??
      aliveEnemies(next)[0];
    if (target === undefined) return;
    applyStatus(target.statuses, "mark");
    const jam = value >= 4;
    if (jam) applyStatus(target.statuses, "jam");
    const deepScan = value >= 7;
    if (deepScan) next.pendingDeepScan = true;
    beats.push({
      slot: slotId,
      kind: "sensor",
      amount: value,
      targetId: target.id,
      sensor: { mark: true, jam, deepScan },
      after: clone(next),
    });
  } else if (slotId === "weaponA" || slotId === "weaponB") {
    const target = resolveWeaponTarget(next);
    if (target === undefined) return;
    const targetId = (target.subsystem ?? target.enemy).id;
    const markBonus = 2 + perkMods.markBonusDelta;
    const preHp =
      target.subsystem === undefined
        ? target.enemy.hp + target.enemy.shield
        : 0;
    const dealt = applyWeaponDamage(
      next,
      target,
      value + (mods.weapons ?? 0),
      crit,
      markBonus,
    );
    beats.push({
      slot: slotId,
      kind: "damage",
      amount: dealt,
      targetId,
      after: clone(next),
    });
    if (
      ricochet &&
      slotId === "weaponA" &&
      target.subsystem === undefined &&
      target.enemy.hp === 0
    ) {
      const overkill = dealt - preHp;
      if (overkill > 0) {
        const nextEnemy = aliveEnemies(next).find(
          (e) => e.id !== target.enemy.id,
        );
        if (nextEnemy !== undefined) {
          const ricochetDealt = applyWeaponDamage(
            next,
            { enemy: nextEnemy },
            overkill,
            false,
            markBonus,
          );
          beats.push({
            slot: slotId,
            kind: "damage",
            amount: ricochetDealt,
            targetId: nextEnemy.id,
            after: clone(next),
          });
        }
      }
    }
  } else if (slotId === "spinal") {
    const slot = next.slots.spinal;
    if (value <= (slot?.jamOn ?? 4)) {
      next.nextTurnMods.spinal = (mods.spinal ?? 0) + 2;
      beats.push({ slot: slotId, kind: "spinalJam", amount: 0, after: clone(next) });
    } else {
      const target = resolveWeaponTarget(next);
      if (target === undefined) return;
      const targetId = (target.subsystem ?? target.enemy).id;
      const dealt = applyWeaponDamage(
        next,
        target,
        value + (mods.spinal ?? 0),
        crit,
        2 + perkMods.markBonusDelta,
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
    next.shield += value;
    if (
      (die.school === "blue" || die.school === "prismatic") &&
      resonanceAtLeast(next.resonance, "blue", 4)
    ) {
      next.shieldPersist = Math.min(next.hullMax, next.shieldPersist + value);
    }
    beats.push({ slot: slotId, kind: "shield", amount: value, after: clone(next) });
  } else if (slotId === "engines") {
    const tier = engineTier(
      value + thresholdBonus + perkMods.enginesThresholdDelta,
    );
    next.engineState = tier;
    if (tier === "dodgePlus") {
      next.nextTurnMods.weapons = (next.nextTurnMods.weapons ?? 0) + 2;
    }
    beats.push({
      slot: slotId,
      kind: "engine",
      amount: value,
      engineTier: tier,
      after: clone(next),
    });
  } else if (slotId === "reactor") {
    const stored = Math.floor(value * chargeMult);
    next.charge += stored;
    let overflow = 0;
    if (next.charge > next.chargeCap) {
      next.charge = next.chargeCap;
      overflow = OVERFLOW_HULL_COST;
      next.hull = Math.max(0, next.hull - OVERFLOW_HULL_COST);
    }
    beats.push({
      slot: slotId,
      kind: "charge",
      amount: stored,
      overflowHull: overflow > 0 ? overflow : undefined,
      after: clone(next),
    });
  }
};

const resolveSlot = (
  next: BattleSnapshot,
  slotId: SlotId,
  slot: SlotState,
  die: RolledDie,
  sc: SlotContext,
): void => {
  const { ctx, sources, mods, beats } = sc;
  const scope = {
    slotId,
    slot,
    die,
    value: die.value,
    chargeMult: 1,
    thresholdBonus: 0,
    crit: false,
    repeat: false,
  };
  ctx.scope = scope;

  const primed = ctx.consumePrime(die.school);
  if (primed !== undefined) {
    if (primed.max) scope.value = dieFaceMax(die);
    scope.value += primed.n;
  }

  emit(sources, "beforeResolveSlot", ctx);

  if (die.tier > slot.cap && resonanceAtLeast(next.resonance, "black", 2)) {
    next.hull = Math.max(0, next.hull - OVER_CAP_HULL_COST);
  }

  const isWeapon =
    slotId === "weaponA" || slotId === "weaponB" || slotId === "spinal";
  const crit =
    isWeapon &&
    resonanceAtLeast(next.resonance, "yellow", 4) &&
    die.value >= dieFaceMax(die);

  applySlotEffect(
    next,
    slotId,
    die,
    scope.value,
    scope.thresholdBonus,
    scope.chargeMult,
    crit,
    mods,
    beats,
    sc.perkMods,
    sc.ricochet,
  );

  emit(sources, "afterResolveSlot", ctx);

  const def = DIE_BY_ID.get(die.defId);
  const fieldCap = def?.growth?.cap ?? 0;
  const greenCap =
    die.school === "green" && resonanceAtLeast(next.resonance, "green", 6)
      ? 3
      : 0;
  const effectiveField = fieldCap > 0 ? fieldCap + sc.perkMods.growthCapDelta : 0;
  const growthCap = Math.max(effectiveField, greenCap);
  if (growthCap > 0 && die.value >= dieFaceMax(die)) {
    const per = def?.growth?.perMax ?? 1;
    die.growth = Math.min(growthCap, (die.growth ?? 0) + per);
  }

  if (scope.repeat) {
    applySlotEffect(
      next,
      slotId,
      die,
      scope.value,
      scope.thresholdBonus,
      scope.chargeMult,
      crit,
      mods,
      beats,
      sc.perkMods,
      sc.ricochet,
    );
  }

  ctx.scope = null;
};

export const resolvePlayerPhase = (
  snapshot: BattleSnapshot,
): { next: BattleSnapshot; beats: Beat[] } => {
  const next = clone(snapshot);
  const beats: Beat[] = [];
  const ctx = new BattleCtx(next);
  const sources = buildSources(next);
  const perkMods = computePerkMods(next.perks);
  const ricochet = hasTrait(next.perks, "ricochet");
  const mods = next.nextTurnMods;
  next.nextTurnMods = {};
  if (next.sacrificePool > 0) {
    mods.weapons = (mods.weapons ?? 0) + next.sacrificePool;
    next.sacrificePool = 0;
  }

  for (const slotId of RESOLUTION_ORDER) {
    const slot = next.slots[slotId];
    if (slot?.dieUid === undefined) continue;
    const die = next.dice.find((d) => d.uid === slot.dieUid);
    if (die === undefined) continue;
    resolveSlot(next, slotId, slot, die, {
      ctx,
      sources,
      mods,
      beats,
      perkMods,
      ricochet,
    });
  }

  if (hasTrait(next.perks, "compost")) {
    next.scrap += next.dice.filter((d) => d.state === "tray").length;
  }

  finalizeOutcome(next);
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
  const tide = Math.max(0, next.tide);
  const perkMods = computePerkMods(next.perks);
  const reflectDodge = hasTrait(next.perks, "reflectDodge");
  const dodgeCharge = hasTrait(next.perks, "dodgeCharge");
  const chargeMult = consumeStatus(enemy.statuses, "charge") ? 2 : 1;
  const jamPenalty = consumeStatus(enemy.statuses, "jam")
    ? 2 + perkMods.jamPowerDelta
    : 0;
  const brace = next.engineState === "brace" ? 1 : 0;
  const dodges =
    next.engineState === "dodge" || next.engineState === "dodgePlus";
  let dealt = 0;
  let hullDamage = 0;
  let shieldDamage = 0;
  for (let i = 0; i < hits; i += 1) {
    let damage = Math.max(
      0,
      (perHit + aura + tide) * chargeMult - (i === 0 ? jamPenalty : 0),
    );
    if (dodges && !context.dodgeSpent) {
      context.dodgeSpent = true;
      if (reflectDodge) enemy.hp = Math.max(0, enemy.hp - REFLECT_DODGE_DAMAGE);
      if (dodgeCharge) {
        next.charge = Math.min(next.chargeCap, next.charge + 1);
      }
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
          next.tide,
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

  next.shield = Math.min(next.shield, next.shieldPersist);
  finalizeOutcome(next);
  return { next, beats };
};

export const advanceTurn = (
  snapshot: BattleSnapshot,
  streams: RngStreams,
): BattleSnapshot => {
  const next = clone(snapshot);
  next.turn += 1;
  next.blockedSlots = next.blockedSlots.filter((b) => b.untilTurn >= next.turn);
  next.lockedDice = next.lockedDice.filter((l) => l.untilTurn >= next.turn);
  next.dice = next.dice.map((die) => {
    if (isDieLocked(next, die.uid)) {
      return { ...die, state: "locked" as const, slot: undefined, lastValue: undefined };
    }
    if (die.state === "reserved") {
      return { ...die, state: "tray" as const, slot: undefined, lastValue: undefined };
    }
    const base = rollBaseValue(die.defId, die.tier, streams.dice);
    const rolled = Math.min(die.tier, Math.max(1, base + next.nextRollBonus));
    return {
      ...die,
      value: rolled + (die.growth ?? 0),
      lastValue: die.value,
      state: "tray" as const,
      slot: undefined,
    };
  });
  for (const slot of Object.values(next.slots)) {
    slot.dieUid = undefined;
  }
  next.engineState = null;
  next.nextRollBonus = 0;
  next.sacrificePool = 0;
  next.bloodReactorUsed = false;

  const rolledDice = next.dice.filter(
    (d) => d.state === "tray" && d.lastValue !== undefined,
  );
  applyRollFloors(rolledDice, next.resonance, hasTrait(next.perks, "stabilizer"));
  if (hasTrait(next.perks, "spareLowest")) applySpareLowest(rolledDice);

  const ctx = new BattleCtx(next);
  const sources = buildSources(next);
  for (const die of rolledDice) {
    ctx.subjectDie = die;
    emit(sources, "rolled", ctx);
  }
  ctx.subjectDie = null;

  return next;
};
