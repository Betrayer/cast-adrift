import { ENEMY_BY_ID } from "@/data/enemies";
import { echoShieldCharge } from "@/data/echo";
import { dieHasGrant } from "@/data/engravings";
import {
  aliveEnemies,
  coreLocked,
  handleDeath,
  partDefOf,
  silencePartsOnBodyDeath,
} from "@/game/battle/damage";
import { INTERCEPT_WEAPONS_BONUS } from "@/game/battle/evasion";
import { shipProfile } from "@/game/battle/passives";
import {
  isDieLocked,
  isSlotBlocked,
  isSlotShrunk,
} from "@/game/battle/placement";
import {
  battleMutators,
  clone,
  emitBattleEnd,
  finalizeOutcome,
  scaleDamage,
  syncCtxFlags,
} from "@/game/battle/resolveShared";
import {
  drawIntent,
  drawPartIntent,
  everyTurnFor,
  MAX_ENEMIES,
  patternFor,
  phaseIndexForHp,
  rotateWard,
  spawnEnemy,
  stepContextFor,
  type SpawnInit,
} from "@/game/battle/spawn";
import {
  applyStatus,
  consumeStatus,
  tickBurn,
} from "@/game/battle/statuses";
import { BattleCtx, buildSources, emit } from "@/game/effects";
import { sourceMods, sourceTrait } from "@/game/run/runMods";
import type { RngStream } from "@/services/rng";
import type {
  BattleSnapshot,
  EnemyBeat,
  EnemyBeatKind,
  EnemyState,
  EvasionState,
  SlotId,
  SubsystemState,
} from "@/types/battle";
import type { EnemyDef, Intent } from "@/types/content";

const enemySpawnInit = (next: BattleSnapshot): SpawnInit => ({
  tide: next.tide,
  sectorHpPct: next.sectorHpPct,
  hpBonusPct: next.enemyHpPct,
  ascension: next.ascension,
});

export const MIRROR_CAP = 12;
export const REFLECT_DODGE_DAMAGE = 3;

const hasAliveAura = (
  enemy: EnemyState,
  aura: SubsystemState["aura"],
): boolean => enemy.subsystems.some((s) => s.hp > 0 && s.aura === aura);

export const enemyAuraAttack = (enemy: EnemyState): number =>
  (hasAliveAura(enemy, "atk+2") ? 2 : 0) +
  (hasAliveAura(enemy, "atk+3") ? 3 : 0) +
  (enemy.rage ?? 0);

const countAliveAura = (
  enemy: EnemyState,
  aura: SubsystemState["aura"],
): number => enemy.subsystems.filter((s) => s.hp > 0 && s.aura === aura).length;

interface AttackContext {
  firstEvasionSpent: boolean;
  afterburnerGranted: number;
  defense: RngStream;
}

export interface AttackResult {
  dealt: number;
  hullDamage: number;
  shieldDamage: number;
  dodged: number;
  glanced: number;
}

const rewardEvade = (
  next: BattleSnapshot,
  context: AttackContext,
): void => {
  const rule = shipProfile(next.shipId).afterburner;
  if (rule === null || context.afterburnerGranted >= rule.cap) return;
  const grant = Math.min(rule.weapons, rule.cap - context.afterburnerGranted);
  context.afterburnerGranted += grant;
  next.nextTurnMods.weapons = (next.nextTurnMods.weapons ?? 0) + grant;
};

