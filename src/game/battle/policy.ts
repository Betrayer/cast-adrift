import { aimedEnemy, livingPartIntents } from "@/game/battle/target";
import {
  echoCalculusWeapons,
  echoIsBattleActive,
  echoSecondLookDice,
  echoToken,
  type EchoNodeId,
} from "@/data/echo";
import { ENEMY_BY_ID } from "@/data/enemies";
import { resonanceGrantActive } from "@/data/resonance";
import {
  DIRECT,
  FIRE_MODE_SLOTS,
  fireModeAllowed,
  type FireModeId,
} from "@/data/fireModes";
import {
  CABIN_CAP,
  officerActions,
  officerActiveDead,
  officerChargeCost,
  officerDef,
  type OfficerDef,
} from "@/data/officers";
import { computeMutatorMods } from "@/data/mutators";
import { applyActions, BattleCtx } from "@/game/effects";
import { isBodyImmune } from "@/game/battle/damage";
import { isInverted } from "@/game/battle/order";
import {
  BASE_EVASION,
  enemyAuraAttack,
  evasionFor,
  evasionTuningFor,
  intentMagnitude,
  nudgeChargeCost,
  resolvePlayerPhase,
  scaleDamage,
  vulnerableFor,
} from "@/game/battle/resolver";
import type { EvasionTuning } from "@/game/battle/passives";
import { canPlaceDie, isSlotBlocked } from "@/game/battle/setup";
import { sourceMods, sourceTrait } from "@/game/run/runMods";
import type { RngStream } from "@/services/rng";
import type {
  BattleSnapshot,
  EnemyState,
  RolledDie,
  SlotId,
} from "@/types/battle";
import type { Intent } from "@/types/content";

export interface PolicyPlacement {
  uid: string;
  slot: SlotId;
  mode?: FireModeId;
}

export interface PolicyDecision {
  targetId: string | null;
  placements: PolicyPlacement[];
  reserveUid?: string;
  active?: string;
  echo?: EchoNodeId;
}

const WEAPON_SLOTS: readonly SlotId[] = ["weaponA", "weaponB"];
const SHIELD_SLOTS: readonly SlotId[] = ["shields", "shieldsB"];
const ENGINE_SLOTS: readonly SlotId[] = ["engines", "enginesB"];
const REPAIR_HULL_PCT = 0.6;

const trayDice = (snapshot: BattleSnapshot): RolledDie[] =>
  snapshot.dice.filter((d) => d.state === "tray");

export const expectedSum = (dice: readonly RolledDie[]): number =>
  dice.reduce((sum, d) => sum + (d.tier + 1) / 2, 0);

const actingIntents = (enemy: EnemyState): Intent[] => [
  enemy.nextIntent,
  ...livingPartIntents(enemy),
];

export const incomingEstimate = (snapshot: BattleSnapshot): number => {
  const pressure = Math.max(
    0,
    Math.max(0, snapshot.tide) +
      Math.max(0, snapshot.interference) +
      sourceMods(snapshot).tideEffectDelta,
  );
  const mutatorDmgPct = computeMutatorMods(snapshot.mutators ?? []).damageMultPct;
  let total = 0;
  for (const enemy of snapshot.enemies) {
    if (enemy.hp <= 0) continue;
    const def = ENEMY_BY_ID.get(enemy.defId);
    const authored =
      def?.boss === true || def?.miniboss === true || def?.elite === true;
    const damageMultPct =
      mutatorDmgPct + (authored ? 0 : Math.max(0, snapshot.sectorDmgPct));
    let charged = enemy.statuses.charge !== undefined;
    for (const intent of actingIntents(enemy)) {
      const threat = intentMagnitude(snapshot, intent);
      if (threat === null) continue;
      const mult = charged ? 2 : 1;
      charged = false;
      total +=
        threat.hits *
        Math.max(
          0,
          scaleDamage(
            (threat.perHit + enemyAuraAttack(enemy) + pressure) * mult,
            damageMultPct,
          ),
        );
    }
  }
  return total;
};

const enemiesIntending = (
  snapshot: BattleSnapshot,
  kind: Intent["t"],
): EnemyState[] =>
  snapshot.enemies.filter(
    (e) => e.hp > 0 && actingIntents(e).some((intent) => intent.t === kind),
  );

