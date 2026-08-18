import {
  canPlaceDie,
  dieFitsSlot,
  isDieLocked,
  isSlotBlocked,
} from "@/game/battle/setup";
import { dieHasGrant } from "@/data/engravings";
import { sourceMods } from "@/game/run/runMods";
import type { BattleBoard } from "@/game/battle/view/types";
import type { CheckMove, CheckStep, SlotId } from "@/types/battle";

export interface LegalTargets {
  slots: SlotId[];
  reserve: boolean;
}

export type PlaceBlock =
  | "notAllowed"
  | "occupied"
  | "notInTray"
  | "tierCap"
  | "slotBlocked"
  | "dieLocked";

type CheckBoard = Pick<BattleBoard, "checkSteps" | "checkIndex">;

export const currentCheckStep = (board: CheckBoard): CheckStep | null =>
  board.checkSteps === null
    ? null
    : (board.checkSteps[board.checkIndex] ?? null);

export const checkMovesNow = (
  board: CheckBoard,
): readonly CheckMove[] | null => currentCheckStep(board)?.moves ?? null;

export const allowedSlotsNow = (board: CheckBoard): readonly SlotId[] | null =>
  checkMovesNow(board)?.map((m) => m.slot) ?? null;

export const slotAllowedNow = (board: CheckBoard, slotId: SlotId): boolean => {
  const moves = checkMovesNow(board);
  return moves === null || moves.some((m) => m.slot === slotId);
};

export const moveAllowedNow = (
  board: CheckBoard,
  uid: string,
  slotId: SlotId,
): boolean => {
  const moves = checkMovesNow(board);
  return moves === null || moves.some((m) => m.uid === uid && m.slot === slotId);
};

export const pendingCheckMoves = (
  board: CheckBoard & Pick<BattleBoard, "slots">,
): readonly CheckMove[] =>
  checkMovesNow(board)?.filter((m) => board.slots[m.slot]?.dieUid !== m.uid) ??
  [];

export const goalSlotsNow = (
  board: CheckBoard & Pick<BattleBoard, "slots">,
): readonly SlotId[] => pendingCheckMoves(board).map((m) => m.slot);

export const goalDiceNow = (
  board: CheckBoard & Pick<BattleBoard, "slots">,
): readonly string[] => pendingCheckMoves(board).map((m) => m.uid);

export const checkEndTurnBlocked = (
  board: CheckBoard & Pick<BattleBoard, "slots">,
): boolean => pendingCheckMoves(board).length > 0;

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
  if (checkMovesNow(board) !== null) return false;
  const die = board.dice.find((d) => d.uid === uid);
  if (die?.state !== "tray") return false;
  return reservedCount(board) < reserveCapacity(board, die.school);
};

export const placeBlockFor = (
  board: BattleBoard,
  uid: string,
  slotId: SlotId,
): PlaceBlock | null => {
  if (!moveAllowedNow(board, uid, slotId)) return "notAllowed";
  const die = board.dice.find((d) => d.uid === uid);
  const slot = board.slots[slotId];
  if (die === undefined || slot === undefined) return "notAllowed";
  if (slot.dieUid !== undefined) return "occupied";
  if (die.state !== "tray") return "notInTray";
  if (isDieLocked(board, uid)) return "dieLocked";
  if (
    isSlotBlocked(board, slotId) &&
    !dieHasGrant(board.engravings, die.defId, "blockImmune")
  ) {
    return "slotBlocked";
  }
  if (!dieFitsSlot(board, die, slot, slotId)) return "tierCap";
  return null;
};

export const legalTargets = (board: BattleBoard, uid: string): LegalTargets => {
  if (board.phase !== "placement" || board.rerollMode) {
    return { slots: [], reserve: false };
  }
  return {
    slots: boardSlotIds(board).filter(
      (slotId) =>
        moveAllowedNow(board, uid, slotId) && canPlaceDie(board, uid, slotId),
    ),
    reserve: canReserve(board, uid),
  };
};
