import { canPlaceDie, isSlotBlocked } from "@/game/battle/setup";
import type { BattleSnapshot, RolledDie, SlotId } from "@/types/battle";

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

const trayDice = (snapshot: BattleSnapshot): RolledDie[] =>
  snapshot.dice.filter((d) => d.state === "tray");

export const expectedSum = (dice: readonly RolledDie[]): number =>
  dice.reduce((sum, d) => sum + (d.tier + 1) / 2, 0);

export const incomingEstimate = (snapshot: BattleSnapshot): number => {
  let total = 0;
  for (const enemy of snapshot.enemies) {
    if (enemy.hp <= 0) continue;
    const intent = enemy.nextIntent;
    if (intent.t !== "attack" && intent.t !== "multi") continue;
    const aura = enemy.subsystems.some((s) => s.hp > 0 && s.aura === "atk+2")
      ? 2
      : 0;
    const mult = enemy.statuses.charge !== undefined ? 2 : 1;
    const hits = intent.t === "multi" ? intent.k : 1;
    total += (intent.n + aura) * mult * hits;
  }
  return total;
};

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
): SlotId[] =>
  WEAPON_SLOTS.filter(
    (slotId) =>
      snapshot.slots[slotId] !== undefined &&
      snapshot.slots[slotId]?.dieUid === undefined &&
      !placed.has(slotId) &&
      !isSlotBlocked(snapshot, slotId),
  );

export const decidePlacements = (snapshot: BattleSnapshot): PolicyDecision => {
  const placements: PolicyPlacement[] = [];
  const usedDice = new Set<string>();
  const usedSlots = new Set<SlotId>();

  const alive = snapshot.enemies.filter((e) => e.hp > 0);
  const lowest = [...alive].sort(
    (a, b) => a.hp + a.shield - (b.hp + b.shield),
  )[0];
  const auraSubsystems = alive
    .flatMap((e) => e.subsystems.filter((s) => s.hp > 0))
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
  const killSum = killCandidates.reduce((sum, d) => sum + d.value, 0);
  const lethal = killSum >= totalEnemyHp && totalEnemyHp > 0;

  // Front-load the aura subsystem (turret) so the atk+2 aura drops early — unless we
  // can lethal-clear the core this turn, in which case just kill the enemy.
  const targetSub = auraSubsystems[0];
  const targetId =
    !lethal && targetSub !== undefined
      ? targetSub.id
      : (lowest?.id ?? snapshot.targetId);

  if (lethal) {
    placeWeapons(killCandidates);
  }

  const incoming = incomingEstimate(snapshot);
  if (incoming >= snapshot.hull * 0.25) {
    const shieldDie = [...available()]
      .filter((d) => d.tier <= (snapshot.slots.shields?.cap ?? 0))
      .sort((a, b) => b.value - a.value)[0];
    if (shieldDie !== undefined) tryPlace(shieldDie, "shields");
  }

  if (incoming > 0) {
    const engineDie = [...available()]
      .filter((d) => d.value >= 4 && d.value <= 6)
      .sort((a, b) => a.value - b.value)[0];
    if (engineDie !== undefined) tryPlace(engineDie, "engines");
  }

  const sensorDie = [...available()].sort((a, b) => a.value - b.value)[0];
  if (sensorDie !== undefined) tryPlace(sensorDie, "sensors");

  placeWeapons([...available()].sort((a, b) => b.value - a.value));

  for (const die of [...available()].sort((a, b) => b.value - a.value)) {
    tryPlace(die, "reactor");
  }

  let reserveUid: string | undefined;
  const hasReserved = snapshot.dice.some((d) => d.state === "reserved");
  if (!hasReserved) {
    const best = [...available()].sort((a, b) => b.value - a.value)[0];
    if (best !== undefined && best.value >= best.tier - 1) {
      reserveUid = best.uid;
    }
  }

  return { targetId, placements, reserveUid };
};
