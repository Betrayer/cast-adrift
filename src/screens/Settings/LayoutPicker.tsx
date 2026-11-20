import { Stack } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { BATTLE_LAYOUTS } from '@/data/battleLayouts';
import { playSfx } from '@/services/audio';
import { chooseBattleLayout, useBattleLayoutId } from '@/services/prefs';
import { LayoutPreview } from './LayoutPreview';
import { PickerHeading, PickerInfo, PickerSynced } from './PickerParts';
import styles from './LayoutPicker.module.css';

export const LayoutPicker = () => {
  const { t } = useTranslation(['settings']);
  const active = useBattleLayoutId();

  return (
    <Stack gap="xs" data-layout-picker>
      <PickerHeading
        title={t('settings:layout.title')}
        hint={t('settings:layout.hint')}
      />
      <div className={styles.list}>
        {BATTLE_LAYOUTS.map((def) => {
          const selected = active === def.id;
          return (
            <button
              key={def.id}
              type="button"
              data-testid={`layout-${def.id}`}
              data-active={selected ? '1' : undefined}
              data-press
              className={`${styles.card ?? ''} ${
                selected ? styles.cardActive ?? '' : ''
              }`}
              onClick={() => {
                if (selected) return;
                chooseBattleLayout(def.id);
                playSfx('buy');
              }}
            >
              <LayoutPreview id={def.id} />
              <PickerInfo
                classes={styles}
                name={t(def.name)}
                tag={t(def.tag)}
                desc={t(def.desc)}
                selected={selected}
              />
            </button>
          );
        })}
      </div>
      <PickerSynced marker="layout" />
    </Stack>
  );
};
