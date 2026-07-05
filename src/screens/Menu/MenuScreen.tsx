import { Box, Button, Stack, Text, Title } from '@mantine/core';
import { useReducedMotion } from '@mantine/hooks';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Application } from 'pixi.js';
import { tokens } from '@/app/theme';
import { mountMenuBg } from '@/pixi/menuBg';
import { PixiCanvas } from '@/pixi/PixiCanvas';
import { useAppStore } from '@/stores/appStore';
import { useSettingsStore } from '@/stores/settingsStore';
import type { ScreenId } from '@/types';

interface MenuEntry {
  key: string;
  screen: ScreenId;
  phase?: number;
}

const ENTRIES: readonly MenuEntry[] = [
  { key: 'testBattle', screen: 'battle' },
  { key: 'newRun', screen: 'runSetup', phase: 5 },
  { key: 'hangar', screen: 'hangar', phase: 7 },
  { key: 'starChart', screen: 'chart', phase: 7 },
  { key: 'codex', screen: 'codex', phase: 6 },
  { key: 'modes', screen: 'modes', phase: 9 },
  { key: 'settings', screen: 'settings' },
];

export const MenuScreen = () => {
  const { t } = useTranslation(['common', 'menu']);
  const go = useAppStore((s) => s.go);
  const reducedMotionSetting = useSettingsStore((s) => s.reducedMotion);
  const osReducedMotion = useReducedMotion(false);
  const reducedMotion =
    reducedMotionSetting === 'auto'
      ? osReducedMotion
      : reducedMotionSetting === 'on';

  const mountBg = useMemo(
    () => (app: Application) => mountMenuBg(app, { reducedMotion }),
    [reducedMotion],
  );

  const onNavigate = useCallback(
    (screen: ScreenId) => () => {
      go(screen);
    },
    [go],
  );

  return (
    <Box pos="relative" mih="100dvh" bg={tokens.bg} style={{ overflow: 'hidden' }}>
      <PixiCanvas mount={mountBg} />
      <Stack
        pos="relative"
        align="center"
        justify="center"
        mih="100dvh"
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
          {ENTRIES.map((entry) => (
            <Button
              key={entry.key}
              size="md"
              variant={entry.phase === undefined ? 'filled' : 'default'}
              disabled={entry.phase !== undefined}
              onClick={onNavigate(entry.screen)}
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
