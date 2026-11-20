import { useEffect } from 'react';
import { fireMotionFlag, MOTION_MS } from '@/app/motion';
import { dropTargetSelector } from '@/pixi/battle/anchors';
import type { DropTarget } from '@/pixi/battle/dropTarget';
import { useBattleStore, type BattleState } from '@/stores/battleStore';
import type { SlotId } from '@/types/battle';

export type ArmBoard = Pick<BattleState, 'phase' | 'slots' | 'dice'>;

export const ARM_MS = MOTION_MS.m;

export const ARMED_ATTRIBUTE = 'data-armed';

export const armedTargets = (prev: ArmBoard, next: ArmBoard): DropTarget[] => {
  if (prev.phase !== 'placement' || next.phase !== 'placement') return [];
  const armed: DropTarget[] = [];
  if (next.slots !== prev.slots) {
    for (const [slotId, slot] of Object.entries(next.slots) as [
      SlotId,
      BattleState['slots'][SlotId],
    ][]) {
      const uid = slot?.dieUid;
      if (uid !== undefined && uid !== prev.slots[slotId]?.dieUid) {
        armed.push(slotId);
      }
    }
  }
  if (next.dice !== prev.dice) {
    const wasReserved = new Set(
      prev.dice.filter((die) => die.state === 'reserved').map((die) => die.uid),
    );
    if (
      next.dice.some(
        (die) => die.state === 'reserved' && !wasReserved.has(die.uid),
      )
    ) {
      armed.push('reserve');
    }
  }
  return armed;
};

export const armElement = (element: HTMLElement): void => {
  fireMotionFlag(element, ARMED_ATTRIBUTE, ARM_MS);
};

export const useSlotArm = (): void => {
  useEffect(
    () =>
      useBattleStore.subscribe((next, prev) => {
        for (const target of armedTargets(prev, next)) {
          for (const element of document.querySelectorAll<HTMLElement>(
            dropTargetSelector(target),
          )) {
            armElement(element);
          }
        }
      }),
    [],
  );
};
