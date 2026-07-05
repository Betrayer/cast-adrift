import { DIE_BY_ID } from "@/data/dice/basic";
import {
  ENEMY_BY_ID,
  expandEncounterIds,
} from "@/data/enemies/sector1";
import { SHIP_BY_ID, type ShipId } from "@/data/ships";
import { createStream, type RngStream, type RngStreams } from "@/services/rng";
import type {
  BattleSnapshot,
  EnemyState,
  RolledDie,
  SlotId,
  SlotState,
} from "@/types/battle";
import type { EnemyDef, Intent } from "@/types/content";

export const MAX_ENEMIES = 3;

export const createEnemyStream = (streams: RngStreams): RngStream =>
  createStream(Math.floor(streams.dice.next() * 4294967296) >>> 0);

export const buildShipSlots = (
  shipId: ShipId,
): Partial<Record<SlotId, SlotState>> => {
  const ship = SHIP_BY_ID.get(shipId);
  if (ship === undefined)
    throw new Error(`buildShipSlots: unknown ship "${shipId}"`);
  const slots: Partial<Record<SlotId, SlotState>> = {};
  for (const [slotId, def] of Object.entries(ship.slots) as [
    SlotId,
    Omit<SlotState, "dieUid">,
  ][]) {
    slots[slotId] = { ...def };
  }
  return slots;
};

export const shipHullMax = (shipId: ShipId): number => {
  const ship = SHIP_BY_ID.get(shipId);
  if (ship === undefined)
    throw new Error(`shipHullMax: unknown ship "${shipId}"`);
  return ship.hullMax;
};

export const rollDeck = (
  deckDefIds: readonly string[],
  streams: RngStreams,
): RolledDie[] =>
  deckDefIds.map((defId, index) => {
    const def = DIE_BY_ID.get(defId);
    if (def === undefined)
      throw new Error(`rollDeck: unknown die def "${defId}"`);
    return {
      uid: `die-${String(index)}`,
      defId,
      tier: def.tier,
      school: def.school,
      value: streams.dice.int(1, def.tier),
      state: "tray",
    };
  });

export const drawIntent = (
  def: EnemyDef,
  intentIndex: number,
  enemyStream: RngStream,
): Intent => {
  const step = def.pattern[intentIndex % def.pattern.length];
  if (step === undefined)
    throw new Error(`drawIntent: "${def.id}" empty pattern`);
  if ("pick" in step) return enemyStream.weighted(step.pick);
  return step;
};

export const spawnEnemy = (
  defId: string,
  id: string,
  enemyStream: RngStream,
): EnemyState => {
  const def = ENEMY_BY_ID.get(defId);
  if (def === undefined)
    throw new Error(`spawnEnemy: unknown enemy "${defId}"`);
  return {
    id,
    defId,
    hp: def.hp,
    hpMax: def.hp,
    shield: 0,
    intentIndex: 0,
    nextIntent: drawIntent(def, 0, enemyStream),
    statuses: {},
    subsystems: (def.subsystems ?? []).map((sub) => ({
      id: `${id}:${sub.id}`,
      key: sub.id,
      hp: sub.hp,
      hpMax: sub.hp,
      aura: sub.aura,
    })),
  };
};

export const buildEnemies = (
  enemyIds: readonly string[],
  enemyStream: RngStream,
): EnemyState[] =>
  expandEncounterIds(enemyIds)
    .slice(0, MAX_ENEMIES)
    .map((defId, index) => spawnEnemy(defId, `enemy-${String(index)}`, enemyStream));

export const buildBattleSnapshot = (
  shipId: ShipId,
  deckDefIds: readonly string[],
  enemyIds: readonly string[],
  streams: RngStreams,
  enemyStream: RngStream,
): BattleSnapshot => {
  const enemies = buildEnemies(enemyIds, enemyStream);
  return {
    turn: 1,
    hull: shipHullMax(shipId),
    hullMax: shipHullMax(shipId),
    shield: 0,
    charge: 0,
    dice: rollDeck(deckDefIds, streams),
    slots: buildShipSlots(shipId),
    enemies,
    targetId: enemies[0]?.id ?? null,
    engineState: null,
    nextTurnMods: {},
    nextRollBonus: 0,
    pendingDeepScan: false,
    blockedSlots: [],
    lockedDice: [],
  };
};

export const isSlotBlocked = (
  snapshot: Pick<BattleSnapshot, "blockedSlots" | "turn">,
  slotId: SlotId,
): boolean =>
  snapshot.blockedSlots.some(
    (b) => b.slot === slotId && b.untilTurn >= snapshot.turn,
  );

export const isDieLocked = (
  snapshot: Pick<BattleSnapshot, "lockedDice" | "turn">,
  uid: string,
): boolean =>
  snapshot.lockedDice.some(
    (l) => l.uid === uid && l.untilTurn >= snapshot.turn,
  );

export const canPlaceDie = (
  snapshot: Pick<
    BattleSnapshot,
    "dice" | "slots" | "blockedSlots" | "lockedDice" | "turn"
  >,
  uid: string,
  slotId: SlotId,
): boolean => {
  const die = snapshot.dice.find((d) => d.uid === uid);
  const slot = snapshot.slots[slotId];
  return (
    die !== undefined &&
    slot !== undefined &&
    die.state === "tray" &&
    slot.dieUid === undefined &&
    die.tier <= slot.cap &&
    !isSlotBlocked(snapshot, slotId) &&
    !isDieLocked(snapshot, uid)
  );
};
