import { useTranslation } from 'react-i18next';
import { TapPopover } from '@/components/TapPopover';
import { isSlotBlocked, isSlotShrunk } from '@/game/battle/setup';
import {
  DODGE_PCT_CAP,
  DODGE_PCT_PER_VALUE,
  GLANCING_PCT_CAP,
  GLANCING_PCT_PER_VALUE,
  INTERCEPT_VALUE,
  VULNERABLE_CAP,
} from '@/game/battle/resolver';
import { goalSlotsNow, type SlotProjection } from '@/game/battle/view';
import type { BattleState } from '@/stores/battleStore';
import type { SlotId } from '@/types/battle';
import { SlotCard } from './SlotCard';
import { onSlotTap } from './useDock';
import styles from './Board.module.css';

export const FORMULA_SLOTS: Partial<Record<SlotId, 'manoeuvre' | 'targeting'>> = {
  engines: 'manoeuvre',
  sensors: 'targeting',
};

export const SlotFormula = ({ slotId }: { slotId: SlotId }) => {
  const { t } = useTranslation(['battle']);
  const kind = FORMULA_SLOTS[slotId];
  if (kind === undefined) return null;
  return (
    <TapPopover
      className={styles.formula}
      label={t(`battle:${kind}Title`)}
      testId={`slot-why-${slotId}`}
      align="end"
      content={
        <>
          <b>{t(`battle:${kind}Title`)}</b>
          <br />
          {kind === 'manoeuvre'
            ? t('battle:manoeuvreWhy', {
                dodge: DODGE_PCT_PER_VALUE,
                glancing: GLANCING_PCT_PER_VALUE,
                dodgeCap: DODGE_PCT_CAP,
                glancingCap: GLANCING_PCT_CAP,
                intercept: INTERCEPT_VALUE,
              })
            : t('battle:targetingWhy', { cap: VULNERABLE_CAP })}
        </>
      }
    >
      <span className={styles.formulaMark} aria-hidden>
        ?
      </span>
    </TapPopover>
  );
};

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
        <div key={slotId} className={styles.cell}>
          <SlotCard
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
          <SlotFormula slotId={slotId} />
        </div>
      );
    })}
  </div>
);
