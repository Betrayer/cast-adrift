import { useTranslation } from 'react-i18next';
import { cx } from '@/app/cx';
import { useCompactBox } from '@/app/viewportBox';
import { SlotGlyph } from '@/screens/Battle/board/SlotCard';
import {
  affinityNote,
  projectionShort,
  projectionTone,
  projectionToneClass,
  slotSchool,
  type SlotViewProps,
} from '@/screens/Battle/board/slotText';
import styles from './Tablet.module.css';

export interface SlotRowProps extends SlotViewProps {
  shrunk: boolean;
}

const TONE_CLASSES = {
  danger: styles.outDanger,
  bonus: styles.outBonus,
  plain: styles.outPlain,
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
  goal,
  onTap,
  preview = false,
}: SlotRowProps) => {
  const { t } = useTranslation(['battle']);
  const compact = useCompactBox();
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
      {...(preview || !goal ? {} : { 'data-goal': '1' })}
      data-school={school}
      {...(preview ? {} : { 'data-testid': `slot-${slotId}` })}
      className={cx(
        styles.row,
        legal && styles.rowLegal,
        occupiedBy !== undefined && styles.rowOccupied,
        blocked && styles.rowBlocked,
      )}
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
          className={cx(styles.cap, inherits !== null && styles.capInherited)}
          data-inherits={inherits ?? undefined}
        >
          {note === null ? cap : `${cap} · ${note}`}
        </span>
      </span>
      <span className={styles.well} {...(preview ? {} : { 'data-well': '' })} />
      <span
        className={cx(
          styles.out,
          projection === undefined
            ? styles.outIdle
            : projectionToneClass(projection, TONE_CLASSES),
        )}
        data-proj={preview ? undefined : slotId}
        data-tone={
          preview || projection === undefined
            ? undefined
            : projectionTone(projection)
        }
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
