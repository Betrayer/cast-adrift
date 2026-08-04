import { Button, Paper, Stack, Text, Title } from '@mantine/core';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/app/Screen';
import { tokens } from '@/app/theme';
import { beaconsResolved } from '@/data/events/beacons';
import { finaleOptions } from '@/data/narrative/endings';
import { chooseEnding } from '@/game/run/flow';
import { useRunStore } from '@/stores/runStore';

export const FinaleScreen = () => {
  const { t } = useTranslation(['run', 'content']);
  const axis = useRunStore((s) => s.axis);
  const flags = useRunStore((s) => s.flags);

  const { options, thin } = useMemo(
    () =>
      finaleOptions({
        axis,
        flags,
        beaconsResolved: beaconsResolved(flags),
      }),
    [axis, flags],
  );

  return (
    <Screen centered>
      <Paper bg={tokens.surface1} p="xl" radius="md" withBorder w="100%">
        <Stack gap="md">
          <Title order={3} c={tokens.text}>
            {t('run:finale.title')}
          </Title>
          <Text c={tokens.dim}>{t('run:finale.intro')}</Text>
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
                  onClick={() => {
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
          <Text size="xs" c={tokens.faint}>
            {t('run:finale.axis', { n: axis })}
          </Text>
        </Stack>
      </Paper>
    </Screen>
  );
};
