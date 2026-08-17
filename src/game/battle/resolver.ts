import { DIE_BY_ID, rollBaseValue } from "@/data/dice";
import { ENEMY_BY_ID } from "@/data/enemies";
import { SHIP_BY_ID, shipHasPassive } from "@/data/ships";
import {
  aliveEnemies,
  applyWeaponDamage,
  handleDeath,
  resolveWeaponTarget,
} from "@/game/battle/damage";
import { resonanceGrantActive } from "@/data/resonance";
import { applyRollFloors, applySpareLowest } from "@/game/battle/rollFloors";
import {
  applyObsidianPact,
  curseOn,
  dieFitsSlot,
  drawIntent,
  effectiveCap,
  everyTurnFor,
  exceedCapGrantFor,
  isDieLocked,
  isSlotBlocked,
  isSlotShrunk,
  MAX_ENEMIES,
  patternFor,
  phaseIndexForHp,
  rotateWard,
  spawnEnemy,
  stepContextFor,
  type SpawnInit,
} from "@/game/battle/setup";
import {
  INVERTED_RESOLUTION_ORDER,
  isInverted,
  RESOLUTION_ORDER,
  resolutionOrder,
} from "@/game/battle/order";
import {
  applyStatus,
  clearMark,
  consumeStatus,
  tickBurn,
} from "@/game/battle/statuses";
import {
  applyActions,
  BattleCtx,
  buildSources,
  dieFaceMax,
  emit,
  type EffectSource,
} from "@/game/effects";
import { dieHasGrant } from "@/data/engravings";
import { sourceMods, sourceTrait } from "@/game/run/runMods";
import { computeMutatorMods, type MutatorMods } from "@/data/mutators";
import type { PerkMods } from "@/data/perks/types";
import type { RngStream, RngStreams } from "@/services/rng";
import type {
  BattleSnapshot,
  Beat,
  EnemyBeat,
  EnemyBeatKind,
  EnemyState,
  EvasionState,
  RolledDie,
  SlotId,
  SlotState,
  SubsystemState,
} from "@/types/battle";
import type { EnemyDef, Intent } from "@/types/content";

const enemySpawnInit = (next: BattleSnapshot): SpawnInit => ({
  tide: next.tide,
  sectorHpPct: next.sectorHpPct,
  hpBonusPct: next.enemyHpPct,
  ascension: next.ascension,
});

export {
  INVERTED_RESOLUTION_ORDER,
  isInverted,
  RESOLUTION_ORDER,
  resolutionOrder,
};

export const OVERLOAD_HULL_COST = 2;

export const CHARGE_CAP = 10;
export const OVERFLOW_HULL_COST = 2;
export const NUDGE_COST = 3;
export const BONUS_REROLL_COST = 5;
export const SURGE_COST = 10;
export const MIRROR_CAP = 12;
export const BASE_REROLL_SIZE = 2;
export const REFLECT_DODGE_DAMAGE = 3;
export const SACRIFICE_DAMAGE = 4;
export const BLOOD_REACTOR_HULL = 2;
export const BLOOD_REACTOR_CHARGE = 3;

const clone = (snapshot: BattleSnapshot): BattleSnapshot =>
  structuredClone(snapshot);

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
  const rolled = rng.int(1, die.tier) + (die.growth ?? 0);
  die.value = Math.min(die.tier, Math.max(1, rolled));
  return {
    slot: die.slot ?? "reactor",
    kind: "storm",
    amount: die.value,
    after: clone(next),
  };
};

const battleMutators = (snapshot: BattleSnapshot): MutatorMods =>
  computeMutatorMods(snapshot.mutators ?? []);

export const scaleDamage = (damage: number, multPct: number): number =>
  multPct === 0 ? damage : Math.round(damage * (1 + multPct / 100));

export const DODGE_PCT_PER_VALUE = 6;
export const GLANCING_PCT_PER_VALUE = 3;
export const DODGE_PCT_CAP = 55;
export const GLANCING_PCT_CAP = 25;
export const INTERCEPT_VALUE = 8;
export const INTERCEPT_WEAPONS_BONUS = 1;
export const VULNERABLE_CAP = 4;
export const VULNERABLE_DIVISOR = 2;

const clampPct = (raw: number, cap: number): number =>
  Math.max(0, Math.min(cap, Math.round(raw)));

