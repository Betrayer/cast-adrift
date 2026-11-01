import { Button, Group, Paper, Stack, Text } from '@mantine/core';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { tokens } from '@/app/theme';
import { recentErrors } from '@/services/errors';
import { APP_VERSION } from '@/services/version';

export const Diagnostics = () => {
  const { t } = useTranslation(['settings']);
  const [open, setOpen] = useState(false);
  const reports = recentErrors();

  return (
    <Stack gap="xs">
      <Group justify="space-between">
        <Text size="xs" c={tokens.faint}>
          {t('settings:diagnostics.version', { version: APP_VERSION })}
        </Text>
        <Button
          size="compact-xs"
          variant="default"
          onClick={() => {
            setOpen((value) => !value);
          }}
        >
          {t(open ? 'settings:diagnostics.hide' : 'settings:diagnostics.show', {
            n: reports.length,
          })}
        </Button>
      </Group>
      {open ? (
        <Paper p="xs" radius="md" withBorder bg={tokens.surface1}>
          {reports.length === 0 ? (
            <Text size="xs" c={tokens.dim}>
              {t('settings:diagnostics.clean')}
            </Text>
          ) : (
              <Stack gap={4}>
                {reports.map((report) => (
                  <Text
                    key={`${String(report.at)}-${report.message}`}
                    size="xs"
                    c={tokens.dim}
                    style={{ fontFamily: 'monospace', wordBreak: 'break-word' }}
                  >
                    {`${report.screen} · ${report.message}`}
                  </Text>
                ))}
              </Stack>
          )}
        </Paper>
      ) : null}
    </Stack>
  );
};
