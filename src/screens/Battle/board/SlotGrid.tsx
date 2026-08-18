import { isSlotBlocked, isSlotShrunk } from '@/game/battle/setup';
import { goalSlotsNow, type SlotProjection } from '@/game/battle/view';
import type { BattleState } from '@/stores/battleStore';
import type { SlotId } from '@/types/battle';
import { SlotCard } from './SlotCard';
import { onSlotTap } from './useDock';
import styles from './Board.module.css';

export interface SlotGridProps {
  board: BattleState;
  ordered: readonly SlotId[];
  legal: readonly SlotId[];
  projections: Partial<Record<SlotId, SlotProjection>>;
}

export const SlotGrid = ({
  board,
  ordered,
  legal,
  projections,
}: SlotGridProps) => (
  <div className={styles.grid}>
    {ordered.map((slotId, index) => {
      const slot = board.slots[slotId];
      if (slot === undefined) return null;
      return (
        <SlotCard
          key={slotId}
          slotId={slotId}
          slot={slot}
          order={index + 1}
          projection={projections[slotId]}
          occupiedBy={slot.dieUid}
          blocked={isSlotBlocked(board, slotId)}
          shrunk={isSlotShrunk(board, slotId)}
          legal={legal.includes(slotId)}
          goal={goalSlotsNow(board).includes(slotId)}
          charge={board.charge}
          onTap={onSlotTap}
        />
      );
    })}
  </div>
);