export const shieldsWasted = (snapshot: BattleSnapshot): boolean =>
  enemiesIntending(snapshot, "siphonShield").length > 0;

export const trayAtRisk = (snapshot: BattleSnapshot): boolean =>
  enemiesIntending(snapshot, "devourDie").length > 0 ||
  enemiesIntending(snapshot, "lockDie").length > 0;

export const gateOf = (enemy: EnemyState | undefined): number =>
  enemy === undefined ? 0 : (enemy.gate ?? 0);

export const decideReroll = (snapshot: BattleSnapshot): string[] => {
  const tray = trayDice(snapshot);
  const sum = tray.reduce((acc, d) => acc + d.value, 0);
  if (sum >= expectedSum(tray)) return [];
  return [...tray]
    .sort((a, b) => a.value - b.value)
    .slice(0, 2)
    .map((d) => d.uid);
};

export const rerollValue = (
  die: RolledDie,
  snapshot: BattleSnapshot,
  rng: RngStream,
): number => {
  const rolled = rng.int(1, die.tier) + (die.growth ?? 0);
  return die.school === "blue" &&
    resonanceGrantActive(snapshot.resonance.counts, "blueRollFloor")
    ? Math.max(rolled, 2)
    : rolled;
};

const freeWeaponSlots = (
  snapshot: BattleSnapshot,
  placed: ReadonlySet<SlotId>,
): SlotId[] => {
  const open = WEAPON_SLOTS.filter(
    (slotId) =>
      snapshot.slots[slotId] !== undefined &&
      snapshot.slots[slotId]?.dieUid === undefined &&
      !placed.has(slotId) &&
      !isSlotBlocked(snapshot, slotId),
  );
  return isInverted(snapshot) ? [...open].reverse() : open;
};

const stormPending = (snapshot: BattleSnapshot): boolean =>
  snapshot.nodeStorm === true || snapshot.pendingStorm > 0;

const stormMargin = (
  snapshot: BattleSnapshot,
  committed: readonly RolledDie[],
): number => {
  if (!stormPending(snapshot) || committed.length === 0) return 0;
  const worst = committed.reduce((best, d) =>
    d.value - (d.tier + 1) / 2 > best.value - (best.tier + 1) / 2 ? d : best,
  );
  return Math.max(0, worst.value - (worst.tier + 1) / 2);
};

export const evasionMitigation = (
  value: number,
  tuning: EvasionTuning = BASE_EVASION,
  evasionDelta = 0,
): number => {
  const evasion = evasionFor(value, evasionDelta, tuning);
  return (evasion.dodgePct + evasion.glancingPct / 2) / 100;
};

const slotCap = (snapshot: BattleSnapshot, slotId: SlotId): number =>
  snapshot.slots[slotId]?.cap ?? 0;

const bestByGain = (
  dice: readonly RolledDie[],
  gain: (die: RolledDie) => number,
): { die: RolledDie; gain: number } | undefined =>
  dice
    .map((die) => ({ die, gain: gain(die) }))
    .sort((a, b) => b.gain - a.gain || a.die.value - b.die.value)[0];

const gatedKillSum = (
  dice: readonly RolledDie[],
  gate: number,
): number => {
  if (gate <= 0) return dice.reduce((sum, d) => sum + d.value, 0);
  const ordered = [...dice].sort((a, b) => b.value - a.value);
  const breaker = ordered[0];
  if (breaker === undefined || breaker.value < gate) return 0;
  return ordered.reduce((sum, d) => sum + d.value, 0);
};

export const legalFireModes = (
  snapshot: BattleSnapshot,
  slotId: SlotId,
): readonly FireModeId[] => {
  const alive = snapshot.enemies.filter((e) => e.hp > 0).length;
  return (snapshot.slots[slotId]?.modes ?? []).filter((mode) =>
    fireModeAllowed(mode, alive),
  );
};

const poolOf = (enemy: EnemyState): number =>
  Math.max(0, enemy.hp) +
  Math.max(0, enemy.shield) +
  enemy.subsystems.reduce((sum, sub) => sum + Math.max(0, sub.hp), 0);

