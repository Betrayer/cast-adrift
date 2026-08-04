import { Button, Paper, Stack, Text, Title } from '@mantine/core';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/app/Screen';
import { tokens } from '@/app/theme';
import { PROLOGUE_BEATS } from '@/data/narrative/prologue';
import { startPrologueBattle } from '@/game/run/flow';
import { useAppStore } from '@/stores/appStore';
import { useMetaStore } from '@/stores/metaStore';
import styles from './PrologueScreen.module.css';

export const PrologueScreen = () => {
  const { t } = useTranslation(['run', 'content']);
  const [index, setIndex] = useState(0);
  const go = useAppStore((s) => s.go);
  const beat = PROLOGUE_BEATS[index];

  const advance = (): void => {
    if (index + 1 < PROLOGUE_BEATS.length) {
      setIndex(index + 1);
      return;
    }
    useMetaStore.getState().markPrologueDone();
    startPrologueBattle();
  };

  if (beat === undefined) return null;

  return (
    <Screen centered>
      <Paper bg={tokens.surface1} p="xl" radius="md" withBorder w="100%">
        <Stack gap="md">
          <Title order={4} c={tokens.dim}>
            {t('run:prologue.title')}
          </Title>
          <Stack gap="sm" key={beat.id}>
            {beat.lines.map((line, i) => (
              <Text
                key={`${beat.id}-${String(i)}`}
                className={styles.line}
                style={{ animationDelay: `${String(i * 260)}ms` }}
                c={line.voice === 'echo' ? tokens.accent : tokens.dim}
                fw={line.voice === 'echo' ? 600 : 400}
              >
                {line.voice === 'echo'
                  ? t('run:prologue.echo', { line: t(line.text) })
                  : t(line.text)}
              </Text>
            ))}
          </Stack>
          <Text size="xs" c={tokens.faint}>
            {t('run:prologue.step', {
              cur: index + 1,
              max: PROLOGUE_BEATS.length,
            })}
          </Text>
          <Button size="md" fullWidth onClick={advance}>
            {t(beat.cta)}
          </Button>
          <Button
            size="compact-xs"
            variant="subtle"
            color="gray"
            onClick={() => {
              go('menu');
            }}
          >
            {t('run:prologue.leave')}
          </Button>
        </Stack>
      </Paper>
    </Screen>
  );
};
