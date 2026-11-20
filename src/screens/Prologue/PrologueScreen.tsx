import { Button, Paper, Stack, Text, Title } from '@mantine/core';
import { useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/app/Screen';
import { MOTION_MS } from '@/app/motion';
import { tokens } from '@/app/theme';
import { Typewriter, typewriterLineDelays } from '@/components/Typewriter';
import { PROLOGUE_BEATS, type PrologueBeat } from '@/data/narrative/prologue';
import { startPrologueBattle, startSystemsCheckSandbox } from '@/game/run/flow';
import { useAppStore } from '@/stores/appStore';
import { useMetaStore } from '@/stores/metaStore';
import styles from './PrologueScreen.module.css';

export const PROLOGUE_LINE_GAP_MS = MOTION_MS.s;

export const prologueLineDelays = (texts: readonly string[]): number[] =>
  typewriterLineDelays(texts, 0, PROLOGUE_LINE_GAP_MS);

const lineStyle = (delay: number): CSSProperties =>
  ({ '--ca-line-delay': `${String(delay)}ms` }) as CSSProperties;

const PrologueLines = ({
  beat,
  texts,
}: {
  beat: PrologueBeat;
  texts: readonly string[];
}) => {
  const [skipped, setSkipped] = useState(false);
  const delays = prologueLineDelays(texts);
  const skip = (): void => {
    setSkipped(true);
  };
  return (
    <Stack gap="sm" data-prologue-lines={skipped ? 'skipped' : 'typing'}>
      {beat.lines.map((line, i) => (
        <Text
          key={`${beat.id}-${String(i)}`}
          className={skipped ? undefined : styles.line}
          style={lineStyle(delays[i] ?? 0)}
          c={line.voice === 'echo' ? tokens.accent : tokens.dim}
          fw={line.voice === 'echo' ? 600 : 400}
          data-prologue-line={i}
        >
          <Typewriter
            text={texts[i] ?? ''}
            delayMs={delays[i] ?? 0}
            instant={skipped}
            onSkip={skip}
          />
        </Text>
      ))}
    </Stack>
  );
};

export const PrologueScreen = () => {
  const { t } = useTranslation(['run', 'content']);
  const [index, setIndex] = useState(0);
  const go = useAppStore((s) => s.go);
  const replay = useAppStore((s) => s.params?.replay) === '1';
  const beat = PROLOGUE_BEATS[index];

  const advance = (): void => {
    if (index + 1 < PROLOGUE_BEATS.length) {
      setIndex(index + 1);
      return;
    }
    if (replay) {
      startSystemsCheckSandbox();
      return;
    }
    useMetaStore.getState().markPrologueDone();
    startPrologueBattle();
  };

  if (beat === undefined) return null;

  const texts = beat.lines.map((line) =>
    line.voice === 'echo'
      ? t('run:prologue.echo', { line: t(line.text) })
      : t(line.text),
  );

  return (
    <Screen centered>
      <Paper bg={tokens.surface1} p="xl" radius="md" withBorder w="100%">
        <Stack gap="md">
          <Title order={4} c={tokens.dim}>
            {t('run:prologue.title')}
          </Title>
          <PrologueLines key={beat.id} beat={beat} texts={texts} />
          <Text size="xs" c={tokens.faint}>
            {t('run:prologue.step', {
              cur: index + 1,
              max: PROLOGUE_BEATS.length,
            })}
          </Text>
          <Button
            size="md"
            fullWidth
            data-prologue-next
            data-testid="prologue-next"
            onClick={advance}
          >
            {t(beat.cta)}
          </Button>
          <Button
            size="compact-xs"
            variant="subtle"
            color="gray"
            data-testid="prologue-leave"
            onClick={() => {
              go(replay ? 'codex' : 'menu');
            }}
          >
            {t('run:prologue.leave')}
          </Button>
        </Stack>
      </Paper>
    </Screen>
  );
};
