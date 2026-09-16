import { useTranslation } from 'react-i18next';
import { cx } from '@/app/cx';
import { schoolGlyphPath } from '@/data/glyphs';
import type { SlotProjection } from '@/game/battle/view';
import {
  affinityNote,
  projectionText,
  projectionTone,
  slotSchool,
  type SlotViewProps,
} from '@/screens/Battle/board/slotText';
import type { School } from '@/types/content';
import styles from './Board.module.css';

export interface SlotCardProps extends SlotViewProps {
  shrunk: boolean;
  charge: number;
  chargeCap: number;
  formula?: boolean;
}

export const SlotGlyph = ({ school }: { school: School }) => {
  const glyph = schoolGlyphPath(school, 6, 6, 4.4);
  return (
    <svg className={styles.glyph} viewBox="0 0 12 12" aria-hidden>
      {glyph.mode === 'fill' ? (
        <path d={glyph.d} fill="var(--tint)" />
      ) : (
        <path
          d={glyph.d}
          fill="none"
          stroke="var(--tint)"
          strokeWidth={glyph.width}
        />
      )}
    </svg>
  );
};

const toneClass = (projection: SlotProjection): string => {
  const tone = projectionTone(projection);
  if (tone === 'danger') return styles.projDanger ?? '';
  if (tone === 'bonus') return styles.projBonus ?? '';
  return styles.projPlain ?? '';
};

export const SlotCard = ({
  slotId,
  slot,
  order,
  projection,
  occupiedBy,
  blocked,
  shrunk,
  legal,
  goal,
  charge,
  chargeCap,
  onTap,
  formula = false,
  preview = false,
}: SlotCardProps) => {
  const { t } = useTranslation(['battle']);
  const school = slotSchool(slotId, slot, projection);
  const cap = t('battle:slot.cap', { cap: slot.cap, mk: slot.mk });
  const inherits = projection?.inherited ?? null;
  const note = affinityNote(t, slotId, slot, inherits);

  return (
    <button
      type="button"
      {...(preview ? {} : { 'data-slot': slotId })}
      {...(preview || !goal ? {} : { 'data-goal': '1' })}
      {...(formula ? { 'data-formula': '1' } : {})}
      data-school={school}
      {...(preview ? {} : { 'data-testid': `slot-${slotId}` })}
      className={cx(
        styles.card,
        legal && styles.cardLegal,
        occupiedBy !== undefined && styles.cardOccupied,
        blocked && styles.cardBlocked,
      )}
      aria-label={t(`battle:slot.${slotId}`)}
      aria-hidden={preview}
      tabIndex={preview ? -1 : undefined}
      onClick={() => {
        if (!preview) onTap(slotId);
      }}
    >
      <span className={styles.order} data-order={order}>
        {order}
      </span>
      <span className={styles.head}>
        {school === 'none' ? null : <SlotGlyph school={school} />}
        <span className={styles.name}>{t(`battle:slot.${slotId}`)}</span>
      </span>
      <span className={styles.cap}>
        {shrunk ? t('battle:slot.capShrunk', { cap: slot.cap, mk: slot.mk }) : cap}
      </span>
      {blocked ? (
        <span className={styles.blocked}>{t('battle:jam')}</span>
      ) : null}
      {note === null ? null : (
        <span
          className={cx(styles.affinity, inherits !== null && styles.affinityInherited)}
          data-inherits={inherits ?? undefined}
        >
          {note}
        </span>
      )}
      {projection === undefined ? null : (
        <span
          key={projectionText(t, slotId, projection)}
          className={cx(styles.proj, toneClass(projection))}
          data-proj={preview ? undefined : slotId}
          data-tone={preview ? undefined : projectionTone(projection)}
        >
          {projectionText(t, slotId, projection)}
        </span>
      )}
      <span className={styles.well} {...(preview ? {} : { 'data-well': '' })} />
      {slotId === 'reactor' ? (
        <span
          className={styles.pips}
          aria-hidden
          {...(preview ? {} : { 'data-charge-pips': String(chargeCap) })}
        >
          {Array.from({ length: chargeCap }, (_, i) => (
            <span
              key={i}
              className={cx(styles.pip, i < Math.min(charge, chargeCap) && styles.pipOn)}
              data-pip={i < Math.min(charge, chargeCap) ? 'on' : 'off'}
            />
          ))}
        </span>
      ) : null}
    </button>
  );
};
