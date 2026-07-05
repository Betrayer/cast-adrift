import { Button, Code, Paper, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { screenPhase } from '@/app/screens';
import { tokens } from '@/app/theme';
import { useAppStore } from '@/stores/appStore';
import type { ScreenId } from '@/types';

export const StubScreen = ({ screen }: { screen: ScreenId }) => {
  const { t } = useTranslation(['common', 'menu']);
  const go = useAppStore((s) => s.go);
  const phase = screenPhase[screen];

  return (
    <Stack align="center" justify="center" mih="100dvh" p="md" bg={tokens.bg}>
      <Paper bg={tokens.surface1} p="xl" radius="md" withBorder>
        <Stack align="center" gap="md">
          <Code fz="lg">{screen}</Code>
          {phase !== undefined && (
            <Text c={tokens.dim}>{t('menu:stub', { phase })}</Text>
          )}
          <Button
            variant="default"
            onClick={() => {
              go('menu');
            }}
          >
            {t('common:back')}
          </Button>
        </Stack>
      </Paper>
    </Stack>
  );
};
