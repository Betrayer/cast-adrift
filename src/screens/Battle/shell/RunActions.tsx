import { Button } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/stores/appStore';
import { useBattleStore } from '@/stores/battleStore';
import styles from '@/screens/Battle/BattleScreen.module.css';

export const RunActions = () => {
  const { t } = useTranslation(['run']);
  const phase = useBattleStore((s) => s.phase);
  const setSystemMenu = useAppStore((s) => s.setSystemMenu);
  const setBuildSheet = useAppStore((s) => s.setBuildSheet);
  return (
    <>
      <Button
        className={styles.clickable}
        size="compact-xs"
        variant="subtle"
        color="gray"
        data-open-build
        onClick={() => {
          setBuildSheet(true);
        }}
      >
        {t('run:build.open')}
      </Button>
      <Button
        className={styles.clickable}
        size="compact-xs"
        variant="subtle"
        color="gray"
        data-testid="battle-system-menu"
        disabled={phase !== 'placement'}
        onClick={() => {
          setSystemMenu(true);
        }}
      >
        {t('run:system.open')}
      </Button>
    </>
  );
};