const enemyPool = (snapshot: BattleSnapshot): number =>
  snapshot.enemies.reduce((sum, enemy) => sum + poolOf(enemy), 0);

const focusPool = (snapshot: BattleSnapshot, targetId: string | null): number => {
  const chosen = snapshot.enemies.find(
    (enemy) =>
      enemy.hp > 0 &&
      (enemy.id === targetId ||
        enemy.subsystems.some((sub) => sub.id === targetId)),
  );
  return chosen === undefined ? 0 : poolOf(chosen);
};

const boardWithDecision = (
  snapshot: BattleSnapshot,
  placements: readonly PolicyPlacement[],
  targetId: string | null,
): BattleSnapshot => {
  const slotOfDie = new Map<string, SlotId>(
    placements.map((placement) => [placement.uid, placement.slot]),
  );
  const dice = snapshot.dice.map((die) => {
    const slot = slotOfDie.get(die.uid);
    return slot === undefined ? die : { ...die, state: "placed" as const, slot };
  });
  const slots = { ...snapshot.slots };
  for (const placement of placements) {
    const slot = slots[placement.slot];
    if (slot !== undefined) {
      slots[placement.slot] = { ...slot, dieUid: placement.uid };
    }
  }
  for (const slotId of FIRE_MODE_SLOTS) {
    const slot = slots[slotId];
    if (slot !== undefined) slots[slotId] = { ...slot, mode: DIRECT.id };
  }
  return { ...snapshot, dice, slots, targetId: targetId ?? snapshot.targetId };
};

const armedOn = (
  board: BattleSnapshot,
  slotId: SlotId,
  mode: FireModeId,
): BattleSnapshot => {
  const slot = board.slots[slotId];
  if (slot === undefined) return board;
  return {
    ...board,
    slots: { ...board.slots, [slotId]: { ...slot, mode } },
  };
};

interface ModeBaseline {
  targetId: string | null;
  pool: number;
  focus: number;
  incoming: number;
}

const projectedGain = (
  board: BattleSnapshot,
  baseline: ModeBaseline,
): number => {
  const { next } = resolvePlayerPhase(board);
  const focusLeft = focusPool(next, baseline.targetId);
  const dealt =
    focusLeft > 0
      ? baseline.focus - focusLeft
      : baseline.pool - enemyPool(next);
  return dealt + (baseline.incoming - incomingEstimate(next));
};

const chooseFireModes = (
  snapshot: BattleSnapshot,
  placements: readonly PolicyPlacement[],
  targetId: string | null,
): void => {
  const weapons = placements.filter((placement) =>
    FIRE_MODE_SLOTS.includes(placement.slot),
  );
  if (weapons.length === 0) return;
  for (const placement of weapons) placement.mode = DIRECT.id;
  const contested = weapons.filter(
    (placement) => legalFireModes(snapshot, placement.slot).length > 1,
  );
  if (contested.length === 0) return;
  let board = boardWithDecision(snapshot, placements, targetId);
  const baseline: ModeBaseline = {
    targetId: board.targetId,
    pool: enemyPool(board),
    focus: focusPool(board, board.targetId),
    incoming: incomingEstimate(board),
  };
  if (baseline.pool <= 0) return;
  const order = isInverted(snapshot)
    ? [...FIRE_MODE_SLOTS].reverse()
    : FIRE_MODE_SLOTS;
  let carried: number | undefined;
  for (const slotId of order) {
    const placement = contested.find((entry) => entry.slot === slotId);
    if (placement === undefined) continue;
    let best: FireModeId = DIRECT.id;
    let bestScore =
      carried ?? projectedGain(armedOn(board, slotId, DIRECT.id), baseline);
    for (const mode of legalFireModes(snapshot, slotId)) {
      if (mode === DIRECT.id) continue;
      const score = projectedGain(armedOn(board, slotId, mode), baseline);
      if (score > bestScore) {
        bestScore = score;
        best = mode;
      }
    }
    placement.mode = best;
    board = armedOn(board, slotId, best);
    carried = bestScore;
  }
};

