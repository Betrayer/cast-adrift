import {
  Button,
  Divider,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/app/Screen';
import { tokens } from '@/app/theme';
import {
  ASCENSIONS,
  ascensionMods,
  ascensionRewardsUpTo,
  maxSelectableAscension,
} from '@/data/ascension';
import { SHIP_BY_ID } from '@/data/ships';
import { ascensionShardMult } from '@/game/xp';
import { startRun } from '@/game/run/flow';
import { useAppStore } from '@/stores/appStore';
import { useMetaStore } from '@/stores/metaStore';

export const RunSetupScreen = () => {
  const { t } = useTranslation(['run', 'content', 'menu']);
  const go = useAppStore((s) => s.go);
  const shipId = useMetaStore((s) => s.selectedShip);
  const deck = useMetaStore((s) => s.hangar.deck);
  const cleared = useMetaStore((s) => s.ascension.campaign);
  const maxAscension = maxSelectableAscension(cleared);
  const [ascension, setAscension] = useState(0);
  const ship = SHIP_BY_ID.get(shipId);
  const mods = ascensionMods(ascension);

  return (
    <Screen centered>
      <Paper bg={tokens.surface1} p="xl" radius="md" withBorder w="100%">
        <Stack gap="md">
          <Title order={3} c={tokens.text}>
            {t('run:setup.title')}
          </Title>
          <Text size="sm" c={tokens.dim}>
            {t('run:setup.mode')}
          </Text>
          <Divider color={tokens.line} label={t('run:setup.ship')} />
          <Group justify="space-between">
            <Text c={tokens.text}>{ship === undefined ? shipId : t(ship.name)}</Text>
            <Text size="sm" c={tokens.faint}>
              {t('run:setup.deck', { n: deck.length })}
            </Text>
          </Group>
          <Divider color={tokens.line} label={t('run:setup.ascension')} />
          {maxAscension === 0 ? (
            <Text size="xs" c={tokens.faint}>
              {t('run:setup.ascensionLocked')}
            </Text>
          ) : (
            <Group gap="xs">
              {Array.from({ length: maxAscension + 1 }, (_, level) => (
                <Button
                  key={level}
                  size="compact-sm"
                  variant={level === ascension ? 'filled' : 'default'}
                  onClick={() => {
                    setAscension(level);
                  }}
                >
                  {t('run:setup.aLevel', { n: level })}
                </Button>
              ))}
            </Group>
          )}
          <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="xs">
            <Stack gap={2} data-ascension-penalties>
              <Text size="xs" c={tokens.faint}>
                {t('run:setup.ascensionCost')}
              </Text>
              {ASCENSIONS.filter((a) => a.level <= ascension).map((a) => (
                <Text key={a.level} size="xs" c={tokens.danger}>
                  {`A${String(a.level)} · ${t(a.desc)}`}
                </Text>
              ))}
              {ascension > 0 ? (
                <Text size="xs" c={tokens.faint}>
                  {t('run:setup.tideCap', { n: 3 + mods.tideCapDelta })}
                </Text>
              ) : null}
            </Stack>
            <Stack gap={2} data-ascension-rewards>
              <Text size="xs" c={tokens.faint}>
                {t('run:setup.ascensionGain')}
              </Text>
              <Text size="xs" c={tokens.amber}>
                {t('run:setup.shardMult', {
                  n: Math.round((ascensionShardMult(ascension) - 1) * 100),
                })}
              </Text>
              {ascensionRewardsUpTo(ascension).map((reward, i) => (
                <Text key={`${String(reward.level)}-${String(i)}`} size="xs" c={tokens.amber}>
                  {`A${String(reward.level)} · ${t(reward.label)}`}
                </Text>
              ))}
            </Stack>
          </SimpleGrid>
          <Button
            size="md"
            fullWidth
            color="accent"
            onClick={() => {
              startRun(Date.now() >>> 0, ascension);
            }}
          >
            {t('run:setup.launch')}
          </Button>
          <Button
            size="compact-xs"
            variant="subtle"
            color="gray"
            onClick={() => {
              go('menu');
            }}
          >
            {t('run:setup.back')}
          </Button>
        </Stack>
      </Paper>
    </Screen>
  );
};
