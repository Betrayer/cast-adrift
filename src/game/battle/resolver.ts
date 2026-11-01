import { DIE_BY_ID } from "@/data/dice";
import {
  aliveEnemies,
  applyWeaponDamage,
  resolveWeaponTarget,
  scatterTargets,
  stripShield,
  type WeaponTarget,
} from "@/game/battle/damage";
import {
  DIRECT,
  DOUBLET,
  fireModeAllowed,
  INCENDIARY,
  LINKED,
  SCATTER,
  SHAPED,
  SHUNT,
  splitDamage,
  type FireModeId,
} from "@/data/fireModes";
import { resonanceGrantActive } from "@/data/resonance";
import { ENGINE_SLOTS } from "@/data/slots";
import {
  evasionFor,
  evasionTuningFor,
  vulnerableFor,
} from "@/game/battle/evasion";
import { overCapAllowed } from "@/game/battle/passives";
import { effectiveCap, exceedCapGrantFor } from "@/game/battle/placement";
import {
  battleMutators,
  clone,
  emitBattleEnd,
  finalizeOutcome,
  scaleDamage,
  syncCtxFlags,
} from "@/game/battle/resolveShared";
import { dieValueCeiling, rerollFace } from "@/game/battle/rollFloors";
import { resolutionOrder } from "@/game/battle/order";
import { applyStatus } from "@/game/battle/statuses";
import { aimedEnemy } from "@/game/battle/target";
import {
  applyActions,
  BattleCtx,
  buildSources,
  dieFaceMax,
  emit,
  type EffectSource,
  type ResolveScope,
} from "@/game/effects";
import { sourceMods, sourceTrait } from "@/game/run/runMods";
import type { PerkMods } from "@/data/perks/types";
import type { RngStream } from "@/services/rng";
import type {
  BattleSnapshot,
  Beat,
  EnemyState,
  RolledDie,
  SlotId,
  SlotState,
} from "@/types/battle";

export {
  BASE_EVASION,
  DODGE_PCT_CAP,
  evasionFor,
  evasionTuningFor,
  GLANCING_PCT_CAP,
  INTERCEPT_VALUE,
  INTERCEPT_WEAPONS_BONUS,
  VULNERABLE_CAP,
  vulnerableFor,
} from "@/game/battle/evasion";
export {
  applyChargeAuras,
  chargeAuraActive,
  enemyAuraAttack,
  incomingHits,
  intentHits,
  intentMagnitude,
  MIRROR_CAP,
  MIRROR_SCHOOL_CAP,
  resolveEnemyPhase,
} from "@/game/battle/enemyPhase";
export { advanceTurn, applyPendingTwists } from "@/game/battle/turn";
export { scaleDamage } from "@/game/battle/resolveShared";

export const OVERFLOW_HULL_COST = 2;
export const NUDGE_COST = 3;

export const nudgeChargeCost = (delta: number, coldLogic: boolean): number =>
  Math.max(coldLogic ? 0 : 1, NUDGE_COST + delta);
export const BONUS_REROLL_COST = 5;
export const SURGE_COST = 10;
export const BASE_REROLL_SIZE = 2;
export const SACRIFICE_DAMAGE = 4;
export const BLOOD_REACTOR_HULL = 2;
export const BLOOD_REACTOR_CHARGE = 3;
export const REPAIR_DIVISOR = 2;
export const SPINAL_JAM_CARRY = 2;
export const DEFAULT_SPINAL_JAM_ON = 4;

export const applyNodeStorm = (
  next: BattleSnapshot,
  rng: RngStream,
): Beat | null => {
  if (next.nodeStorm !== true) return null;
  const placed = next.dice.filter(
    (d) => d.state === "placed" && d.slot !== undefined,
  );
  if (placed.length === 0) return null;
  const die = rng.pick(placed);
  const rolled = rerollFace(die, rng);
  die.value = Math.min(dieValueCeiling(die), Math.max(1, rolled));
  return {
    slot: die.slot ?? "reactor",
    kind: "storm",
    amount: die.value,
    value: die.value,
    after: clone(next),
  };
};

const consumePierce = (next: BattleSnapshot): boolean => {
  if (next.pierceUsed === true) return false;
  if (!sourceTrait(next, "firstHitPierce")) return false;
  next.pierceUsed = true;
  return true;
};

interface SlotContext {
  ctx: BattleCtx;
  sources: EffectSource[];
  mods: BattleSnapshot["nextTurnMods"];
  beats: Beat[];
  perkMods: PerkMods;
  ricochet: boolean;
  overkill: number;
  engineValue: number;
}

const noteHitEnemy = (sc: SlotContext, enemyId: string | undefined): void => {
  if (sc.ctx.scope !== null && enemyId !== undefined) {
    sc.ctx.scope.hitEnemyId = enemyId;
  }
};

