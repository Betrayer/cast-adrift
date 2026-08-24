import { Button, Text } from '@mantine/core';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AbandonConfirm } from '@/components/AbandonConfirm';
import { AppSheet } from '@/components/AppModal';
import { tokens } from '@/app/theme';
import { autosaveRun } from '@/game/run/flow';
import { useAppStore } from '@/stores/appStore';
import styles from './SystemMenu.module.css';

export const SystemMenu = () => {
  const { t } = useTranslation(['run', 'menu', 'settings', 'common']);
  const opened = useAppStore((s) => s.systemMenu);
  const setSystemMenu = useAppStore((s) => s.setSystemMenu);
  const setBuildSheet = useAppStore((s) => s.setBuildSheet);
  const go = useAppStore((s) => s.go);
  const [confirming, setConfirming] = useState(false);

  if (!opened) return null;

  const close = (): void => {
    setSystemMenu(false);
  };

  const entry = (
    key: string,
    label: string,
    onClick: () => void,
  ): React.ReactElement => (
    <Button
      key={key}
      size="md"
      variant="default"
      fullWidth
      data-testid={`system-${key}`}
      onClick={onClick}
    >
      {label}
    </Button>
  );

  return (
    <AppSheet
      label={t('run:system.title')}
      testId="system-menu"
      onClose={close}
    >
      <div className={styles.head}>
        <Text fw={700} c={tokens.text}>
          {t('run:system.title')}
        </Text>
        <Button
          size="compact-sm"
          variant="subtle"
          color="gray"
          data-testid="system-resume"
          onClick={close}
        >
          {t('run:system.resume')}
        </Button>
      </div>
      <div className={styles.body}>
        {entry('build', t('run:build.open'), () => {
          setSystemMenu(false);
          setBuildSheet(true);
        })}
        {entry('journal', t('run:journal.open'), () => {
          go('journal');
        })}
        {entry('codex', t('run:codex.title'), () => {
          go('codex');
        })}
        {entry('settings', t('settings:title'), () => {
          go('settings');
        })}
        <div className={styles.spacer} />
        {entry('suspend', t('run:system.toMenu'), () => {
          autosaveRun();
          go('menu');
        })}
        <Text size="xs" c={tokens.faint} className={styles.hint}>
          {t('run:system.toMenuHint')}
        </Text>
        <Button
          size="md"
          variant="subtle"
          color="gray"
          fullWidth
          data-testid="system-abandon"
          onClick={() => {
            setConfirming(true);
          }}
        >
          {t('run:map.abandon')}
        </Button>
      </div>

      <AbandonConfirm
        opened={confirming}
        prefix="system"
        onCancel={() => {
          setConfirming(false);
        }}
        onConfirm={() => {
          setConfirming(false);
          setSystemMenu(false);
        }}
      />
    </AppSheet>
  );
};