const boardWithModes = (
  snapshot: BattleSnapshot,
  placements: readonly PolicyPlacement[],
  targetId: string | null,
): BattleSnapshot => {
  let board = boardWithDecision(snapshot, placements, targetId);
  for (const placement of placements) {
    if (placement.mode !== undefined) {
      board = armedOn(board, placement.slot, placement.mode);
    }
  }
  return board;
};

export const applyOfficerActive = (
  snapshot: BattleSnapshot,
  officerId: string,
): BattleSnapshot => {
  const def = officerDef(officerId);
  if (def === undefined) return snapshot;
  const next = structuredClone(snapshot);
  const ctx = new BattleCtx(next, next.flags ?? []);
  applyActions(officerActions(def.active), ctx);
  next.flags = [...ctx.flags];
  next.charge = Math.max(0, Math.min(next.chargeCap, next.charge));
  next.scrap = Math.max(0, next.scrap);
  return next;
};

export const readyOfficers = (
  snapshot: BattleSnapshot,
  spent: readonly string[],
): readonly OfficerDef[] => {
  const aboard = (snapshot.officers ?? []).slice(0, CABIN_CAP);
  const out: OfficerDef[] = [];
  for (const id of aboard) {
    if (spent.includes(id)) continue;
    const def = officerDef(id);
    if (def === undefined) continue;
    if (snapshot.charge < officerChargeCost(def.active)) continue;
    if (officerActiveDead(def.active, aimedEnemy(snapshot.enemies, snapshot.targetId)?.statuses.mark)) {
      continue;
    }
    out.push(def);
  }
  return out;
};

const chargePipValue = (board: BattleSnapshot, charge: number): number =>
  charge /
  Math.max(
    1,
    nudgeChargeCost(
      sourceMods(board).nudgeCostDelta,
      sourceTrait(board, "coldLogic"),
    ),
  );

const directCredit = (
  board: BattleSnapshot,
  after: BattleSnapshot,
  baseline: ModeBaseline,
): number =>
  after.hull -
  board.hull +
  Math.min(Math.max(0, after.shield - board.shield), baseline.incoming) +
  chargePipValue(board, after.charge - board.charge);

const chooseOfficerActive = (
  snapshot: BattleSnapshot,
  placements: readonly PolicyPlacement[],
  targetId: string | null,
  spent: readonly string[],
): string | undefined => {
  const ready = readyOfficers(snapshot, spent);
  if (ready.length === 0) return undefined;
  const board = boardWithModes(snapshot, placements, targetId);
  const baseline: ModeBaseline = {
    targetId: board.targetId,
    pool: enemyPool(board),
    focus: focusPool(board, board.targetId),
    incoming: incomingEstimate(board),
  };
  if (baseline.pool <= 0) return undefined;
  let best: string | undefined;
  let bestScore = projectedGain(board, baseline);
  for (const def of ready) {
    const after = applyOfficerActive(board, def.id);
    const score =
      projectedGain(after, baseline) + directCredit(board, after, baseline);
    if (score > bestScore) {
      bestScore = score;
      best = def.id;
    }
  }
  return best;
};

export const readyEcho = (
  snapshot: BattleSnapshot,
  spent: readonly string[],
): EchoNodeId | undefined => {
  const id = snapshot.echo;
  if (id === undefined) return undefined;
  if (!echoIsBattleActive(id)) return undefined;
  return spent.includes(echoToken(id)) ? undefined : id;
};

export const secondLookGain = (die: RolledDie): number => {
  const tier = Math.max(1, die.tier);
  let gain = 0;
  for (let face = die.value + 1; face <= tier; face += 1) {
    gain += (face - die.value) / tier;
  }
  return gain;
};

export const echoLookUids = (
  snapshot: BattleSnapshot,
  spent: readonly string[],
): readonly string[] => {
  const id = readyEcho(snapshot, spent);
  if (id === undefined) return [];
  const wanted = echoSecondLookDice(id);
  if (wanted <= 0) return [];
  const chosen = [...trayDice(snapshot)]
    .sort((a, b) => a.value - b.value)
    .slice(0, wanted);
  if (chosen.length === 0) return [];
  const gain = chosen.reduce((sum, die) => sum + secondLookGain(die), 0);
  return gain >= chosen.length ? chosen.map((die) => die.uid) : [];
};

