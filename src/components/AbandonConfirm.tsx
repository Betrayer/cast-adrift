import { Button, Group, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { tokens } from '@/app/theme';
import { AppModal } from '@/components/AppModal';
import { dropCloudRun } from '@/game/run/cloud';
import { abandonRun } from '@/game/run/flow';

interface AbandonConfirmProps {
  opened: boolean;
  prefix: string;
  onCancel: () => void;
  onConfirm?: () => void;
}

export const AbandonConfirm = ({
  opened,
  prefix,
  onCancel,
  onConfirm,
}: AbandonConfirmProps) => {
  const { t } = useTranslation(['menu']);
  if (!opened) return null;

  return (
    <AppModal
      label={t('menu:abandonTitle')}
      testId={`${prefix}-abandon-confirm`}
      dismiss="escape"
      onClose={onCancel}
    >
      <Stack gap="md" p="md">
        <Text fw={600} c={tokens.text}>
          {t('menu:abandonTitle')}
        </Text>
        <Text size="sm" c={tokens.dim}>
          {t('menu:abandonBody')}
        </Text>
        <Group grow>
          <Button
            variant="default"
            data-testid={`${prefix}-abandon-cancel`}
            onClick={onCancel}
          >
            {t('menu:abandonNo')}
          </Button>
          <Button
            color="red"
            data-testid={`${prefix}-abandon-yes`}
            onClick={() => {
              onConfirm?.();
              void dropCloudRun();
              abandonRun();
            }}
          >
            {t('menu:abandonYes')}
          </Button>
        </Group>
      </Stack>
    </AppModal>
  );
};
