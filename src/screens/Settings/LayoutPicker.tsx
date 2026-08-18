import { Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { tokens } from '@/app/theme';
import { BATTLE_LAYOUTS } from '@/data/battleLayouts';
import { playSfx } from '@/services/audio';
import { chooseBattleLayout, useBattleLayoutId } from '@/services/prefs';
import { useAppStore } from '@/stores/appStore';
import { LayoutPreview } from './LayoutPreview';
import styles from './LayoutPicker.module.css';

export const LayoutPicker = () => {
  const { t } = useTranslation(['settings']);
  const active = useBattleLayoutId();
  const uid = useAppStore((s) => s.uid);

  return (
    <Stack gap="xs" data-layout-picker>
      <Text size="sm" c={tokens.dim}>
        {t('settings:layout.title')}
      </Text>
      <Text size="xs" c={tokens.faint}>
        {t('settings:layout.hint')}
      </Text>
      <div className={styles.list}>
        {BATTLE_LAYOUTS.map((def) => {
          const selected = active === def.id;
          return (
            <button
              key={def.id}
              type="button"
              data-testid={`layout-${def.id}`}
              data-active={selected ? '1' : undefined}
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
              <span className={styles.info}>
                <span className={styles.head}>
                  <span className={styles.name}>{t(def.name)}</span>
                  <span className={styles.badge}>
                    {t(selected ? 'settings:layout.active' : 'settings:layout.use')}
                  </span>
                </span>
                <span className={styles.tag}>{t(def.tag)}</span>
                <span className={styles.desc}>{t(def.desc)}</span>
              </span>
            </button>
          );
        })}
      </div>
      {uid === null ? null : (
        <Text size="xs" c={tokens.faint} data-layout-synced>
          {t('settings:layout.synced')}
        </Text>
      )}
    </Stack>
  );
};
