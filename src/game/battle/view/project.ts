import { resolvePlayerPhase } from "@/game/battle/resolver";
import { inheritedSchool } from "@/game/battle/view/affinity";
import { BattleCtx, buildSources, emit } from "@/game/effects";
import type {
  BattleSnapshot,
  Beat,
  BeatKind,
  EvasionState,
  SensorResult,
  SlotId,
} from "@/types/battle";
import type { School } from "@/types/content";

export interface SlotProjection {
  slotId: SlotId;
  kind: BeatKind | null;
  base: number;
  value: number;
  bonus: number;
  amount: number;
  inherited: School | null;
  evasion: EvasionState | null;
  sensor: SensorResult | null;
  overflowHull: number;
  jammed: boolean;
}

const EMPTY: Omit<SlotProjection, "slotId" | "base" | "inherited"> = {
  kind: null,
  value: 0,
  bonus: 0,
  amount: 0,
  evasion: null,
  sensor: null,
  overflowHull: 0,
  jammed: false,
};

export const boardWithDie = (
  snapshot: BattleSnapshot,
  uid: string,
  slotId: SlotId,
): BattleSnapshot | null => {
  const die = snapshot.dice.find((d) => d.uid === uid);
  const slot = snapshot.slots[slotId];
  if (die === undefined || slot === undefined) return null;
  const evicted = snapshot.slots[slotId]?.dieUid;
  const dice = snapshot.dice.map((d) => {
    if (d.uid === uid) return { ...d, state: "placed" as const, slot: slotId };
    if (d.uid === evicted) {
      return { ...d, state: "tray" as const, slot: undefined };
    }
    return d;
  });
  const slots = { ...snapshot.slots };
  const previous = die.slot;
  if (previous !== undefined && previous !== slotId) {
    const old = slots[previous];
    if (old !== undefined) slots[previous] = { ...old, dieUid: undefined };
  }
  slots[slotId] = { ...slot, dieUid: uid };
  const board: BattleSnapshot = {
    ...snapshot,
    dice,
    slots,
    enemies: structuredClone(snapshot.enemies),
  };
  const placed = board.dice.find((d) => d.uid === uid);
  const ctx = new BattleCtx(board, board.flags);
  ctx.payload = {
    slot: slotId,
    ...(placed === undefined ? {} : { die: placed }),
  };
  emit(buildSources(board), "place", ctx);
  board.flags = [...ctx.flags];
  return board;
};

const collect = (
  slotId: SlotId,
  base: number,
  inherited: School | null,
  beats: readonly Beat[],
): SlotProjection => {
  const own = beats.filter((b) => b.slot === slotId);
  const head = own[0];
  if (head === undefined) {
    return { slotId, base, inherited, ...EMPTY };
  }
  const value = head.value ?? base;
  return {
    slotId,
    base,
    inherited,
    kind: head.kind,
    value,
    bonus: value - base,
    amount: own.reduce((sum, b) => sum + b.amount, 0),
    evasion: head.evasion ?? null,
    sensor: head.sensor ?? null,
    overflowHull: own.reduce((sum, b) => sum + (b.overflowHull ?? 0), 0),
    jammed: own.some((b) => b.kind === "spinalJam"),
  };
};

export const projectSlot = (
  snapshot: BattleSnapshot,
  uid: string,
  slotId: SlotId,
): SlotProjection | null => {
  const die = snapshot.dice.find((d) => d.uid === uid);
  const board = boardWithDie(snapshot, uid, slotId);
  if (die === undefined || board === null) return null;
  const { beats } = resolvePlayerPhase(board);
  return collect(slotId, die.value, inheritedSchool(die, slotId), beats);
};

export const projectPlacements = (
  snapshot: BattleSnapshot,
  uid: string,
  slotIds: readonly SlotId[],
): Partial<Record<SlotId, SlotProjection>> => {
  const out: Partial<Record<SlotId, SlotProjection>> = {};
  for (const slotId of slotIds) {
    const projection = projectSlot(snapshot, uid, slotId);
    if (projection !== null) out[slotId] = projection;
  }
  return out;
};

export const projectBoard = (
  snapshot: BattleSnapshot,
): Partial<Record<SlotId, SlotProjection>> => {
  const placed = (Object.keys(snapshot.slots) as SlotId[]).filter(
    (slotId) => snapshot.slots[slotId]?.dieUid !== undefined,
  );
  if (placed.length === 0) return {};
  const { beats } = resolvePlayerPhase(snapshot);
  const out: Partial<Record<SlotId, SlotProjection>> = {};
  for (const slotId of placed) {
    const uid = snapshot.slots[slotId]?.dieUid;
    const die = snapshot.dice.find((d) => d.uid === uid);
    if (die === undefined) continue;
    out[slotId] = collect(
      slotId,
      die.value,
      inheritedSchool(die, slotId),
      beats,
    );
  }
  return out;
};