export const applyEchoActive = (
  snapshot: BattleSnapshot,
  echoId: EchoNodeId,
): BattleSnapshot => {
  const weapons = echoCalculusWeapons(echoId);
  if (weapons <= 0) return snapshot;
  const next = structuredClone(snapshot);
  next.nextTurnMods = {
    ...next.nextTurnMods,
    weapons: (next.nextTurnMods.weapons ?? 0) + weapons,
  };
  return next;
};

const chooseEchoActive = (
  snapshot: BattleSnapshot,
  placements: readonly PolicyPlacement[],
  targetId: string | null,
  spent: readonly string[],
): EchoNodeId | undefined => {
  const id = readyEcho(snapshot, spent);
  if (id === undefined || echoCalculusWeapons(id) <= 0) return undefined;
  const board = boardWithModes(snapshot, placements, targetId);
  const baseline: ModeBaseline = {
    targetId: board.targetId,
    pool: enemyPool(board),
    focus: focusPool(board, board.targetId),
    incoming: incomingEstimate(board),
  };
  if (baseline.pool <= 0) return undefined;
  const after = applyEchoActive(board, id);
  return projectedGain(after, baseline) > projectedGain(board, baseline)
    ? id
    : undefined;
};

export const forcedTargetId = (
  snapshot: BattleSnapshot,
  order: readonly string[],
): string | undefined => {
  for (const key of order) {
    for (const enemy of snapshot.enemies) {
      if (enemy.hp <= 0) continue;
      const part = enemy.subsystems.find((s) => s.key === key && s.hp > 0);
      if (part !== undefined) return part.id;
    }
  }
  return undefined;
};

