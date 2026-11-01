import { Stack } from '@mantine/core';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRollSettings } from '@/app/rollSettings';
import { DiceRollOverlay, type OverlayDie } from '@/components/DiceRollOverlay';
import { ROLL_STYLE_DEFS } from '@/data/rollStyles';
import { playSfx } from '@/services/audio';
import { chooseRollStyle } from '@/services/prefs';
import type { RollStyle } from '@/types';
import { PickerHeading, PickerInfo, PickerSynced } from './PickerParts';
import styles from './ChartLayoutPicker.module.css';

const PREVIEW_SIZE = 64;

const previewDie = (roll: number): OverlayDie => ({
  key: `preview-${String(roll)}`,
  defId: 'lancehead',
  tier: 20,
  value: ((roll * 7 + 13) % 20) + 1,
  school: 'red',
});

export const RollStylePicker = () => {
  const { t } = useTranslation(['settings']);
  const { style: active, durationMs, reduced } = useRollSettings();
  const [rolls, setRolls] = useState<Record<RollStyle, number>>({ flip: 1, reel: 1, blur: 1 });

  const pick = (id: RollStyle): void => {
    setRolls((prev) => ({ ...prev, [id]: prev[id] + 1 }));
    if (id === active) return;
    chooseRollStyle(id);
    playSfx('buy');
  };

  return (
    <Stack gap="xs" data-roll-style-picker>
      <PickerHeading
        title={t('settings:rollStyle.title')}
        hint={t('settings:rollStyle.hint')}
      />
      <div className={styles.list}>
        {ROLL_STYLE_DEFS.map((def) => {
          const selected = active === def.id;
          const roll = rolls[def.id];
          return (
            <button
              key={def.id}
              type="button"
              data-testid={`roll-style-${def.id}`}
              data-active={selected ? '1' : undefined}
              data-press
              className={`${styles.card ?? ''} ${selected ? styles.active ?? '' : ''}`}
              onClick={() => {
                pick(def.id);
              }}
            >
              <span
                className={styles.stage}
                style={{ width: PREVIEW_SIZE + 8, height: PREVIEW_SIZE + 8 }}
              >
                <DiceRollOverlay
                  key={roll}
                  dice={[previewDie(roll)]}
                  seed={roll * 104729 + def.id.length}
                  style={def.id}
                  durationMs={durationMs}
                  reduced={reduced}
                  size={PREVIEW_SIZE}
                />
              </span>
              <PickerInfo
                classes={styles}
                name={t(def.name)}
                desc={t(def.desc)}
                selected={selected}
              />
            </button>
          );
        })}
      </div>
      <PickerSynced />
    </Stack>
  );
};