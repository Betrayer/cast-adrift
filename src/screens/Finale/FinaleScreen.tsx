import { Button, Divider, Paper, Stack, Text, Title } from '@mantine/core';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/app/Screen';
import { tokens } from '@/app/theme';
import { beaconsResolved } from '@/data/events/beacons';
import { finaleOptions } from '@/data/narrative/endings';
import { echoArcComplete } from '@/game/narrative/memoryArc';
import { canCrossThreshold, chooseEnding, crossThreshold } from '@/game/run/flow';
import { duckMusic, playSfx } from '@/services/audio';
import { haptic } from '@/services/tma';
import { useRunStore } from '@/stores/runStore';

export const FinaleScreen = () => {
  const { t } = useTranslation(['run', 'content']);
  const axis = useRunStore((s) => s.axis);
  const flags = useRunStore((s) => s.flags);
  const crossed = useRunStore((s) => s.crossedThreshold);

  const { options, thin } = useMemo(
    () =>
      finaleOptions({
        axis,
        flags,
        beaconsResolved: beaconsResolved(flags),
        crossedThreshold: crossed,
        echoArcComplete: echoArcComplete(),
      }),
    [axis, flags, crossed],
  );

  const offerThreshold = canCrossThreshold();

  // The threshold offer is the biggest decision in the game; a held low tone
  // under the card, ducking the bed, is the only warning it gets.
  useEffect(() => {
    if (!offerThreshold) return;
    playSfx('thresholdHold');
    duckMusic(2400);
  }, [offerThreshold]);

  const cross = (): void => {
    playSfx('foldBeat');
    haptic('ending');
    crossThreshold();
  };

  return (
    <Screen centered>
      <Paper bg={tokens.surface1} p="xl" radius="md" withBorder w="100%">
        <Stack gap="md">
          <Title order={3} c={tokens.text}>
            {t(crossed ? 'run:finale.deepTitle' : 'run:finale.title')}
          </Title>
          <Text c={tokens.dim}>
            {t(crossed ? 'run:finale.deepIntro' : 'run:finale.intro')}
          </Text>
          {thin ? (
            <Text size="sm" c={tokens.amber}>
              {t('run:finale.thin')}
            </Text>
          ) : null}
          <Stack gap="xs">
            {options.map((ending) => (
              <Stack gap={2} key={ending.id}>
                <Button
                  fullWidth
                  variant="default"
                  data-ending-option={ending.id}
                  onClick={() => {
                    playSfx('optionTick', { rate: 0.94 });
                    chooseEnding(ending.id);
                  }}
                >
                  {t(ending.label)}
                </Button>
                <Text size="xs" c={tokens.faint} ta="center">
                  {t(ending.requirement)}
                </Text>
              </Stack>
            ))}
          </Stack>
          {offerThreshold ? (
            <Stack gap={6} data-threshold-offer>
              <Divider color={tokens.line} label={t('run:finale.thresholdTag')} />
              <Button
                fullWidth
                color="grape"
                data-threshold-cross
                onClick={cross}
              >
                {t('run:finale.thresholdCross')}
              </Button>
              <Text size="xs" c={tokens.dim} ta="center">
                {t('run:finale.thresholdCost')}
              </Text>
            </Stack>
          ) : null}
          <Text size="xs" c={tokens.faint}>
            {t('run:finale.axis', { n: axis })}
          </Text>
        </Stack>
      </Paper>
    </Screen>
  );
};
