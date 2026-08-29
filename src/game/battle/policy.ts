import { ENEMY_BY_ID } from "@/data/enemies";
import { isInverted } from "@/game/battle/order";
import {
  BASE_EVASION,
  evasionFor,
  evasionTuningFor,
  MIRROR_CAP,
  MIRROR_SCHOOL_CAP,
  MIRROR_SCHOOL_MULT,
  vulnerableFor,
} from "@/game/battle/resolver";
import type { EvasionTuning } from "@/game/battle/passives";
import { canPlaceDie, isSlotBlocked } from "@/game/battle/setup";
import { sourceMods } from "@/game/run/runMods";
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
}

export interface PolicyDecision {
  targetId: string | null;
  placements: PolicyPlacement[];
  reserveUid?: string;
}

const WEAPON_SLOTS: readonly SlotId[] = ["weaponA", "weaponB"];
const SHIELD_SLOTS: readonly SlotId[] = ["shields", "shieldsB"];
const ENGINE_SLOTS: readonly SlotId[] = ["engines", "enginesB"];
const REPAIR_HULL_PCT = 0.6;

const trayDice = (snapshot: BattleSnapshot): RolledDie[] =>
  snapshot.dice.filter((d) => d.state === "tray");

export const expectedSum = (dice: readonly RolledDie[]): number =>
  dice.reduce((sum, d) => sum + (d.tier + 1) / 2, 0);

const auraAttackBonus = (enemy: EnemyState): number =>
  (enemy.subsystems.some((s) => s.hp > 0 && s.aura === "atk+2") ? 2 : 0) +
  (enemy.subsystems.some((s) => s.hp > 0 && s.aura === "atk+3") ? 3 : 0) +
  (enemy.rage ?? 0);

const largestSchoolCount = (snapshot: BattleSnapshot): number =>
  Math.max(0, ...Object.values(snapshot.resonance.counts));

interface IntentThreat {
  perHit: number;
  hits: number;
}

const intentThreat = (
  snapshot: BattleSnapshot,
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
          Math.ceil(Math.max(0, snapshot.lastPlayerDamage) / 2),
        ),
        hits: 1,
      };
    case "mirrorSchool":
      return {
        perHit: Math.min(
          MIRROR_SCHOOL_CAP,
          largestSchoolCount(snapshot) * MIRROR_SCHOOL_MULT,
        ),
        hits: 1,
      };
    case "echoTotal":
      return {
        perHit: Math.min(intent.cap, Math.max(0, snapshot.lastPlayerDamage)),
        hits: 1,
      };
    case "bargain":
      return snapshot.scrap + snapshot.runScrap >= intent.n
        ? null
        : { perHit: intent.n, hits: 1 };
    default:
      return null;
  }
};

export const incomingEstimate = (snapshot: BattleSnapshot): number => {
  const pressure = Math.max(0, snapshot.tide) + Math.max(0, snapshot.interference);
  let total = 0;
  for (const enemy of snapshot.enemies) {
    if (enemy.hp <= 0) continue;
    const threat = intentThreat(snapshot, enemy.nextIntent);
    if (threat === null) continue;
    const mult = enemy.statuses.charge !== undefined ? 2 : 1;
    total +=
      (threat.perHit + auraAttackBonus(enemy) + pressure) * mult * threat.hits;
  }
  return total;
};

const enemiesIntending = (
  snapshot: BattleSnapshot,
  kind: Intent["t"],
): EnemyState[] =>
  snapshot.enemies.filter((e) => e.hp > 0 && e.nextIntent.t === kind);

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

export const decidePlacements = (snapshot: BattleSnapshot): PolicyDecision => {
  const placements: PolicyPlacement[] = [];
  const usedDice = new Set<string>();
  const usedSlots = new Set<SlotId>();

  const alive = snapshot.enemies.filter((e) => e.hp > 0);
  const lowest = [...alive].sort(
    (a, b) => a.hp + a.shield - (b.hp + b.shield),
  )[0];
  const auraSubsystems = alive
    .flatMap((e) =>
      e.subsystems
        .filter((s) => s.hp > 0)
        .filter(
          (s) =>
            ENEMY_BY_ID.get(e.defId)?.alternating !== true ||
            e.lastHitKey !== s.key,
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
    killSum - stormMargin(snapshot, killCandidates) >= totalEnemyHp &&
    totalEnemyHp > 0;

  const targetSub = auraSubsystems[0];
  const healer =
    alive.length > 1
      ? alive.find((e) => ENEMY_BY_ID.get(e.defId)?.role === "support")
      : undefined;
  const bestValue = [...available()].reduce((best, d) => Math.max(best, d.value), 0);
  const gateWall =
    lowestGate > bestValue
      ? alive.find((e) => e.id !== lowest?.id && gateOf(e) <= bestValue)
      : undefined;
  const targetId = lethal
    ? (lowest?.id ?? snapshot.targetId)
    : (gateWall?.id ??
      targetSub?.id ??
      healer?.id ??
      lowest?.id ??
      snapshot.targetId);

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

  return { targetId, placements, reserveUid };
};