const noteOverkill = (
  sc: SlotContext,
  enemy: EnemyState,
  preHp: number,
  dealt: number,
): void => {
  if (enemy.hp > 0) return;
  sc.overkill += Math.max(0, dealt - preHp);
};

export const activeFireMode = (
  next: BattleSnapshot,
  slotId: SlotId,
): FireModeId => {
  const mode = next.slots[slotId]?.mode ?? DIRECT.id;
  return fireModeAllowed(mode, aliveEnemies(next).length) ? mode : DIRECT.id;
};

export const linkedDiceFor = (
  next: BattleSnapshot,
  die: RolledDie,
): number =>
  next.dice.filter(
    (d) => d.uid !== die.uid && d.state === "placed" && d.school === die.school,
  ).length;

const modeDamage = (
  mode: FireModeId,
  base: number,
  maxFace: boolean,
  next: BattleSnapshot,
  die: RolledDie,
): number => {
  if (mode === INCENDIARY.id) {
    return Math.max(0, base - INCENDIARY.damagePenalty);
  }
  if (mode === SHUNT.id) return Math.max(0, base - SHUNT.damagePenalty);
  if (mode === SHAPED.id) {
    return maxFace ? base : Math.max(0, base - SHAPED.offFacePenalty);
  }
  if (mode === LINKED.id) {
    return base + Math.min(LINKED.cap, linkedDiceFor(next, die) * LINKED.perDie);
  }
  return base;
};

const targetDown = (target: WeaponTarget): boolean =>
  target.subsystem === undefined
    ? target.enemy.hp <= 0
    : target.subsystem.hp <= 0;

const resolveScatter = (
  next: BattleSnapshot,
  slotId: SlotId,
  die: RolledDie,
  base: number,
  crit: boolean,
  damageMultPct: number,
  sc: SlotContext,
): void => {
  const targets = scatterTargets(next);
  if (targets.length === 0) return;
  noteHitEnemy(sc, targets[0]?.id);
  const shares = splitDamage(base, targets.length);
  const pierce = consumePierce(next);
  for (const [index, enemy] of targets.entries()) {
    const preHp = enemy.hp + enemy.shield;
    const dealt = applyWeaponDamage(
      next,
      { enemy },
      scaleDamage(
        (shares[index] ?? 0) + SCATTER.fragmentBonus,
        damageMultPct,
      ),
      crit,
      pierce && index === 0,
      die.school,
    );
    noteOverkill(sc, enemy, preHp, dealt);
    sc.beats.push({
      slot: slotId,
      kind: "damage",
      amount: dealt,
      targetId: enemy.id,
      after: clone(next),
    });
  }
};

