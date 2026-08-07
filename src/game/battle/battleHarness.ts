import { DIE_BY_ID } from "@/data/dice";
import { computeCensus } from "@/game/battle/resonance";
import { BattleCtx, buildSources, emit } from "@/game/effects";
import type {
  BattleSnapshot,
  DieState,
  EnemyState,
  RolledDie,
  SlotId,
  SlotState,
} from "@/types/battle";

export const harnessEnemy = (over: Partial<EnemyState> = {}): EnemyState => ({
  id: "enemy-0",
  defId: "raider",
  hp: 40,
  hpMax: 40,
  shield: 0,
  intentIndex: 0,
  nextIntent: { t: "attack", n: 5 },
  statuses: {},
  subsystems: [],
  phase: 0,
  ...over,
});

export const harnessDie = (
  uid: string,
  defId: string,
  value?: number,
  state: DieState = "tray",
): RolledDie => {
  const def = DIE_BY_ID.get(defId);
  if (def === undefined) throw new Error(`harnessDie: unknown die "${defId}"`);
  return {
    uid,
    defId,
    tier: def.tier,
    school: def.school,
    value: value ?? def.tier,
    state,
  };
};

export const defaultSlots = (): Partial<Record<SlotId, SlotState>> => ({
  weaponA: { cap: 8, mk: 1 },
  weaponB: { cap: 8, mk: 1 },
  shields: { cap: 8, mk: 1 },
  engines: { cap: 6, mk: 1 },
  sensors: { cap: 6, mk: 1 },
  reactor: { cap: 10, mk: 1 },
});

export const harnessSnap = (
  dice: RolledDie[],
  over: Partial<BattleSnapshot> = {},
): BattleSnapshot => ({
  turn: 1,
  hull: 30,
  hullMax: 30,
  shield: 0,
  shieldPersist: 0,
  charge: 0,
  scrap: 0,
  runScrap: 0,
  tide: 0,
  interference: 0,
  perks: [],
  dice,
  slots: defaultSlots(),
  enemies: [harnessEnemy()],
  targetId: "enemy-0",
  engineState: null,
  nextTurnMods: {},
  nextRollBonus: 0,
  pendingDeepScan: false,
  chargeCap: 10,
  sacrificePool: 0,
  bloodReactorUsed: false,
  burnDoubleUsed: false,
  blockedSlots: [],
  shrunkSlots: [],
  lockedDice: [],
  resonance: computeCensus(dice),
  survivedLethal: false,
  lastPlayerDamage: 0,
  stolenScrap: 0,
  pendingTwist: 0,
  pendingSwap: 0,
  pendingStorm: 0,
  ascension: 0,
  exceedCap: [],
  sectorHpPct: 0,
  enemyHpPct: 0,
  ...over,
});

export const startedSnap = (
  dice: RolledDie[],
  over: Partial<BattleSnapshot> = {},
): BattleSnapshot => {
  const snap = harnessSnap(dice, over);
  emit(buildSources(snap), "battleStart", new BattleCtx(snap, snap.flags));
  return snap;
};

export const place = (
  snap: BattleSnapshot,
  uid: string,
  slotId: SlotId,
): void => {
  const die = snap.dice.find((d) => d.uid === uid);
  const slot = snap.slots[slotId];
  if (die === undefined || slot === undefined)
    throw new Error(`place: ${uid} → ${slotId}`);
  die.state = "placed";
  die.slot = slotId;
  slot.dieUid = uid;
};
