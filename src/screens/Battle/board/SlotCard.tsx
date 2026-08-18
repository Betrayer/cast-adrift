import { useTranslation } from 'react-i18next';
import { schoolGlyphPath } from '@/data/glyphs';
import { CHARGE_CAP } from '@/game/battle/resolver';
import type { SlotProjection } from '@/game/battle/view';
import {
  affinityNote,
  projectionText,
  projectionTone,
  slotSchool,
} from '@/screens/Battle/board/slotText';
import type { SlotId, SlotState } from '@/types/battle';
import type { School } from '@/types/content';
import styles from './Board.module.css';

export interface SlotCardProps {
  slotId: SlotId;
  slot: SlotState;
  order: number;
  projection: SlotProjection | undefined;
  occupiedBy: string | undefined;
  blocked: boolean;
  shrunk: boolean;
  legal: boolean;
  offTurn: boolean;
  charge: number;
  onTap: (slotId: SlotId) => void;
  preview?: boolean;
}

const CHARGE_PIPS = 10;

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
  offTurn,
  charge,
  onTap,
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
      data-school={school}
      {...(preview ? {} : { 'data-testid': `slot-${slotId}` })}
      className={[
        styles.card ?? '',
        legal ? styles.cardLegal ?? '' : '',
        occupiedBy === undefined ? '' : styles.cardOccupied ?? '',
        blocked ? styles.cardBlocked ?? '' : '',
        offTurn ? styles.cardOffTurn ?? '' : '',
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
      {note === null ? null : (
        <span
          className={`${styles.affinity ?? ''} ${
            inherits === null ? '' : styles.affinityInherited ?? ''
          }`}
          data-inherits={inherits ?? undefined}
        >
          {note}
        </span>
      )}
      {projection === undefined ? null : (
        <span
          className={`${styles.proj ?? ''} ${toneClass(projection)}`}
          data-proj={preview ? undefined : slotId}
        >
          {projectionText(t, slotId, projection)}
        </span>
      )}
      {blocked ? <span className={styles.blocked}>{t('battle:jam')}</span> : null}
      <span className={styles.well} {...(preview ? {} : { 'data-well': '' })} />
      {slotId === 'reactor' ? (
        <span className={styles.pips} aria-hidden>
          {Array.from({ length: CHARGE_PIPS }, (_, i) => (
            <span
              key={i}
              className={`${styles.pip ?? ''} ${
                i < Math.min(charge, CHARGE_CAP) ? styles.pipOn ?? '' : ''
              }`}
            />
          ))}
        </span>
      ) : null}
    </button>
  );
};
