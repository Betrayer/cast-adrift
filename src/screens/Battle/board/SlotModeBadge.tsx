import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { TapPopover, tapPointOf } from '@/components/TapPopover';
import { DIRECT, fireModeDef, type FireModeId } from '@/data/fireModes';
import { playSfx } from '@/services/audio';
import { useBattleStore } from '@/stores/battleStore';
import type { SlotId } from '@/types/battle';
import { fireModeVars, type SlotModeModel } from './slotModes';
import styles from './SlotModeBadge.module.css';

export type SlotModePlace = 'card' | 'row' | 'pod';

export interface SlotModeBadgeProps {
  model: SlotModeModel | undefined;
  place: SlotModePlace;
  style?: CSSProperties;
}

const armSlotMode = (slotId: SlotId, mode: FireModeId): boolean => {
  const live = useBattleStore.getState();
  const seq = live.lastBlock?.seq ?? 0;
  live.setSlotMode(slotId, mode);
  const after = useBattleStore.getState();
  const blocked = (after.lastBlock?.seq ?? 0) > seq;
  playSfx(blocked ? 'invalid' : 'optionTick');
  return !blocked;
};

export const SlotModeBadge = ({ model, place, style }: SlotModeBadgeProps) => {
  const { t } = useTranslation(['battle', 'content']);
  if (model === undefined) return null;
  const armed = fireModeDef(model.armed);
  const slotId = model.slotId;

  return (
    <span className={styles.badge} data-place={place} style={style}>
      <TapPopover
        label={t('battle:mode.label', { mode: t(armed.name) })}
        testId={`slot-mode-${slotId}`}
        align="end"
        role="menu"
        content={(close) => (
          <span className={styles.menu}>
            <span className={styles.menuTitle} aria-hidden>
              {`${t(`battle:slot.${slotId}`)} · ${t('battle:mode.title')}`}
            </span>
            {model.options.map((option) => {
              const def = fireModeDef(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  role="menuitemradio"
                  className={styles.item}
                  data-testid={`slot-mode-${slotId}-${option.id}`}
                  data-on={option.armed ? '1' : undefined}
                  aria-checked={option.armed}
                  aria-disabled={option.block !== null}
                  onClick={(event) => {
                    if (armSlotMode(slotId, option.id)) close(tapPointOf(event));
                  }}
                >
                  <span className={styles.itemName}>{t(def.name)}</span>
                  <span className={styles.itemMath}>
                    {t(def.desc, fireModeVars(def))}
                  </span>
                  {option.block === null ? null : (
                    <span className={styles.itemBlock}>
                      {t(`battle:block.${option.block}`)}
                    </span>
                  )}
                </button>
              );
            })}
          </span>
        )}
      >
        <span
          className={`${styles.tag ?? ''} ${
            model.armed === DIRECT.id ? '' : styles.tagArmed ?? ''
          }`}
          data-mode={model.armed}
        >
          {t(armed.short)}
        </span>
      </TapPopover>
    </span>
  );
};