export const evasionFor = (value: number, evasionDelta = 0): EvasionState => {
  const effective = Math.max(0, value);
  return {
    dodgePct: clampPct(
      effective * DODGE_PCT_PER_VALUE + evasionDelta,
      DODGE_PCT_CAP,
    ),
    glancingPct: clampPct(
      effective * GLANCING_PCT_PER_VALUE + evasionDelta / 2,
      GLANCING_PCT_CAP,
    ),
    intercept: effective >= INTERCEPT_VALUE,
  };
};

export const vulnerableFor = (value: number, markBonusDelta = 0): number =>
  Math.max(
    0,
    Math.min(VULNERABLE_CAP, Math.ceil(Math.max(0, value) / VULNERABLE_DIVISOR)) +
      markBonusDelta,
  );

const hasAliveAura = (
  enemy: EnemyState,
  aura: SubsystemState["aura"],
): boolean => enemy.subsystems.some((s) => s.hp > 0 && s.aura === aura);

const countAliveAura = (
  enemy: EnemyState,
  aura: SubsystemState["aura"],
): number => enemy.subsystems.filter((s) => s.hp > 0 && s.aura === aura).length;

const guardLethal = (next: BattleSnapshot): void => {
  if (
    next.hull <= 0 &&
    !next.survivedLethal &&
    (resonanceGrantActive(next.resonance.counts, "surviveLethal") ||
      sourceTrait(next, "escapePod"))
  ) {
    next.hull = 1;
    next.survivedLethal = true;
  }
};

const finalizeOutcome = (next: BattleSnapshot): void => {
  guardLethal(next);
  if (next.hull <= 0) {
    next.outcome = "defeat";
    return;
  }
  if (aliveEnemies(next).length === 0) next.outcome = "victory";
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
}

