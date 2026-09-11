import { DIRECT, type FireModeDef, type FireModeId } from '@/data/fireModes';
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

export const fireModeVars = (def: FireModeDef): Record<string, number> => {
  switch (def.id) {
    case 'scatter':
      return { fragmentBonus: def.fragmentBonus, minEnemies: def.minEnemies };
    case 'doublet':
      return { hits: def.hits };
    case 'shaped':
      return { offFacePenalty: def.offFacePenalty };
    case 'incendiary':
      return { damagePenalty: def.damagePenalty, burn: def.burn };
    case 'linked':
      return { perDie: def.perDie, cap: def.cap };
    case 'shunt':
      return { damagePenalty: def.damagePenalty, charge: def.charge };
    default:
      return {};
  }
};

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
