import type { TFunction } from 'i18next';
import { slotAffinity, type SlotProjection } from '@/game/battle/view';
import type { SlotId, SlotState } from '@/types/battle';
import type { School } from '@/types/content';

export type ProjectionTone = 'danger' | 'bonus' | 'plain';

export const projectionText = (
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
      return projection.overflowHull > 0
        ? t('battle:proj.chargeOverflow', {
            n: projection.amount,
            hull: projection.overflowHull,
          })
        : t('battle:proj.charge', { n: projection.amount });
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
    case 'damage': {
      const mark = projection.amount - projection.value;
      if (mark > 0) {
        return t('battle:proj.damageMark', {
          amount: projection.amount,
          value: projection.value,
          mark,
        });
      }
      return projection.bonus === 0
        ? t('battle:proj.damage', { n: projection.value })
        : t('battle:proj.damageSum', {
            value: projection.value,
            base: projection.base,
            bonus: projection.bonus,
          });
    }
    default:
      return slotId === 'spinal' ? t('battle:proj.jam') : t('battle:proj.none');
  }
};

export const projectionShort = (
  t: TFunction<['battle']>,
  slotId: SlotId,
  projection: SlotProjection,
): string => {
  if (projection.jammed) return t('battle:proj.jam');
  switch (projection.kind) {
    case 'engine':
      return t('battle:projShort.dodge', {
        n: projection.evasion?.dodgePct ?? 0,
      });
    case 'sensor':
      return t('battle:projShort.mark', {
        n: projection.sensor?.vulnerable ?? 0,
      });
    case 'charge':
      return t('battle:proj.charge', { n: projection.amount });
    case 'repair':
      return t('battle:proj.heal', { n: projection.amount });
    case 'shield':
    case 'damage':
      return t('battle:projShort.value', { n: projection.value });
    default:
      return slotId === 'spinal'
        ? t('battle:proj.jam')
        : t('battle:projShort.none');
  }
};

export const projectionTone = (projection: SlotProjection): ProjectionTone =>
  projection.jammed ? 'danger' : projection.bonus > 0 ? 'bonus' : 'plain';

export const slotSchool = (
  slotId: SlotId,
  slot: Pick<SlotState, 'mk'>,
  projection: SlotProjection | undefined,
): School | 'none' =>
  projection?.inherited ?? slotAffinity(slotId, slot)?.school ?? 'none';

export const affinityNote = (
  t: TFunction<['battle']>,
  slotId: SlotId,
  slot: Pick<SlotState, 'mk'>,
  inherits: School | null,
): string | null => {
  const affinity = slotAffinity(slotId, slot);
  if (affinity === null) return null;
  const school = t(`battle:schoolShort.${affinity.school}`);
  if (affinity.kind === 'chargeMult') {
    return t(
      inherits === null
        ? 'battle:slot.affinityMult'
        : 'battle:slot.inheritsMult',
      { school, n: affinity.amount },
    );
  }
  return t(
    inherits === null ? 'battle:slot.affinity' : 'battle:slot.inherits',
    { school, n: affinity.amount },
  );
};
