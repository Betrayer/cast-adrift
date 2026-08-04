import {
  Button,
  Divider,
  Paper,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/app/Screen';
import { tokens } from '@/app/theme';
import { beaconsResolved } from '@/data/events/beacons';
import { ENDING_BY_ID } from '@/data/narrative/endings';
import { buildEpilogue } from '@/data/narrative/epilogue';
import { finalMemoryCodexId } from '@/data/narrative/memories';
import { CODEX_BY_ID } from '@/data/codex';
import { finishEnding } from '@/game/run/flow';
import { duckMusic, playSfx } from '@/services/audio';
import { haptic } from '@/services/tma';
import { useRunStore } from '@/stores/runStore';
import styles from './EndingScreen.module.css';

export const EndingScreen = () => {
  const { t } = useTranslation(['run', 'content']);
  const endingId = useRunStore((s) => s.endingId);
  const flags = useRunStore((s) => s.flags);
  const axis = useRunStore((s) => s.axis);
  const ascension = useRunStore((s) => s.ascension);
  const [beatIndex, setBeatIndex] = useState(0);

  useEffect(() => {
    playSfx('endingSting');
    duckMusic(2600);
    haptic('ending');
  }, []);

  const ending = endingId === null ? undefined : ENDING_BY_ID.get(endingId);

  const tally = useMemo(
    () =>
      buildEpilogue({
        flags,
        beaconsResolved: beaconsResolved(flags),
        ascension,
        survivedLethal: flags.survivedLethal !== undefined,
        axis,
      }),
    [flags, ascension, axis],
  );

  if (ending === undefined) {
    return (
      <Screen centered>
        <Button onClick={finishEnding}>{t('run:ending.continue')}</Button>
      </Screen>
    );
  }

  const finalMemory = CODEX_BY_ID.get(finalMemoryCodexId(ending.id));
  const showTally = beatIndex >= ending.beats.length;

  return (
    <Screen centered width="wide">
      <Paper bg={tokens.surface1} p="xl" radius="md" withBorder w="100%">
        <Stack gap="md">
          <Title order={3} c={tokens.text}>
            {t(ending.title)}
          </Title>
          {showTally ? (
            <Stack gap="sm">
              <Text c={tokens.accent} fw={600}>
                {t(ending.echoLine)}
              </Text>
              <Divider color={tokens.line} label={t('run:ending.tally')} />
                <Stack gap={6}>
                  {tally.map((line, index) => (
                    <Text
                      key={line.id}
                      size="sm"
                      c={tokens.dim}
                      className={styles.tallyLine}
                      style={{ animationDelay: `${String(index * 110)}ms` }}
                    >
                      {t(line.text, line.values)}
                    </Text>
                  ))}
                </Stack>
              {finalMemory === undefined ? null : (
                <>
                  <Divider color={tokens.line} label={t('run:codex.memory')} />
                  <Text size="sm" c={tokens.faint}>
                    {t(finalMemory.body)}
                  </Text>
                </>
              )}
              <Button size="md" fullWidth onClick={finishEnding}>
                {t('run:ending.continue')}
              </Button>
            </Stack>
          ) : (
            <Stack gap="md">
              <Text
                key={beatIndex}
                c={tokens.dim}
                className={styles.beat}
              >
                {t(ending.beats[beatIndex] ?? '')}
              </Text>
              <Text size="xs" c={tokens.faint}>
                {t('run:ending.step', {
                  cur: beatIndex + 1,
                  max: ending.beats.length,
                })}
              </Text>
              <Button
                size="md"
                fullWidth
                onClick={() => {
                  setBeatIndex(beatIndex + 1);
                }}
              >
                {t('run:ending.next')}
              </Button>
            </Stack>
          )}
        </Stack>
      </Paper>
    </Screen>
  );
};
