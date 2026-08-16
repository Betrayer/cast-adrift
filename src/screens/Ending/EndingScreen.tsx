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
import { deathLineFor } from '@/data/narrative/deathLines';
import { endingBeats, ENDING_BY_ID } from '@/data/narrative/endings';
import {
  buildEpilogue,
  DEATH_TALLY_LINES,
  type EpilogueContext,
} from '@/data/narrative/epilogue';
import { finalMemoryCodexId } from '@/data/narrative/memories';
import { CODEX_BY_ID } from '@/data/codex';
import { finishEnding, leaveDeathEpilogue } from '@/game/run/flow';
import { depthFor } from '@/game/run/modes';
import { duckMusic, playSfx } from '@/services/audio';
import { haptic } from '@/services/tma';
import { useAppStore } from '@/stores/appStore';
import { useRunStore } from '@/stores/runStore';
import styles from './EndingScreen.module.css';

const useEpilogueContext = (death: boolean): EpilogueContext => {
  const flags = useRunStore((s) => s.flags);
  const axis = useRunStore((s) => s.axis);
  const ascension = useRunStore((s) => s.ascension);
  const sector = useRunStore((s) => s.sector);
  const sectorIndex = useRunStore((s) => s.sectorIndex);
  const depthRow = useRunStore((s) => s.depthRow);
  const crossedThreshold = useRunStore((s) => s.crossedThreshold);
  return useMemo(
    () => ({
      flags,
      beaconsResolved: beaconsResolved(flags),
      ascension,
      survivedLethal: flags.survivedLethal !== undefined,
      axis,
      sector,
      depth: Math.round(depthFor(sectorIndex, depthRow)),
      death,
      crossedThreshold,
    }),
    [flags, ascension, axis, sector, sectorIndex, depthRow, death, crossedThreshold],
  );
};

const DeathEpilogue = () => {
  const { t } = useTranslation(['run', 'content']);
  const ctx = useEpilogueContext(true);
  const tally = useMemo(
    () => buildEpilogue(ctx, DEATH_TALLY_LINES),
    [ctx],
  );

  useEffect(() => {
    playSfx('endingSting');
    duckMusic(2200);
    haptic('ending');
  }, []);

  return (
    <Screen centered width="wide">
      <Paper bg={tokens.surface1} p="xl" radius="md" withBorder w="100%">
        <Stack gap="md">
          <Title order={3} c={tokens.danger}>
            {t('run:ending.deathTitle')}
          </Title>
          <Text c={tokens.accent} fw={600}>
            {t(deathLineFor(ctx))}
          </Text>
          <Text size="sm" c={tokens.faint}>
            {t('run:ending.deathWhere', { sector: ctx.sector, depth: ctx.depth })}
          </Text>
          <Divider color={tokens.line} label={t('run:ending.tally')} />
          <Stack gap={6}>
            {tally.map((line, index) => (
              <Text
                key={line.id}
                size="sm"
                c={tokens.dim}
                data-epilogue-line
                className={styles.tallyLine}
                style={{ animationDelay: `${String(index * 130)}ms` }}
              >
                {t(line.text, line.values)}
              </Text>
            ))}
          </Stack>
          <Button
            size="md"
            fullWidth
            data-epilogue-continue
            onClick={leaveDeathEpilogue}
          >
            {t('run:ending.continue')}
          </Button>
        </Stack>
      </Paper>
    </Screen>
  );
};

const VictoryEnding = ({ endingId }: { endingId: string }) => {
  const { t } = useTranslation(['run', 'content']);
  const ctx = useEpilogueContext(false);
  const [beatIndex, setBeatIndex] = useState(0);

  useEffect(() => {
    playSfx('endingSting');
    duckMusic(2600);
    haptic('ending');
  }, []);

  const ending = ENDING_BY_ID.get(endingId);
  const tally = useMemo(() => buildEpilogue(ctx), [ctx]);
  const beats = useMemo(
    () =>
      ending === undefined
        ? []
        : endingBeats(ending, {
            axis: ctx.axis,
            flags: ctx.flags,
            beaconsResolved: ctx.beaconsResolved,
            crossedThreshold: ctx.crossedThreshold,
          }),
    [ending, ctx],
  );

  if (ending === undefined) {
    return (
      <Screen centered>
        <Button onClick={finishEnding}>{t('run:ending.continue')}</Button>
      </Screen>
    );
  }

  const finalMemory = CODEX_BY_ID.get(finalMemoryCodexId(ending.id));
  const showTally = beatIndex >= beats.length;

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
                    data-epilogue-line
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
              <Text key={beatIndex} c={tokens.dim} className={styles.beat}>
                {t(beats[beatIndex] ?? '')}
              </Text>
              <Text size="xs" c={tokens.faint}>
                {t('run:ending.step', {
                  cur: beatIndex + 1,
                  max: beats.length,
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

export const EndingScreen = () => {
  const death = useAppStore((s) => s.params?.death) === '1';
  const endingId = useRunStore((s) => s.endingId);
  if (death || endingId === null) return <DeathEpilogue />;
  return <VictoryEnding endingId={endingId} />;
};