const rewardFirstEvasion = (
  next: BattleSnapshot,
  enemy: EnemyState,
  context: AttackContext,
  evasion: EvasionState,
): void => {
  if (context.firstEvasionSpent) return;
  context.firstEvasionSpent = true;
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

export const incomingHits = (
  next: BattleSnapshot,
  enemy: EnemyState,
  perHit: number,
  hits: number,
): number[] => {
  const def = ENEMY_BY_ID.get(enemy.defId);
  const aura = enemyAuraAttack(enemy);
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
  const chargeMult = enemy.statuses.charge === undefined ? 1 : 2;
  const jamPenalty =
    enemy.statuses.jam === undefined ? 0 : 2 + perkMods.jamPowerDelta;
  const out: number[] = [];
  for (let i = 0; i < hits; i += 1) {
    out.push(
      Math.max(
        0,
        scaleDamage(
          (perHit + aura + tide) * chargeMult - (i === 0 ? jamPenalty : 0),
          damageMultPct,
        ),
      ),
    );
  }
  return out;
};

const applyAttack = (
  next: BattleSnapshot,
  enemy: EnemyState,
  perHit: number,
  hits: number,
  context: AttackContext,
): AttackResult => {
  const raw = incomingHits(next, enemy, perHit, hits);
  consumeStatus(enemy.statuses, "charge");
  consumeStatus(enemy.statuses, "jam");
  const evasion = next.evasion;
  const rolls = evasion !== null && evasion.dodgePct + evasion.glancingPct > 0;
  let dealt = 0;
  let hullDamage = 0;
  let shieldDamage = 0;
  let dodged = 0;
  let glanced = 0;
  for (let i = 0; i < raw.length; i += 1) {
    let damage = raw[i] ?? 0;
    if (rolls && evasion !== null) {
      const roll = context.defense.int(1, 100);
      if (roll <= evasion.dodgePct) {
        dodged += 1;
        rewardFirstEvasion(next, enemy, context, evasion);
        rewardEvade(next, context);
        continue;
      }
      if (roll <= evasion.dodgePct + evasion.glancingPct) {
        glanced += 1;
        damage = Math.ceil(damage / 2);
        rewardFirstEvasion(next, enemy, context, evasion);
        rewardEvade(next, context);
      }
    }
    const absorbed = Math.min(next.shield, damage);
    next.shield -= absorbed;
    const toHull = damage - absorbed;
    next.hull = Math.max(0, next.hull - toHull);
    const echoCharge = echoShieldCharge(next.echo);
    if (echoCharge > 0 && damage > 0 && toHull === 0) {
      next.charge = Math.min(next.chargeCap, next.charge + echoCharge);
    }
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

export const largestSchoolCount = (next: BattleSnapshot): number =>
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

export interface IntentThreat {
  perHit: number;
  hits: number;
}

export const intentMagnitude = (
  next: BattleSnapshot,
  intent: Intent,
): IntentThreat | null => {
  switch (intent.t) {
    case "attack":
      return { perHit: intent.n, hits: 1 };
    case "multi":
      return { perHit: intent.n, hits: intent.k };
    case "mirrorHalf":
      return {
        perHit: Math.min(
          MIRROR_CAP,
          Math.ceil(Math.max(0, next.lastPlayerDamage) / 2),
        ),
        hits: 1,
      };
    case "mirrorSchool":
      return {
        perHit: Math.min(
          MIRROR_SCHOOL_CAP,
          largestSchoolCount(next) * MIRROR_SCHOOL_MULT,
        ),
        hits: 1,
      };
    case "echoTotal":
      return {
        perHit: Math.min(intent.cap, Math.max(0, next.lastPlayerDamage)),
        hits: 1,
      };
    case "bargain":
      return next.scrap + next.runScrap >= intent.n
        ? null
        : { perHit: intent.n, hits: 1 };
    default:
      return null;
  }
};

export const intentHits = (
  next: BattleSnapshot,
  enemy: EnemyState,
  intent: Intent,
): number[] => {
  const magnitude = intentMagnitude(next, intent);
  if (magnitude === null) return [];
  if (intent.t === "echoTotal" && magnitude.perHit <= 0) return [];
  return incomingHits(next, enemy, magnitude.perHit, magnitude.hits);
};

interface EnemyPhaseCtx {
  next: BattleSnapshot;
  beats: EnemyBeat[];
  enemyStream: RngStream;
  attack: AttackContext;
  actingPartId?: string;
}

const actingPart = (ctx: EnemyPhaseCtx): Partial<EnemyBeat> =>
  ctx.actingPartId === undefined ? {} : { partId: ctx.actingPartId };

const pushBeat = (
  ctx: EnemyPhaseCtx,
  enemyId: string,
  kind: EnemyBeatKind,
  amount = 0,
  extra: Partial<EnemyBeat> = {},
): void => {
  ctx.beats.push({
    enemyId,
    ...actingPart(ctx),
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
    ...actingPart(ctx),
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
          silencePartsOnBodyDeath(enemy);
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
    case "idle":
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

const drainPendingAdds = (ctx: EnemyPhaseCtx): void => {
  const queued = ctx.next.pendingAdds ?? [];
  if (queued.length === 0) return;
  ctx.next.pendingAdds = [];
  for (const defId of queued) {
    if (aliveEnemies(ctx.next).length >= MAX_ENEMIES) continue;
    const spawned = spawnEnemy(
      defId,
      `enemy-${String(ctx.next.enemies.length)}`,
      ctx.enemyStream,
      enemySpawnInit(ctx.next),
    );
    ctx.next.enemies.push(spawned);
    pushBeat(ctx, spawned.id, "summon");
  }
};

const resolveParts = (
  ctx: EnemyPhaseCtx,
  enemy: EnemyState,
  def: EnemyDef,
): void => {
  const { next, enemyStream } = ctx;
  for (const part of enemy.subsystems) {
    if (enemy.hp <= 0) return;
    if (part.hp <= 0 || part.nextIntent === undefined) continue;
    const partDef = partDefOf(def, part);
    if (partDef === undefined) continue;
    ctx.actingPartId = part.id;
    resolveIntent(ctx, enemy, def, part.nextIntent);
    ctx.actingPartId = undefined;
    if (part.hp <= 0) continue;
    const steps = (partDef.intents ?? []).length;
    if (steps === 0) continue;
    part.intentIndex = ((part.intentIndex ?? 0) + 1) % steps;
    part.nextIntent = drawPartIntent(
      partDef,
      part.intentIndex,
      enemyStream,
      stepContextFor(next, enemy),
    );
  }
};

const rewindParts = (
  ctx: EnemyPhaseCtx,
  enemy: EnemyState,
  def: EnemyDef,
): void => {
  for (const part of enemy.subsystems) {
    if (part.hp <= 0) continue;
    const partDef = partDefOf(def, part);
    if (partDef === undefined) continue;
    const opening = drawPartIntent(
      partDef,
      0,
      ctx.enemyStream,
      stepContextFor(ctx.next, enemy),
    );
    if (opening === undefined) continue;
    part.intentIndex = 0;
    part.nextIntent = opening;
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
    rewindParts(ctx, enemy, def);
    pushBeat(ctx, enemy.id, "phase", target);
    for (const intent of def.phases[target]?.onEnter ?? []) {
      resolveIntent(ctx, enemy, def, intent);
    }
  }
};

export const chargeAuraActive = (next: BattleSnapshot): boolean =>
  next.turn % 3 === 0 &&
  aliveEnemies(next).some((enemy) => hasAliveAura(enemy, "chargeAllies"));

export const applyChargeAuras = (next: BattleSnapshot): void => {
  if (!chargeAuraActive(next)) return;
  for (const ally of aliveEnemies(next)) applyStatus(ally.statuses, "charge");
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
      applyChargeAuras(next);
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
    attack: {
      firstEvasionSpent: false,
      afterburnerGranted: 0,
      defense: defenseStream,
    },
  };

  const decayPct = battleMutators(next).shieldDecayPct;
  if (decayPct > 0 && next.shield > 0) {
    next.shield = Math.floor((next.shield * (100 - decayPct)) / 100);
  }

  drainPendingAdds(ctx);
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
    resolveParts(ctx, enemy, def);
  }

  for (const enemy of aliveEnemies(next)) {
    const burnDamage = tickBurn(enemy.statuses);
    if (burnDamage <= 0) continue;
    if (coreLocked(next, enemy)) continue;
    enemy.hp = Math.max(0, enemy.hp - burnDamage);
    if (enemy.hp === 0) {
      silencePartsOnBodyDeath(enemy);
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

  const keepPct =
    shipProfile(next.shipId).shieldKeepPct + sourceMods(next).shieldKeepPct;
  const bulwarkFloor =
    keepPct > 0 && next.shield > 0
      ? Math.floor(next.shield * (keepPct / 100))
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
