import { canPlaceDie } from "@/game/battle/setup";
import { sourceMods } from "@/game/run/runMods";
import type { BattleBoard } from "@/game/battle/view/types";
import type { SlotId } from "@/types/battle";

export interface LegalTargets {
  slots: SlotId[];
  reserve: boolean;
}

export const allowedSlotsForTurn = (
  scriptedSlots: readonly (readonly SlotId[])[] | null,
  turn: number,
): readonly SlotId[] | null => {
  if (scriptedSlots === null) return null;
  return scriptedSlots[turn - 1] ?? null;
};

export const slotAllowedThisTurn = (
  board: Pick<BattleBoard, "scriptedSlots" | "turn">,
  slotId: SlotId,
): boolean => {
  const allowed = allowedSlotsForTurn(board.scriptedSlots, board.turn);
  return allowed === null || allowed.includes(slotId);
};

export const boardSlotIds = (board: Pick<BattleBoard, "slots">): SlotId[] =>
  Object.keys(board.slots) as SlotId[];

export const reservedCount = (board: Pick<BattleBoard, "dice">): number =>
  board.dice.filter((d) => d.state === "reserved").length;

export const reserveCapacity = (
  board: Pick<BattleBoard, "reserveCap" | "perks" | "chartPicks" | "modules">,
  school?: string,
): number =>
  board.reserveCap +
  (school === "blue" || school === "prismatic"
    ? sourceMods(board).blueReserveDelta
    : 0);

export const canReserve = (board: BattleBoard, uid: string): boolean => {
  if (board.phase !== "placement" || board.rerollMode) return false;
  const die = board.dice.find((d) => d.uid === uid);
  if (die?.state !== "tray") return false;
  return reservedCount(board) < reserveCapacity(board, die.school);
};

export const legalTargets = (board: BattleBoard, uid: string): LegalTargets => {
  if (board.phase !== "placement" || board.rerollMode) {
    return { slots: [], reserve: false };
  }
  return {
    slots: boardSlotIds(board).filter(
      (slotId) =>
        slotAllowedThisTurn(board, slotId) && canPlaceDie(board, uid, slotId),
    ),
    reserve: canReserve(board, uid),
  };
};
