import {
  Box,
  Button,
  Group,
  Paper,
  RingProgress,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { useReducedMotion } from '@mantine/hooks';
import { lazy, Suspense, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { tokens } from '@/app/theme';
import { progressWithinLevel } from '@/game/xp';
import { useMetaStore } from '@/stores/metaStore';
import { dismissCloudRun, restoreCloudRun } from '@/game/run/cloud';
import { readLocalResume, resumeLocalRun } from '@/game/run/resume';
import { ResumeCard } from '@/screens/Menu/ResumeCard';
import { useAppStore } from '@/stores/appStore';
import { useSettingsStore } from '@/stores/settingsStore';
import type { ScreenId } from '@/types';

const MenuBackground = lazy(() =>
  import('@/screens/Menu/MenuBackground').then((m) => ({
    default: m.MenuBackground,
  })),
);

interface MenuEntry {
  key: string;
  screen: ScreenId;
  phase?: number;
  action?: 'startCampaign';
}

const ENTRIES: readonly MenuEntry[] = [
  { key: 'testBattle', screen: 'battle' },
  { key: 'newRun', screen: 'runSetup', action: 'startCampaign' },
  { key: 'hangar', screen: 'hangar' },
  { key: 'starChart', screen: 'chart' },
  { key: 'collection', screen: 'collection' },
  { key: 'codex', screen: 'codex' },
  { key: 'modes', screen: 'modes' },
  { key: 'settings', screen: 'settings' },
];

export const MenuScreen = () => {
  const { t } = useTranslation(['common', 'menu', 'meta']);
  const go = useAppStore((s) => s.go);
  const level = useMetaStore((s) => s.level);
  const xp = useMetaStore((s) => s.xp);
  const progress = progressWithinLevel(xp);
  const cloudResume = useAppStore((s) => s.cloudResume);
  const prologueDone = useMetaStore((s) => s.stats.prologueDone);
  const [localResume] = useState(readLocalResume);
  const reducedMotionSetting = useSettingsStore((s) => s.reducedMotion);
  const osReducedMotion = useReducedMotion(false);
  const reducedMotion =
    reducedMotionSetting === 'auto'
      ? osReducedMotion
      : reducedMotionSetting === 'on';

  const onSelect = useCallback(
    (entry: MenuEntry) => () => {
      if (entry.action === 'startCampaign') {
        go(prologueDone ? 'runSetup' : 'prologue');
        return;
      }
      go(entry.screen);
    },
    [go, prologueDone],
  );

  return (
    <Box pos="relative" mih="var(--ca-vh)" bg={tokens.bg} style={{ overflow: 'hidden' }}>
      <Suspense fallback={null}>
        <MenuBackground reducedMotion={reducedMotion} />
      </Suspense>
      <UnstyledButton
        pos="absolute"
        top={12}
        right={12}
        onClick={() => {
          go('chart');
        }}
        style={{ zIndex: 2, pointerEvents: 'auto' }}
        aria-label={t('meta:menu.level', { level })}
      >
        <RingProgress
          size={56}
          thickness={4}
          roundCaps
          sections={[{ value: progress.pct * 100, color: 'accent' }]}
          label={
            <Text ta="center" size="xs" c={tokens.text} fw={700}>
              {level}
            </Text>
          }
        />
      </UnstyledButton>
      <Stack
        pos="relative"
        align="center"
        justify="center"
        mih="var(--ca-vh)"
        gap="xl"
        p="lg"
        style={{ zIndex: 1, pointerEvents: 'none' }}
      >
        <Stack align="center" gap="xs">
          <Title order={1} c={tokens.text}>
            {t('common:appName')}
          </Title>
          <Text c={tokens.dim} size="sm">
            {t('menu:tagline')}
          </Text>
        </Stack>
        <Stack gap="sm" w={280} style={{ pointerEvents: 'auto' }}>
          {cloudResume ? (
            <Paper bg={tokens.surface1} p="sm" radius="md" withBorder>
              <Stack gap="xs">
                <Text size="sm" c={tokens.text}>
                  {t('menu:cloudFound')}
                </Text>
                <Group gap="xs" grow>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (!restoreCloudRun()) resumeLocalRun();
                    }}
                  >
                    {t('menu:cloudYes')}
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => {
                      dismissCloudRun();
                      if (localResume !== null) resumeLocalRun();
                    }}
                  >
                    {t('menu:cloudNo')}
                  </Button>
                </Group>
              </Stack>
            </Paper>
          ) : localResume !== null ? (
            <ResumeCard resume={localResume} />
          ) : null}
          {ENTRIES.map((entry) => (
            <Button
              key={entry.key}
              size="md"
              variant={entry.phase === undefined ? 'filled' : 'default'}
              disabled={entry.phase !== undefined}
              onClick={onSelect(entry)}
              rightSection={
                entry.phase !== undefined ? (
                  <Text size="xs" c={tokens.faint}>
                    {t('common:phaseHint', { phase: entry.phase })}
                  </Text>
                ) : undefined
              }
            >
              {t(`menu:${entry.key}`)}
            </Button>
          ))}
        </Stack>
      </Stack>
    </Box>
  );
};
