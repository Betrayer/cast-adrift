import { currentIntentOf } from "@/game/battle/setup";
import type { RngStreams } from "@/services/rng";
import type { BattleSnapshot, Beat, EnemyBeat, SlotId } from "@/types/battle";
import { ENEMY_BY_ID } from "@/data/enemies/sector1";

export const RESOLUTION_ORDER: readonly SlotId[] = [
  "weaponA",
  "shields",
  "reactor",
];

export const CHARGE_CAP = 10;

const clone = (snapshot: BattleSnapshot): BattleSnapshot =>
  structuredClone(snapshot);

export const resolvePlayerPhase = (
  snapshot: BattleSnapshot,
): { next: BattleSnapshot; beats: Beat[] } => {
  const next = clone(snapshot);
  const beats: Beat[] = [];
  for (const slotId of RESOLUTION_ORDER) {
    const slot = next.slots[slotId];
    if (slot?.dieUid === undefined) continue;
    const die = next.dice.find((d) => d.uid === slot.dieUid);
    if (die === undefined) continue;
    if (slotId === "weaponA") {
      const target =
        next.enemies.find((e) => e.id === next.targetId && e.hp > 0) ??
        next.enemies.find((e) => e.hp > 0);
      if (target === undefined) continue;
      const absorbed = Math.min(target.shield, die.value);
      target.shield -= absorbed;
      target.hp = Math.max(0, target.hp - (die.value - absorbed));
      beats.push({
        slot: slotId,
        kind: "damage",
        amount: die.value,
        targetId: target.id,
      });
    } else if (slotId === "shields") {
      next.shield += die.value;
      beats.push({ slot: slotId, kind: "shield", amount: die.value });
    } else {
      next.charge = Math.min(CHARGE_CAP, next.charge + die.value);
      beats.push({ slot: slotId, kind: "charge", amount: die.value });
    }
  }
  if (next.enemies.every((e) => e.hp <= 0)) next.outcome = "victory";
  return { next, beats };
};

export const resolveEnemyPhase = (
  snapshot: BattleSnapshot,
): { next: BattleSnapshot; beats: EnemyBeat[] } => {
  const next = clone(snapshot);
  const beats: EnemyBeat[] = [];
  for (const enemy of next.enemies) {
    if (enemy.hp <= 0) continue;
    const def = ENEMY_BY_ID.get(enemy.defId);
    if (def === undefined) continue;
    const intent = currentIntentOf(enemy);
    if (intent.t === "attack") {
      const absorbed = Math.min(next.shield, intent.n);
      next.shield -= absorbed;
      const hullDamage = intent.n - absorbed;
      next.hull = Math.max(0, next.hull - hullDamage);
      beats.push({
        enemyId: enemy.id,
        intent,
        hullDamage,
        shieldDamage: absorbed,
      });
    } else {
      enemy.shield += intent.n;
      beats.push({ enemyId: enemy.id, intent, hullDamage: 0, shieldDamage: 0 });
    }
    enemy.intentIndex = (enemy.intentIndex + 1) % def.pattern.length;
  }
  next.shield = 0;
  if (next.hull <= 0) next.outcome = "defeat";
  return { next, beats };
};

export const advanceTurn = (
  snapshot: BattleSnapshot,
  streams: RngStreams,
): BattleSnapshot => {
  const next = clone(snapshot);
  next.dice = next.dice.map((die) => ({
    ...die,
    value: streams.dice.int(1, die.tier),
    state: "tray" as const,
    slot: undefined,
  }));
  for (const slot of Object.values(next.slots)) {
    slot.dieUid = undefined;
  }
  next.turn += 1;
  return next;
};
