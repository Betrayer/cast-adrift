import { useTranslation } from 'react-i18next';
import { TapPopover } from '@/components/TapPopover';
import { isSlotBlocked, isSlotShrunk } from '@/game/battle/setup';
import {
  evasionTuningFor,
  INTERCEPT_VALUE,
  VULNERABLE_CAP,
} from '@/game/battle/resolver';
import { goalSlotsNow, type SlotProjection } from '@/game/battle/view';
import type { BattleState } from '@/stores/battleStore';
import type { ShipId } from '@/data/ships';
import type { SlotId } from '@/types/battle';
import { SlotCard } from './SlotCard';
import { onSlotTap } from './useDock';
import styles from './Board.module.css';

export const FORMULA_SLOTS: Partial<Record<SlotId, 'manoeuvre' | 'targeting'>> = {
  engines: 'manoeuvre',
  enginesB: 'manoeuvre',
  sensors: 'targeting',
};

export const manoeuvreVars = (shipId: ShipId | undefined) => {
  const tuning = evasionTuningFor(shipId);
  return {
    dodge: tuning.dodgePerValue,
    glancing: tuning.glancingPerValue,
    dodgeCap: tuning.dodgeCap,
    glancingCap: tuning.glancingCap,
    intercept: INTERCEPT_VALUE,
  };
};

export const SlotFormula = ({
  slotId,
  shipId,
}: {
  slotId: SlotId;
  shipId: ShipId;
}) => {
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
            ? t('battle:manoeuvreBrief', manoeuvreVars(shipId))
            : t('battle:targetingBrief', { cap: VULNERABLE_CAP })}
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
            formula={FORMULA_SLOTS[slotId] !== undefined}
            onTap={onSlotTap}
          />
          <SlotFormula slotId={slotId} shipId={board.shipId} />
        </div>
      );
    })}
  </div>
);
