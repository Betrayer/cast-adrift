import { DIE_BY_ID } from "@/data/dice";
import { computeCensus } from "@/game/battle/resonance";
import { battleSnapshotDefaults } from "@/game/battle/setup";
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
  ...battleSnapshotDefaults(),
  hull: 30,
  hullMax: 30,
  dice,
  slots: defaultSlots(),
  enemies: [harnessEnemy()],
  targetId: "enemy-0",
  chargeCap: 10,
  resonance: computeCensus(dice),
  ...over,
});

export const harnessBoard = (
  enemies: EnemyState[],
  dice: RolledDie[] = [],
  over: Partial<BattleSnapshot> = {},
): BattleSnapshot =>
  harnessSnap(dice, {
    enemies,
    targetId: enemies[0]?.id ?? null,
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
