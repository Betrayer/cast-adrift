import { useTranslation } from 'react-i18next';
import { cx } from '@/app/cx';
import type { SlotProjection } from '@/game/battle/view';
import { SlotGlyph } from '@/screens/Battle/board/SlotCard';
import {
  affinityNote,
  projectionShort,
  projectionTone,
  slotSchool,
  type SlotViewProps,
} from '@/screens/Battle/board/slotText';
import styles from './Orbit.module.css';

export interface SlotPodProps extends SlotViewProps {
  size: number;
  x: number;
  y: number;
}

const WIDE_POD = 72;

const toneClass = (projection: SlotProjection): string => {
  const tone = projectionTone(projection);
  if (tone === 'danger') return styles.podValueDanger ?? '';
  if (tone === 'bonus') return styles.podValueBonus ?? '';
  return styles.podValuePlain ?? '';
};

export const SlotPod = ({
  slotId,
  slot,
  order,
  projection,
  occupiedBy,
  blocked,
  legal,
  goal,
  size,
  x,
  y,
  onTap,
  preview = false,
}: SlotPodProps) => {
  const { t } = useTranslation(['battle']);
  const school = slotSchool(slotId, slot, projection);
  const occupied = occupiedBy !== undefined;
  const note = affinityNote(t, slotId, slot, projection?.inherited ?? null);

  return (
    <button
      type="button"
      {...(preview ? {} : { 'data-slot': slotId })}
      {...(preview || !goal ? {} : { 'data-goal': '1' })}
      data-school={school}
      {...(size >= WIDE_POD ? { 'data-wide': '1' } : {})}
      {...(preview ? {} : { 'data-testid': `slot-${slotId}` })}
      className={cx(
        styles.pod,
        legal && styles.podLegal,
        occupied && styles.podOccupied,
        blocked && styles.podBlocked,
      )}
      style={{
        width: `${String(size)}px`,
        height: `${String(size)}px`,
        left: `${String(x - size / 2)}px`,
        top: `${String(y - size / 2)}px`,
      }}
      aria-label={t(`battle:slot.${slotId}`)}
      aria-hidden={preview}
      tabIndex={preview ? -1 : undefined}
      title={note === null ? undefined : note}
      onClick={() => {
        if (!preview) onTap(slotId);
      }}
    >
      <span className={styles.podOrder} data-order={order}>
        {order}
      </span>
      {occupied ? null : (
        <>
          {school === 'none' ? null : <SlotGlyph school={school} />}
          <span className={styles.podName}>{t(`battle:slot.${slotId}`)}</span>
          {projection === undefined ? null : (
            <span
              className={cx(styles.podValue, toneClass(projection))}
              data-proj={preview ? undefined : slotId}
              data-tone={preview ? undefined : projectionTone(projection)}
            >
              {projectionShort(t, slotId, projection)}
            </span>
          )}
        </>
      )}
      {blocked ? (
        <span className={styles.podBlockedMark}>{t('battle:jam')}</span>
      ) : null}
      <span className={styles.podWell} {...(preview ? {} : { 'data-well': '' })} />
    </button>
  );
};