const noteOverkill = (
  sc: SlotContext,
  enemy: EnemyState,
  preHp: number,
  dealt: number,
): void => {
  if (enemy.hp > 0) return;
  sc.overkill += Math.max(0, dealt - preHp);
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
    const target =
      next.enemies.find((e) => e.id === next.targetId && e.hp > 0) ??
      aliveEnemies(next)[0];
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
    const target = resolveWeaponTarget(next);
    if (target === undefined) return;
    const targetId = (target.subsystem ?? target.enemy).id;
    const preHp =
      target.subsystem === undefined
        ? target.enemy.hp + target.enemy.shield
        : 0;
    const pierce = consumePierce(next);
    const dealt = applyWeaponDamage(
      next,
      target,
      scaleDamage(value + (mods.weapons ?? 0), damageMultPct),
      crit,
      pierce,
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
    if (value <= (slot?.jamOn ?? 4)) {
      next.nextTurnMods.spinal = (mods.spinal ?? 0) + 2;
      beats.push({ slot: slotId, kind: "spinalJam", amount: 0, after: clone(next) });
    } else {
      const target = resolveWeaponTarget(next);
      if (target === undefined) return;
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
    const heal = Math.ceil(value / 2);
    next.hull = Math.min(next.hullMax, next.hull + heal);
    beats.push({ slot: slotId, kind: "repair", amount: heal, after: clone(next) });
  } else if (slotId === "engines") {
    const evasion = evasionFor(value, perkMods.evasionDelta);
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

const resolveSlot = (
  next: BattleSnapshot,
  slotId: SlotId,
  slot: SlotState,
  die: RolledDie,
  sc: SlotContext,
): void => {
  const { ctx, sources } = sc;
  const scope = {
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

  const isWeapon =
    slotId === "weaponA" || slotId === "weaponB" || slotId === "spinal";

  if (die.tier > effectiveCap(next, slotId, slot)) {
    const overload =
      isWeapon &&
      next.shipId !== undefined &&
      shipHasPassive(next.shipId, "overload");
    const grant = exceedCapGrantFor(next, die, slotId);
    if (overload) {
      next.hull = Math.max(0, next.hull - OVERLOAD_HULL_COST);
    } else if (grant !== undefined) {
      next.hull = Math.max(0, next.hull - grant.hullCost);
    }
  }

  const crit = isWeapon && scope.crit && !sourceTrait(next, "coldLogic");

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

  ctx.scope = null;
};

const runScheduled = (next: BattleSnapshot, ctx: BattleCtx): void => {
  const queued = next.scheduled ?? [];
  if (queued.length === 0) return;
  const due = queued.filter((entry) => entry.turn <= next.turn);
  next.scheduled = queued.filter((entry) => entry.turn > next.turn);
  for (const entry of due) applyActions(entry.do, ctx, null);
};

const syncCtxFlags = (next: BattleSnapshot, ctx: BattleCtx): void => {
  if (ctx.flags.size === 0) return;
  next.flags = [...ctx.flags];
};

const emitBattleEnd = (
  sources: readonly EffectSource[],
  ctx: BattleCtx,
  next: BattleSnapshot,
  overkill: number,
): void => {
  if (next.outcome === undefined) return;
  ctx.payload = {
    battleEnd: { outcome: next.outcome, turns: next.turn, overkill },
  };
  emit(sources, "battleEnd", ctx);
  ctx.payload = {};
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

  next.lastPlayerDamage = beats
    .filter((b) => b.kind === "damage")
    .reduce((sum, b) => sum + b.amount, 0);

  finalizeOutcome(next);
  emitBattleEnd(sources, ctx, next, sc.overkill);
  syncCtxFlags(next, ctx);
  return { next, beats };
};

interface AttackContext {
  firstDodgeSpent: boolean;
  defense: RngStream;
}

export interface AttackResult {
  dealt: number;
  hullDamage: number;
  shieldDamage: number;
  dodged: number;
  glanced: number;
}

const rewardDodge = (
  next: BattleSnapshot,
  enemy: EnemyState,
  context: AttackContext,
  evasion: EvasionState,
): void => {
  if (context.firstDodgeSpent) return;
  context.firstDodgeSpent = true;
  if (sourceTrait(next, "reflectDodge")) {
    enemy.hp = Math.max(0, enemy.hp - REFLECT_DODGE_DAMAGE);
  }
  if (sourceTrait(next, "dodgeCharge")) {
    next.charge = Math.min(next.chargeCap, next.charge + 1);
  }
  if (evasion.intercept) {
    next.nextTurnMods.weapons =
      (next.nextTurnMods.weapons ?? 0) + INTERCEPT_WEAPONS_BONUS;
  }
};

const applyAttack = (
  next: BattleSnapshot,
  enemy: EnemyState,
  perHit: number,
  hits: number,
  context: AttackContext,
): AttackResult => {
  const def = ENEMY_BY_ID.get(enemy.defId);
  const aura =
    (hasAliveAura(enemy, "atk+2") ? 2 : 0) +
    (hasAliveAura(enemy, "atk+3") ? 3 : 0) +
    (enemy.rage ?? 0);
  const perkMods = sourceMods(next);
  const tide = Math.max(
    0,
    Math.max(0, next.tide) +
      Math.max(0, next.interference) +
      perkMods.tideEffectDelta,
  );
  const authored =
    def?.boss === true || def?.miniboss === true || def?.elite === true;
  const damageMultPct =
    battleMutators(next).damageMultPct +
    (authored ? 0 : Math.max(0, next.sectorDmgPct));
  const chargeMult = consumeStatus(enemy.statuses, "charge") ? 2 : 1;
  const jamPenalty = consumeStatus(enemy.statuses, "jam")
    ? 2 + perkMods.jamPowerDelta
    : 0;
  const evasion = next.evasion;
  const rolls = evasion !== null && evasion.dodgePct + evasion.glancingPct > 0;
  let dealt = 0;
  let hullDamage = 0;
  let shieldDamage = 0;
  let dodged = 0;
  let glanced = 0;
  for (let i = 0; i < hits; i += 1) {
    let damage = Math.max(
      0,
      scaleDamage(
        (perHit + aura + tide) * chargeMult - (i === 0 ? jamPenalty : 0),
        damageMultPct,
      ),
    );
    if (rolls && evasion !== null) {
      const roll = context.defense.int(1, 100);
      if (roll <= evasion.dodgePct) {
        dodged += 1;
        rewardDodge(next, enemy, context, evasion);
        continue;
      }
      if (roll <= evasion.dodgePct + evasion.glancingPct) {
        glanced += 1;
        damage = Math.ceil(damage / 2);
      }
    }
    const absorbed = Math.min(next.shield, damage);
    next.shield -= absorbed;
    const toHull = damage - absorbed;
    next.hull = Math.max(0, next.hull - toHull);
    dealt += damage;
    hullDamage += toHull;
    shieldDamage += absorbed;
  }
  return { dealt, hullDamage, shieldDamage, dodged, glanced };
};

const lockRandomTrayDie = (
  next: BattleSnapshot,
  enemyStream: RngStream,
  pick?: "highest",
): string | undefined => {
  const candidates = next.dice.filter(
    (d) =>
      d.state === "tray" &&
      !isDieLocked(next, d.uid) &&
      !dieHasGrant(next.engravings, d.defId, "lockImmune"),
  );
  if (candidates.length === 0) return undefined;
  const die =
    pick === "highest"
      ? candidates.reduce((best, d) => (d.value > best.value ? d : best))
      : enemyStream.pick(candidates);
  next.lockedDice.push({ uid: die.uid, untilTurn: next.turn + 1 });
  return die.uid;
};

const curseTrayDie = (
  next: BattleSnapshot,
  enemyStream: RngStream,
  n: number,
): string | undefined => {
  const candidates = next.dice.filter((d) => d.state === "tray");
  if (candidates.length === 0) return undefined;
  const die = enemyStream.pick(candidates);
  next.cursedDice = [
    ...(next.cursedDice ?? []),
    { uid: die.uid, n, untilTurn: next.turn + 2 },
  ];
  return die.uid;
};

export const MIRROR_SCHOOL_MULT = 1;
export const MIRROR_SCHOOL_CAP = 10;

const largestSchoolCount = (next: BattleSnapshot): number =>
  Math.max(0, ...Object.values(next.resonance.counts));

export const stealScrap = (next: BattleSnapshot, n: number): number => {
  const fromBattle = Math.min(next.scrap, n);
  next.scrap -= fromBattle;
  const fromRun = n - fromBattle;
  next.stolenScrap += fromRun;
  next.runScrap = Math.max(0, next.runScrap - fromRun);
  return n;
};

const shrinkRandomSlot = (
  next: BattleSnapshot,
  enemyStream: RngStream,
): SlotId | undefined => {
  const candidates = (Object.keys(next.slots) as SlotId[]).filter(
    (slotId) => !isSlotShrunk(next, slotId),
  );
  if (candidates.length === 0) return undefined;
  const slot = enemyStream.pick(candidates);
  next.shrunkSlots.push({ slot, untilTurn: next.turn + 1 });
  return slot;
};

interface EnemyPhaseCtx {
  next: BattleSnapshot;
  beats: EnemyBeat[];
  enemyStream: RngStream;
  attack: AttackContext;
}

const pushBeat = (
  ctx: EnemyPhaseCtx,
  enemyId: string,
  kind: EnemyBeatKind,
  amount = 0,
  extra: Partial<EnemyBeat> = {},
): void => {
  ctx.beats.push({
    enemyId,
    kind,
    amount,
    hullDamage: 0,
    shieldDamage: 0,
    ...extra,
    after: clone(ctx.next),
  });
};

const pushAttackBeat = (
  ctx: EnemyPhaseCtx,
  enemy: EnemyState,
  result: AttackResult,
): void => {
  ctx.beats.push({
    enemyId: enemy.id,
    kind: "attack",
    amount: result.dealt,
    hullDamage: result.hullDamage,
    shieldDamage: result.shieldDamage,
    ...(result.dodged > 0 ? { dodged: result.dodged } : {}),
    ...(result.glanced > 0 ? { glanced: result.glanced } : {}),
    after: clone(ctx.next),
  });
};

const stealsOnHit = (enemy: EnemyState, def: EnemyDef): number => {
  if (hasAliveAura(enemy, "stealOnHit6")) return 6;
  return def.stealOnHit ?? 0;
};

const resolveIntent = (
  ctx: EnemyPhaseCtx,
  enemy: EnemyState,
  def: EnemyDef,
  intent: Intent,
): void => {
  const { next, enemyStream } = ctx;
  switch (intent.t) {
    case "attack":
    case "multi": {
      const hits = intent.t === "multi" ? intent.k : 1;
      const result = applyAttack(next, enemy, intent.n, hits, ctx.attack);
      pushAttackBeat(ctx, enemy, result);
      const steal = stealsOnHit(enemy, def);
      if (steal > 0 && result.dealt > 0) {
        stealScrap(next, steal);
        pushBeat(ctx, enemy.id, "steal", steal);
      }
      if (intent.t === "attack" && (intent.self ?? 0) > 0) {
        enemy.hp = Math.max(0, enemy.hp - (intent.self ?? 0));
        if (enemy.hp === 0) {
          for (const sub of enemy.subsystems) sub.hp = 0;
          handleDeath(next, enemy);
          if (enemy.id === next.targetId) {
            next.targetId = aliveEnemies(next)[0]?.id ?? null;
          }
        }
      }
      return;
    }
    case "shield":
      enemy.shield += intent.n;
      pushBeat(ctx, enemy.id, "shield", intent.n);
      return;
    case "shieldAll":
      for (const ally of aliveEnemies(next)) ally.shield += intent.n;
      pushBeat(ctx, enemy.id, "shieldAll", intent.n);
      return;
    case "healAllies":
      for (const ally of aliveEnemies(next)) {
        ally.hp = Math.min(ally.hpMax, ally.hp + intent.n);
      }
      pushBeat(ctx, enemy.id, "heal", intent.n);
      return;
    case "charge":
      applyStatus(enemy.statuses, "charge");
      pushBeat(ctx, enemy.id, "charge");
      return;
    case "mirrorHalf": {
      const mirrored = Math.min(
        MIRROR_CAP,
        Math.ceil(Math.max(0, next.lastPlayerDamage) / 2),
      );
      const result = applyAttack(next, enemy, mirrored, 1, ctx.attack);
      pushAttackBeat(ctx, enemy, result);
      return;
    }
    case "stealScrap":
      stealScrap(next, intent.n);
      pushBeat(ctx, enemy.id, "steal", intent.n);
      return;
    case "jamSlot": {
      for (let i = 0; i < (intent.k ?? 1); i += 1) {
        const candidates = (Object.keys(next.slots) as SlotId[]).filter(
          (slotId) => !isSlotBlocked(next, slotId),
        );
        if (candidates.length === 0) return;
        const slot = enemyStream.pick(candidates);
        next.blockedSlots.push({ slot, untilTurn: next.turn + 1 });
        pushBeat(ctx, enemy.id, "jamSlot", 0, { slot });
      }
      return;
    }
    case "capShrink": {
      const slot = shrinkRandomSlot(next, enemyStream);
      if (slot === undefined) return;
      pushBeat(ctx, enemy.id, "capShrink", 0, { slot });
      return;
    }
    case "lockDie": {
      const uid = lockRandomTrayDie(next, enemyStream, intent.target);
      if (uid === undefined) return;
      pushBeat(ctx, enemy.id, "lockDie", 0, { dieUid: uid });
      return;
    }
    case "curseDie": {
      const uid = curseTrayDie(next, enemyStream, intent.n);
      if (uid === undefined) return;
      pushBeat(ctx, enemy.id, "curse", intent.n, { dieUid: uid });
      return;
    }
    case "shieldGate":
      enemy.gate = intent.n;
      pushBeat(ctx, enemy.id, "gate", intent.n);
      return;
    case "mirrorSchool": {
      const mirrored = Math.min(
        MIRROR_SCHOOL_CAP,
        largestSchoolCount(next) * MIRROR_SCHOOL_MULT,
      );
      const result = applyAttack(next, enemy, mirrored, 1, ctx.attack);
      pushAttackBeat(ctx, enemy, result);
      return;
    }
    case "drainCharge": {
      const hoarded = next.charge >= intent.n;
      next.charge = Math.max(0, next.charge - intent.n);
      if (hoarded) applyStatus(enemy.statuses, "charge");
      pushBeat(ctx, enemy.id, "drain", intent.n);
      return;
    }
    case "siphonShield": {
      const taken = Math.min(next.shield, intent.n);
      next.shield -= taken;
      enemy.shield += taken;
      pushBeat(ctx, enemy.id, "siphon", taken);
      return;
    }
    case "bargain": {
      if (next.scrap + next.runScrap >= intent.n) {
        stealScrap(next, intent.n);
        enemy.hp = Math.min(enemy.hpMax, enemy.hp + intent.heal);
        pushBeat(ctx, enemy.id, "bargain", intent.heal);
        return;
      }
      const result = applyAttack(next, enemy, intent.n, 1, ctx.attack);
      pushAttackBeat(ctx, enemy, result);
      return;
    }
    case "enrage":
      enemy.rage = (enemy.rage ?? 0) + intent.n;
      pushBeat(ctx, enemy.id, "enrage", enemy.rage);
      return;
    case "hijack":
      next.pendingHijack = (next.pendingHijack ?? 0) + 1;
      pushBeat(ctx, enemy.id, "hijack");
      return;
    case "echoTotal": {
      const echoed = Math.min(intent.cap, Math.max(0, next.lastPlayerDamage));
      if (echoed <= 0) {
        pushBeat(ctx, enemy.id, "charge");
        return;
      }
      const result = applyAttack(next, enemy, echoed, 1, ctx.attack);
      pushAttackBeat(ctx, enemy, result);
      return;
    }
    case "foldOrder":
      next.foldedTurns = (next.foldedTurns ?? 0) + 2;
      pushBeat(ctx, enemy.id, "fold");
      return;
    case "devourDie": {
      const tray = next.dice.filter((d) => d.state === "tray");
      if (tray.length === 0) {
        pushBeat(ctx, enemy.id, "devour");
        return;
      }
      const die = tray.reduce((best, d) => (d.value > best.value ? d : best));
      const eaten = die.value;
      enemy.shield += eaten;
      die.value = 1;
      pushBeat(ctx, enemy.id, "devour", eaten, { dieUid: die.uid });
      return;
    }
    case "twistDie":
      next.pendingTwist += 1;
      pushBeat(ctx, enemy.id, "twist");
      return;
    case "swapValues":
      next.pendingSwap += 1;
      pushBeat(ctx, enemy.id, "swap");
      return;
    case "storm":
      next.pendingStorm += 1;
      pushBeat(ctx, enemy.id, "storm");
      return;
    case "summon": {
      if (aliveEnemies(next).length >= MAX_ENEMIES) return;
      const spawned = spawnEnemy(
        intent.id,
        `enemy-${String(next.enemies.length)}`,
        enemyStream,
        enemySpawnInit(next),
      );
      next.enemies.push(spawned);
      pushBeat(ctx, enemy.id, "summon");
      return;
    }
  }
};

const syncPhases = (ctx: EnemyPhaseCtx): void => {
  for (const enemy of aliveEnemies(ctx.next)) {
    const def = ENEMY_BY_ID.get(enemy.defId);
    if (def?.phases === undefined || def.phases.length === 0) continue;
    const target = phaseIndexForHp(
      def,
      enemy.hp,
      enemy.hpMax,
      ctx.next.ascension,
    );
    if (target === enemy.phase) continue;
    enemy.phase = target;
    enemy.intentIndex = 0;
    enemy.nextIntent = drawIntent(
      def,
      0,
      ctx.enemyStream,
      target,
      ctx.next.ascension,
      stepContextFor(ctx.next, enemy),
    );
    pushBeat(ctx, enemy.id, "phase", target);
    for (const intent of def.phases[target]?.onEnter ?? []) {
      resolveIntent(ctx, enemy, def, intent);
    }
  }
};

const resolveAuras = (ctx: EnemyPhaseCtx): void => {
  const { next, enemyStream } = ctx;
  for (const enemy of aliveEnemies(next)) {
    if (hasAliveAura(enemy, "shieldAllies3")) {
      for (const ally of aliveEnemies(next)) ally.shield += 3;
      pushBeat(ctx, enemy.id, "shieldAll", 3);
    }
    if (hasAliveAura(enemy, "shieldSelf6")) {
      enemy.shield += 6;
      pushBeat(ctx, enemy.id, "shield", 6);
    }
    if (hasAliveAura(enemy, "chargeAllies") && next.turn % 3 === 0) {
      for (const ally of aliveEnemies(next)) applyStatus(ally.statuses, "charge");
      pushBeat(ctx, enemy.id, "charge");
    }
    const twists = countAliveAura(enemy, "twistEachTurn");
    if (twists > 0) {
      next.pendingTwist += twists;
      pushBeat(ctx, enemy.id, "twist", twists);
    }
    const locksNow =
      hasAliveAura(enemy, "lockEachTurn") ||
      (hasAliveAura(enemy, "lockEvery3") && next.turn % 3 === 0);
    if (locksNow) {
      const uid = lockRandomTrayDie(next, enemyStream);
      if (uid !== undefined) pushBeat(ctx, enemy.id, "lockDie", 0, { dieUid: uid });
    }
    if (
      hasAliveAura(enemy, "summonEvery4") &&
      next.turn % 4 === 0 &&
      aliveEnemies(next).length < MAX_ENEMIES
    ) {
      next.enemies.push(
        spawnEnemy(
          "choirAcolyte",
          `enemy-${String(next.enemies.length)}`,
          enemyStream,
          enemySpawnInit(next),
        ),
      );
      pushBeat(ctx, enemy.id, "summon");
    }
  }
};

export const resolveEnemyPhase = (
  snapshot: BattleSnapshot,
  enemyStream: RngStream,
  defenseStream: RngStream = enemyStream,
): { next: BattleSnapshot; beats: EnemyBeat[] } => {
  const next = clone(snapshot);
  const beats: EnemyBeat[] = [];
  const ctx: EnemyPhaseCtx = {
    next,
    beats,
    enemyStream,
    attack: { firstDodgeSpent: false, defense: defenseStream },
  };

  const decayPct = battleMutators(next).shieldDecayPct;
  if (decayPct > 0 && next.shield > 0) {
    next.shield = Math.floor((next.shield * (100 - decayPct)) / 100);
  }

  syncPhases(ctx);
  resolveAuras(ctx);

  for (const enemy of next.enemies) {
    if (enemy.hp <= 0) continue;
    const def = ENEMY_BY_ID.get(enemy.defId);
    if (def === undefined) continue;

    for (const extra of everyTurnFor(def, enemy.phase)) {
      resolveIntent(ctx, enemy, def, extra);
    }
    if (enemy.hp <= 0) continue;

    resolveIntent(ctx, enemy, def, enemy.nextIntent);

    const pattern = patternFor(def, enemy.phase, next.ascension);
    enemy.intentIndex = (enemy.intentIndex + 1) % pattern.length;
    enemy.nextIntent = drawIntent(
      def,
      enemy.intentIndex,
      enemyStream,
      enemy.phase,
      next.ascension,
      stepContextFor(next, enemy),
    );
    if (def.ward === true) {
      enemy.ward = rotateWard(enemy.ward, enemyStream);
      pushBeat(ctx, enemy.id, "ward");
    }
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

  const effectCtx = new BattleCtx(next, next.flags);
  const sources = buildSources(next);
  emit(sources, "enemyTurnEnd", effectCtx);

  const passive =
    next.shipId !== undefined ? SHIP_BY_ID.get(next.shipId)?.passive : undefined;
  const bulwarkFloor =
    passive?.kind === "bulwark" && next.shield > 0
      ? Math.floor(next.shield * (passive.keepPct / 100))
      : 0;
  next.shield = Math.min(
    next.shield,
    Math.max(next.shieldPersist, bulwarkFloor),
  );
  finalizeOutcome(next);
  emitBattleEnd(sources, effectCtx, next, 0);
  syncCtxFlags(next, effectCtx);
  return { next, beats };
};

const clampToTier = (die: RolledDie, value: number): number =>
  Math.min(die.tier, Math.max(1, value));

export const applyPendingTwists = (
  next: BattleSnapshot,
  dice: RolledDie[],
  rng: RngStream,
): void => {
  for (let i = 0; i < next.pendingTwist && dice.length > 0; i += 1) {
    const die = rng.pick(dice);
    const reroll = rng.int(1, die.tier) + (die.growth ?? 0);
    die.value = clampToTier(die, Math.min(die.value, reroll));
  }
  for (let i = 0; i < next.pendingSwap && dice.length > 1; i += 1) {
    const sorted = [...dice].sort((a, b) => a.value - b.value);
    const low = sorted[0];
    const high = sorted[sorted.length - 1];
    if (low === undefined || high === undefined || low.uid === high.uid) break;
    const lowValue = low.value;
    low.value = clampToTier(low, high.value);
    high.value = clampToTier(high, lowValue);
  }
  for (let i = 0; i < next.pendingStorm; i += 1) {
    for (let k = 0; k < 2 && dice.length > 0; k += 1) {
      const die = rng.pick(dice);
      die.value = clampToTier(die, die.value + rng.pick([-1, 1]));
    }
  }
  next.pendingTwist = 0;
  next.pendingSwap = 0;
  next.pendingStorm = 0;
};

const applyHijack = (next: BattleSnapshot, rng: RngStream): void => {
  const pending = next.pendingHijack ?? 0;
  next.pendingHijack = 0;
  if (pending <= 0) return;
  for (let i = 0; i < pending; i += 1) {
    const tray = next.dice.filter((d) => d.state === "tray");
    if (tray.length === 0) return;
    const die = tray.reduce((best, d) => (d.value > best.value ? d : best));
    const open = (Object.entries(next.slots) as [SlotId, SlotState][]).filter(
      ([id, slot]) =>
        slot.dieUid === undefined &&
        !isSlotBlocked(next, id) &&
        dieFitsSlot(next, die, slot, id),
    );
    if (open.length === 0) return;
    const [chosen, slot] = rng.pick(open);
    die.state = "placed";
    die.slot = chosen;
    die.pinned = true;
    slot.dieUid = die.uid;
  }
};

export const advanceTurn = (
  snapshot: BattleSnapshot,
  streams: RngStreams,
): BattleSnapshot => {
  const next = clone(snapshot);
  next.turn += 1;
  next.foldedTurns = Math.max(0, (next.foldedTurns ?? 0) - 1);
  const ctx = new BattleCtx(next, next.flags);
  const sources = buildSources(next);
  emit(sources, "rollStart", ctx);
  next.blockedSlots = next.blockedSlots.filter((b) => b.untilTurn >= next.turn);
  next.shrunkSlots = next.shrunkSlots.filter((b) => b.untilTurn >= next.turn);
  next.lockedDice = next.lockedDice.filter((l) => l.untilTurn >= next.turn);
  next.cursedDice = (next.cursedDice ?? []).filter(
    (c) => c.untilTurn >= next.turn,
  );
  next.dice = next.dice.filter(
    (die) => die.expiresTurn === undefined || die.expiresTurn >= next.turn,
  );
  next.dice = next.dice.map((die) => {
    if (isDieLocked(next, die.uid)) {
      return {
        ...die,
        state: "locked" as const,
        slot: undefined,
        lastValue: undefined,
        pinned: undefined,
      };
    }
    if (die.state === "reserved") {
      return {
        ...die,
        state: "tray" as const,
        slot: undefined,
        lastValue: undefined,
        pinned: undefined,
      };
    }
    const base = rollBaseValue(die.defId, die.tier, streams.dice);
    const rolled = Math.min(die.tier, Math.max(1, base + next.nextRollBonus));
    const banked = die.bankedValue;
    const shown = banked ?? rolled + (die.growth ?? 0);
    return {
      ...die,
      value: Math.max(1, shown - curseOn(next, die.uid)),
      lastValue: die.value,
      state: "tray" as const,
      slot: undefined,
      pinned: undefined,
      bankedValue: undefined,
      activeUsed: banked === undefined ? die.activeUsed : false,
    };
  });
  for (const slot of Object.values(next.slots)) {
    slot.dieUid = undefined;
  }
  for (const enemy of next.enemies) clearMark(enemy.statuses);
  next.evasion = null;
  next.nextRollBonus = 0;
  next.sacrificePool = 0;
  next.bloodReactorUsed = false;

  const rolledDice = next.dice.filter(
    (d) => d.state === "tray" && d.lastValue !== undefined,
  );
  applyPendingTwists(next, rolledDice, streams.dice);
  applyRollFloors(rolledDice, next.resonance, sourceTrait(next, "stabilizer"));
  if (sourceTrait(next, "spareLowest")) applySpareLowest(rolledDice);
  applyObsidianPact(rolledDice, next.perks, next.chartPicks ?? [], next.modules ?? []);

  const rolledSources = buildSources(next);
  for (const die of rolledDice) {
    ctx.subjectDie = die;
    emit(rolledSources, "rolled", ctx);
  }
  ctx.subjectDie = null;
  applyHijack(next, streams.dice);
  syncCtxFlags(next, ctx);

  return next;
};