export const decidePlacements = (
  snapshot: BattleSnapshot,
  spent: readonly string[] = [],
  forced?: string,
): PolicyDecision => {
  const placements: PolicyPlacement[] = [];
  const usedDice = new Set<string>();
  const usedSlots = new Set<SlotId>();

  const alive = snapshot.enemies.filter((e) => e.hp > 0);
  const reachable = alive.filter((e) => !isBodyImmune(snapshot, e));
  const lowest = [...reachable].sort(
    (a, b) => a.hp + a.shield - (b.hp + b.shield),
  )[0];
  const auraSubsystems = alive
    .flatMap((e) =>
      e.subsystems
        .filter((s) => s.hp > 0)
        .filter(
          (s) =>
            ENEMY_BY_ID.get(e.defId)?.alternating !== true ||
            e.lastHitKey !== s.key ||
            e.subsystems.filter((other) => other.hp > 0).length <= 1,
        ),
    )
    .sort((a, b) => a.hp - b.hp);

  const available = (): RolledDie[] =>
    trayDice(snapshot).filter((d) => !usedDice.has(d.uid));

  const tryPlace = (die: RolledDie, slotId: SlotId): boolean => {
    if (usedSlots.has(slotId) || usedDice.has(die.uid)) return false;
    if (!canPlaceDie(snapshot, die.uid, slotId)) return false;
    placements.push({ uid: die.uid, slot: slotId });
    usedDice.add(die.uid);
    usedSlots.add(slotId);
    return true;
  };

  const placeWeapons = (dice: RolledDie[]): void => {
    for (const die of dice) {
      for (const slotId of freeWeaponSlots(snapshot, usedSlots)) {
        if (tryPlace(die, slotId)) break;
      }
    }
  };

  const totalEnemyHp = alive.reduce((sum, e) => sum + e.hp + e.shield, 0);
  const weaponSlotsOpen = freeWeaponSlots(snapshot, usedSlots);
  const killCandidates = [...available()]
    .filter((d) =>
      weaponSlotsOpen.some((slotId) => {
        const cap = snapshot.slots[slotId]?.cap;
        return cap !== undefined && d.tier <= cap;
      }),
    )
    .sort((a, b) => b.value - a.value)
    .slice(0, weaponSlotsOpen.length);
  const lowestGate = gateOf(lowest);
  const killSum = gatedKillSum(killCandidates, lowestGate);
  const lethal =
    reachable.length === alive.length &&
    killSum - stormMargin(snapshot, killCandidates) >= totalEnemyHp &&
    totalEnemyHp > 0;

  const targetSub = auraSubsystems[0];
  const healer =
    alive.length > 1
      ? reachable.find((e) => ENEMY_BY_ID.get(e.defId)?.role === "support")
      : undefined;
  const bestValue = [...available()].reduce((best, d) => Math.max(best, d.value), 0);
  const gateWall =
    lowestGate > bestValue
      ? reachable.find((e) => e.id !== lowest?.id && gateOf(e) <= bestValue)
      : undefined;
  const chosen = lethal
    ? (lowest?.id ?? snapshot.targetId)
    : (gateWall?.id ??
      targetSub?.id ??
      healer?.id ??
      lowest?.id ??
      alive[0]?.id ??
      snapshot.targetId);
  const targetId = forced ?? chosen;

  if (lethal) {
    placeWeapons(killCandidates);
  }

  const incoming = incomingEstimate(snapshot);
  if (incoming >= snapshot.hull * 0.25 && !shieldsWasted(snapshot)) {
    for (const slotId of SHIELD_SLOTS) {
      if (snapshot.slots[slotId] === undefined) continue;
      const shieldDie = [...available()]
        .filter((d) => d.tier <= slotCap(snapshot, slotId))
        .sort((a, b) => b.value - a.value)[0];
      if (shieldDie !== undefined) tryPlace(shieldDie, slotId);
    }
  }

  if (incoming > 0) {
    const survivalWorth = incoming >= snapshot.hull * 0.25 ? 2 : 1;
    const tuning = evasionTuningFor(snapshot.shipId);
    const evasionDelta = sourceMods(snapshot).evasionDelta;
    let engineValue = 0;
    for (const slotId of ENGINE_SLOTS) {
      if (snapshot.slots[slotId] === undefined) continue;
      const engineCap = slotCap(snapshot, slotId);
      const carried = engineValue;
      const best = bestByGain(
        available().filter((d) => d.tier <= engineCap),
        (d) =>
          (evasionMitigation(carried + d.value, tuning, evasionDelta) -
            evasionMitigation(carried, tuning, evasionDelta)) *
            incoming *
            survivalWorth -
          d.value,
      );
      if (best === undefined || best.gain <= 0) continue;
      if (tryPlace(best.die, slotId)) engineValue += best.die.value;
    }
  }

  if (
    snapshot.slots.repairBay !== undefined &&
    snapshot.hull < snapshot.hullMax * REPAIR_HULL_PCT
  ) {
    const missing = snapshot.hullMax - snapshot.hull;
    const best = bestByGain(
      available().filter((d) => d.tier <= slotCap(snapshot, "repairBay")),
      (d) => Math.min(missing, Math.ceil(d.value / 2)) - d.value / 2,
    );
    if (best !== undefined && best.gain > 0) tryPlace(best.die, "repairBay");
  }

  if (!isInverted(snapshot)) {
    const sensorCap = slotCap(snapshot, "sensors");
    const hits = freeWeaponSlots(snapshot, usedSlots).length;
    const best = bestByGain(
      available().filter((d) => d.tier <= sensorCap),
      (d) => vulnerableFor(d.value) * hits - d.value,
    );
    if (best !== undefined && best.gain > 0) tryPlace(best.die, "sensors");
  }

  placeWeapons([...available()].sort((a, b) => b.value - a.value));

  for (const die of [...available()].sort((a, b) => b.value - a.value)) {
    tryPlace(die, "reactor");
  }

  let reserveUid: string | undefined;
  const hasReserved = snapshot.dice.some((d) => d.state === "reserved");
  if (!hasReserved && !trayAtRisk(snapshot)) {
    const best = [...available()].sort((a, b) => b.value - a.value)[0];
    if (best !== undefined && best.value >= best.tier - 1) {
      reserveUid = best.uid;
    }
  }

  chooseFireModes(snapshot, placements, targetId);
  const active = chooseOfficerActive(snapshot, placements, targetId, spent);
  const echo = chooseEchoActive(snapshot, placements, targetId, spent);

  return { targetId, placements, reserveUid, active, echo };
};
