import { DIRECT, type FireModeId } from '@/data/fireModes';
import {
  boardSlotIds,
  modeBlockFor,
  slotFireModes,
  type BattleBoard,
  type ModeBlock,
} from '@/game/battle/view';
import type { SlotId } from '@/types/battle';

export interface SlotModeOption {
  id: FireModeId;
  block: ModeBlock | null;
  armed: boolean;
}

export interface SlotModeModel {
  slotId: SlotId;
  armed: FireModeId;
  options: readonly SlotModeOption[];
}

export type SlotModeModels = Partial<Record<SlotId, SlotModeModel>>;

type ModeBoard = Pick<BattleBoard, 'slots' | 'enemies'>;

export const slotModeModel = (
  board: ModeBoard,
  slotId: SlotId,
): SlotModeModel | undefined => {
  const modes = slotFireModes(board, slotId);
  if (modes.length < 2) return undefined;
  const armed = board.slots[slotId]?.mode ?? DIRECT.id;
  return {
    slotId,
    armed,
    options: modes.map((id) => ({
      id,
      block: modeBlockFor(board, slotId, id),
      armed: id === armed,
    })),
  };
};

export const slotModeModels = (board: ModeBoard): SlotModeModels => {
  const out: SlotModeModels = {};
  for (const slotId of boardSlotIds(board)) {
    const model = slotModeModel(board, slotId);
    if (model !== undefined) out[slotId] = model;
  }
  return out;
};