const applySlotEffect = (
  next: BattleSnapshot,
  slotId: SlotId,
  die: RolledDie,
  value: number,
  chargeMult: number,
  crit: boolean,
  sc: SlotContext,
): void => {
  const { mods, beats, perkMods, ricochet } = sc;
  const damageMultPct = battleMutators(next).damageMultPct;
  if (slotId === "sensors") {
    const target = aimedEnemy(next.enemies, next.targetId);
    if (target === undefined) return;
    const vulnerable = vulnerableFor(value, perkMods.markBonusDelta);
    applyStatus(target.statuses, "mark", vulnerable);
    const pierce =
      die.value >= dieFaceMax(die) ? Math.min(value, target.shield) : 0;
    if (pierce > 0) target.shield -= pierce;
    beats.push({
      slot: slotId,
      kind: "sensor",
      amount: value,
      targetId: target.id,
      sensor: { vulnerable, pierce },
      after: clone(next),
    });
  } else if (slotId === "weaponA" || slotId === "weaponB") {
    const mode = activeFireMode(next, slotId);
    const base = value + (mods.weapons ?? 0);
    if (mode === SCATTER.id) {
      resolveScatter(next, slotId, die, base, crit, damageMultPct, sc);
      return;
    }
    const target = resolveWeaponTarget(next);
    if (target === undefined) return;
    noteHitEnemy(sc, target.enemy.id);
    const targetId = (target.subsystem ?? target.enemy).id;
    const maxFace = die.value >= dieFaceMax(die);
    const strips = mode === SHAPED.id && maxFace;
    if (strips) stripShield(target.enemy, value);
    const preHp =
      target.subsystem === undefined
        ? target.enemy.hp + target.enemy.shield
        : 0;
    if (mode === INCENDIARY.id) sc.ctx.addStatus("burn", INCENDIARY.burn);
    if (mode === SHUNT.id) {
      next.charge = Math.min(next.chargeCap, next.charge + SHUNT.charge);
    }
    const pierce = strips ? false : consumePierce(next);
    const hits = mode === DOUBLET.id ? DOUBLET.hits : 1;
    const damage = modeDamage(mode, base, maxFace, next, die);
    const perHit = hits > 1 ? Math.ceil(damage / hits) : damage;
    let dealt = 0;
    for (let hit = 0; hit < hits; hit += 1) {
      if (hit > 0 && targetDown(target)) break;
      const landed = applyWeaponDamage(
        next,
        target,
        scaleDamage(perHit, damageMultPct),
        crit,
        pierce && hit === 0,
        die.school,
      );
      dealt += landed;
      beats.push({
        slot: slotId,
        kind: "damage",
        amount: landed,
        targetId,
        after: clone(next),
      });
    }
    if (target.subsystem === undefined) {
      noteOverkill(sc, target.enemy, preHp, dealt);
    }
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
    if (value <= (slot?.jamOn ?? DEFAULT_SPINAL_JAM_ON)) {
      next.nextTurnMods.spinal = (mods.spinal ?? 0) + SPINAL_JAM_CARRY;
      beats.push({ slot: slotId, kind: "spinalJam", amount: 0, after: clone(next) });
    } else {
      const target = resolveWeaponTarget(next);
      if (target === undefined) return;
      noteHitEnemy(sc, target.enemy.id);
      const targetId = (target.subsystem ?? target.enemy).id;
      const preHp =
        target.subsystem === undefined
          ? target.enemy.hp + target.enemy.shield
          : 0;
      const dealt = applyWeaponDamage(
        next,
        target,
        scaleDamage(value + (mods.spinal ?? 0), damageMultPct),
        crit,
        false,
        die.school,
      );
      if (target.subsystem === undefined) {
        noteOverkill(sc, target.enemy, preHp, dealt);
      }
      beats.push({
        slot: slotId,
        kind: "damage",
        amount: dealt,
        targetId,
        after: clone(next),
      });
    }
  } else if (slotId === "shields" || slotId === "shieldsB") {
    next.shield += value;
    if (
      (die.school === "blue" || die.school === "prismatic") &&
      resonanceGrantActive(next.resonance.counts, "shieldPersist")
    ) {
      next.shieldPersist = Math.min(next.hullMax, next.shieldPersist + value);
    }
    beats.push({ slot: slotId, kind: "shield", amount: value, after: clone(next) });
  } else if (slotId === "repairBay") {
    const heal = Math.ceil(value / REPAIR_DIVISOR);
    next.hull = Math.min(next.hullMax, next.hull + heal);
    beats.push({ slot: slotId, kind: "repair", amount: heal, after: clone(next) });
  } else if (ENGINE_SLOTS.has(slotId)) {
    sc.engineValue += value;
    const evasion = evasionFor(
      sc.engineValue,
      perkMods.evasionDelta,
      evasionTuningFor(next.shipId),
    );
    next.evasion = evasion;
    beats.push({
      slot: slotId,
      kind: "engine",
      amount: value,
      evasion,
      after: clone(next),
    });
  } else if (slotId === "reactor") {
    const stored = Math.floor(value * chargeMult);
    next.charge += stored;
    let overflow = 0;
    if (next.charge > next.chargeCap) {
      next.charge = next.chargeCap;
      if (next.overflowShieldUsed !== true && sourceTrait(next, "overflowShield")) {
        next.overflowShieldUsed = true;
      } else {
        overflow = OVERFLOW_HULL_COST;
        next.hull = Math.max(0, next.hull - OVERFLOW_HULL_COST);
      }
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

export const openSlotScope = (
  ctx: BattleCtx,
  sources: readonly EffectSource[],
  slotId: SlotId,
  slot: SlotState,
  die: RolledDie,
): ResolveScope => {
  const scope: ResolveScope = {
    slotId,
    slot,
    die,
    value: die.value,
    chargeMult: 1,
    crit: false,
    repeat: false,
  };
  ctx.scope = scope;
  ctx.noteSlotResolved();

  const primed = ctx.consumePrime(die.school);
  if (primed !== undefined) {
    if (primed.max) scope.value = dieFaceMax(die);
    scope.value += primed.n;
  }

  emit(sources, "beforeResolveSlot", ctx);
  return scope;
};

const resolveSlot = (
  next: BattleSnapshot,
  slotId: SlotId,
  slot: SlotState,
  die: RolledDie,
  sc: SlotContext,
): void => {
  const { ctx, sources } = sc;
  const scope = openSlotScope(ctx, sources, slotId, slot, die);

  const isWeapon =
    slotId === "weaponA" || slotId === "weaponB" || slotId === "spinal";

  if (die.tier > effectiveCap(next, slotId, slot)) {
    const overload = overCapAllowed(next.shipId, slotId);
    const grant = exceedCapGrantFor(next, die, slotId);
    const onMaxFace = die.value >= dieFaceMax(die);
    const edged =
      sourceTrait(next, "houseEdge") && die.school === "black" && onMaxFace;
    const price = edged ? 0 : (overload?.hullCost ?? grant?.hullCost ?? 0);
    if (overload !== null || grant !== undefined) {
      next.hull = Math.max(0, next.hull - price);
      if (sourceTrait(next, "overflowCharge")) {
        next.charge = Math.min(next.chargeCap, next.charge + 1);
      }
    }
  }

  const crit = isWeapon && scope.crit && !sourceTrait(next, "coldLogic");
  const beatsBefore = sc.beats.length;

  applySlotEffect(next, slotId, die, scope.value, scope.chargeMult, crit, sc);

  emit(sources, "afterResolveSlot", ctx);

  const def = DIE_BY_ID.get(die.defId);
  const fieldCap = def?.growth?.cap ?? 0;
  const effectiveField = fieldCap > 0 ? fieldCap + sc.perkMods.growthCapDelta : 0;
  const requested = ctx.growthRequest(die.uid);
  const growthCap = Math.max(effectiveField, requested?.cap ?? 0);
  if (growthCap > 0 && die.value >= dieFaceMax(die)) {
    const per = def?.growth?.perMax ?? requested?.per ?? 1;
    die.growth = Math.min(growthCap, (die.growth ?? 0) + per);
  }

  if (scope.repeat) {
    applySlotEffect(next, slotId, die, scope.value, scope.chargeMult, crit, sc);
  }

  for (let i = beatsBefore; i < sc.beats.length; i += 1) {
    const beat = sc.beats[i];
    if (beat !== undefined) beat.value = scope.value;
  }

  ctx.scope = null;
};

const runScheduled = (next: BattleSnapshot, ctx: BattleCtx): void => {
  const queued = next.scheduled ?? [];
  if (queued.length === 0) return;
  const due = queued.filter((entry) => entry.turn <= next.turn);
  next.scheduled = queued.filter((entry) => entry.turn > next.turn);
  for (const entry of due) applyActions(entry.do, ctx, null);
};

const pushPartDownBeats = (next: BattleSnapshot, beats: Beat[]): void => {
  const downed = next.partsDowned ?? [];
  if (downed.length === 0) return;
  next.partsDowned = [];
  for (const partId of downed) {
    const killing = [...beats]
      .reverse()
      .find((b) => b.kind === "damage" && b.targetId === partId);
    beats.push({
      slot: killing?.slot ?? "weaponA",
      kind: "partDown",
      amount: 0,
      targetId: partId,
      after: clone(next),
    });
  }
};

export const resolvePlayerPhase = (
  snapshot: BattleSnapshot,
  diceStream?: RngStream,
): { next: BattleSnapshot; beats: Beat[] } => {
  const next = clone(snapshot);
  const beats: Beat[] = [];
  if (diceStream !== undefined) {
    const storm = applyNodeStorm(next, diceStream);
    if (storm !== null) beats.push(storm);
  }
  const ctx = new BattleCtx(next, next.flags);
  const sources = buildSources(next);
  const perkMods = sourceMods(next);
  const ricochet = sourceTrait(next, "ricochet");
  const killsBefore = aliveEnemies(next).length;
  const mods = next.nextTurnMods;
  next.nextTurnMods = {};
  if (next.sacrificePool > 0) {
    mods.weapons = (mods.weapons ?? 0) + next.sacrificePool;
    next.sacrificePool = 0;
  }
  const sc: SlotContext = {
    ctx,
    sources,
    mods,
    beats,
    perkMods,
    ricochet,
    overkill: 0,
    engineValue: 0,
  };

  for (const slotId of resolutionOrder(next)) {
    const slot = next.slots[slotId];
    if (slot?.dieUid === undefined) continue;
    const die = next.dice.find((d) => d.uid === slot.dieUid);
    if (die === undefined) continue;
    resolveSlot(next, slotId, slot, die, sc);
  }

  const unplaced = next.dice.filter((d) => d.state === "tray").length;
  if (sourceTrait(next, "compost")) next.scrap += unplaced;
  if (sourceTrait(next, "recycler")) {
    next.charge = Math.min(next.chargeCap, next.charge + unplaced);
  }
  if (perkMods.scrapPerKill > 0) {
    const killed = killsBefore - aliveEnemies(next).length;
    if (killed > 0) next.scrap += killed * perkMods.scrapPerKill;
  }

  runScheduled(next, ctx);
  emit(sources, "turnEnd", ctx);
  pushPartDownBeats(next, beats);

  next.lastPlayerDamage = beats
    .filter((b) => b.kind === "damage")
    .reduce((sum, b) => sum + b.amount, 0);

  finalizeOutcome(next);
  emitBattleEnd(sources, ctx, next, sc.overkill);
  syncCtxFlags(next, ctx);
  return { next, beats };
};
