import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { schoolGlyphPath } from '@/data/glyphs';
import { CHARGE_CAP } from '@/game/battle/resolver';
import { slotAffinity, type SlotProjection } from '@/game/battle/view';
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
}

const CHARGE_PIPS = 10;

const projectionText = (
  t: TFunction<['battle']>,
  slotId: SlotId,
  projection: SlotProjection,
): string => {
  if (projection.jammed) return t('battle:proj.jam');
  switch (projection.kind) {
    case 'engine':
      return t('battle:slot.evasion', {
        dodge: projection.evasion?.dodgePct ?? 0,
        glancing: projection.evasion?.glancingPct ?? 0,
      });
    case 'sensor':
      return projection.sensor !== null && projection.sensor.pierce > 0
        ? t('battle:proj.markPierce', { n: projection.sensor.vulnerable })
        : t('battle:proj.mark', { n: projection.sensor?.vulnerable ?? 0 });
    case 'charge':
      return t('battle:proj.charge', { n: projection.amount });
    case 'repair':
      return t('battle:proj.heal', { n: projection.amount });
    case 'shield':
      return projection.bonus === 0
        ? t('battle:proj.shield', { n: projection.value })
        : t('battle:proj.shieldSum', {
            value: projection.value,
            base: projection.base,
            bonus: projection.bonus,
          });
    case 'damage':
      return projection.bonus === 0
        ? t('battle:proj.damage', { n: projection.value })
        : t('battle:proj.damageSum', {
            value: projection.value,
            base: projection.base,
            bonus: projection.bonus,
          });
    default:
      return slotId === 'spinal' ? t('battle:proj.jam') : t('battle:proj.none');
  }
};

const projectionTone = (projection: SlotProjection): string =>
  projection.jammed
    ? styles.projDanger ?? ''
    : projection.bonus > 0
      ? styles.projBonus ?? ''
      : styles.projPlain ?? '';

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
}: SlotCardProps) => {
  const { t } = useTranslation(['battle']);
  const affinity = slotAffinity(slotId, slot);
  const school: School | 'none' = projection?.inherited ?? affinity?.school ?? 'none';
  const cap = t('battle:slot.cap', { cap: slot.cap, mk: slot.mk });
  const inherits = projection?.inherited ?? null;
  const affinityNote =
    affinity === null
      ? null
      : affinity.kind === 'chargeMult'
        ? t(
            inherits === null
              ? 'battle:slot.affinityMult'
              : 'battle:slot.inheritsMult',
            {
              school: t(`battle:schoolShort.${affinity.school}`),
              n: affinity.amount,
            },
          )
        : t(
            inherits === null ? 'battle:slot.affinity' : 'battle:slot.inherits',
            {
              school: t(`battle:schoolShort.${affinity.school}`),
              n: affinity.amount,
            },
          );

  return (
    <button
      type="button"
      data-slot={slotId}
      data-school={school}
      data-testid={`slot-${slotId}`}
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
      onClick={() => {
        onTap(slotId);
      }}
    >
      <span className={styles.order} data-order={order}>
        {order}
      </span>
      <span className={styles.head}>
        {school === 'none' ? null : (
          <svg className={styles.glyph} viewBox="0 0 12 12" aria-hidden>
            {(() => {
              const glyph = schoolGlyphPath(school, 6, 6, 4.4);
              return glyph.mode === 'fill' ? (
                <path d={glyph.d} fill="var(--tint)" />
              ) : (
                <path
                  d={glyph.d}
                  fill="none"
                  stroke="var(--tint)"
                  strokeWidth={glyph.width}
                />
              );
            })()}
          </svg>
        )}
        <span className={styles.name}>{t(`battle:slot.${slotId}`)}</span>
      </span>
      <span className={styles.cap}>
        {shrunk ? t('battle:slot.capShrunk', { cap: slot.cap, mk: slot.mk }) : cap}
      </span>
      {affinityNote === null ? null : (
        <span
          className={`${styles.affinity ?? ''} ${
            inherits === null ? '' : styles.affinityInherited ?? ''
          }`}
          data-inherits={inherits ?? undefined}
        >
          {affinityNote}
        </span>
      )}
      {projection === undefined ? null : (
        <span
          className={`${styles.proj ?? ''} ${projectionTone(projection)}`}
          data-proj={slotId}
        >
          {projectionText(t, slotId, projection)}
        </span>
      )}
      {blocked ? <span className={styles.blocked}>{t('battle:jam')}</span> : null}
      <span className={styles.well} data-well />
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
