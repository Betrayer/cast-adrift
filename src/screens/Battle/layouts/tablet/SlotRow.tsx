import { useTranslation } from 'react-i18next';
import { useCompactHeight } from '@/app/breakpoints';
import type { SlotProjection } from '@/game/battle/view';
import { SlotGlyph } from '@/screens/Battle/board/SlotCard';
import {
  affinityNote,
  projectionShort,
  projectionTone,
  slotSchool,
} from '@/screens/Battle/board/slotText';
import type { SlotId, SlotState } from '@/types/battle';
import styles from './Tablet.module.css';

export interface SlotRowProps {
  slotId: SlotId;
  slot: SlotState;
  order: number;
  projection: SlotProjection | undefined;
  occupiedBy: string | undefined;
  blocked: boolean;
  shrunk: boolean;
  legal: boolean;
  offTurn: boolean;
  onTap: (slotId: SlotId) => void;
  preview?: boolean;
}

const toneClass = (projection: SlotProjection): string => {
  const tone = projectionTone(projection);
  if (tone === 'danger') return styles.outDanger ?? '';
  if (tone === 'bonus') return styles.outBonus ?? '';
  return styles.outPlain ?? '';
};

export const SlotRow = ({
  slotId,
  slot,
  order,
  projection,
  occupiedBy,
  blocked,
  shrunk,
  legal,
  offTurn,
  onTap,
  preview = false,
}: SlotRowProps) => {
  const { t } = useTranslation(['battle']);
  const compact = useCompactHeight();
  const school = slotSchool(slotId, slot, projection);
  const inherits = projection?.inherited ?? null;
  const note = affinityNote(t, slotId, slot, inherits);
  const cap = shrunk
    ? t('battle:slot.capShrunk', { cap: slot.cap, mk: slot.mk })
    : compact
      ? t('battle:slot.capShort', { cap: slot.cap })
      : t('battle:slot.cap', { cap: slot.cap, mk: slot.mk });

  return (
    <button
      type="button"
      {...(preview ? {} : { 'data-slot': slotId })}
      data-school={school}
      {...(preview ? {} : { 'data-testid': `slot-${slotId}` })}
      className={[
        styles.row ?? '',
        legal ? styles.rowLegal ?? '' : '',
        occupiedBy === undefined ? '' : styles.rowOccupied ?? '',
        blocked ? styles.rowBlocked ?? '' : '',
        offTurn ? styles.rowOffTurn ?? '' : '',
      ]
        .filter((name) => name !== '')
        .join(' ')}
      aria-label={t(`battle:slot.${slotId}`)}
      aria-hidden={preview}
      tabIndex={preview ? -1 : undefined}
      onClick={() => {
        if (!preview) onTap(slotId);
      }}
    >
      <span className={styles.chip}>
        <span className={styles.chipOrder} data-order={order}>
          {order}
        </span>
        {school === 'none' ? null : <SlotGlyph school={school} />}
      </span>
      <span className={styles.meta}>
        <span className={styles.name}>{t(`battle:slot.${slotId}`)}</span>
        <span
          className={`${styles.cap ?? ''} ${
            inherits === null ? '' : styles.capInherited ?? ''
          }`}
          data-inherits={inherits ?? undefined}
        >
          {note === null ? cap : `${cap} · ${note}`}
        </span>
      </span>
      <span className={styles.well} {...(preview ? {} : { 'data-well': '' })} />
      <span
        className={`${styles.out ?? ''} ${
          projection === undefined ? styles.outIdle ?? '' : toneClass(projection)
        }`}
        data-proj={preview ? undefined : slotId}
      >
        {projection === undefined
          ? t('battle:conveyor.unknown')
          : t('battle:conveyor.out', {
              text: projectionShort(t, slotId, projection),
            })}
      </span>
      {blocked ? (
        <span className={styles.blocked}>{t('battle:jam')}</span>
      ) : null}
    </button>
  );
};
