import { Button, Group, Stack, Text } from '@mantine/core';
import { tokens } from '@/app/theme';
import { AppModal } from '@/components/AppModal';

interface ConfirmDialogProps {
  opened: boolean;
  testId: string;
  title: string;
  body: string;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ConfirmDialog = ({
  opened,
  testId,
  title,
  body,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) => {
  if (!opened) return null;

  return (
    <AppModal
      label={title}
      testId={`${testId}-confirm`}
      dismiss="escape"
      onClose={onCancel}
    >
      <Stack gap="md" p="md">
        <Text fw={600} c={tokens.text}>
          {title}
        </Text>
        <Text size="sm" c={tokens.dim}>
          {body}
        </Text>
        <Group grow>
          <Button
            variant="default"
            data-testid={`${testId}-cancel`}
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
          <Button color="red" data-testid={`${testId}-yes`} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </Group>
      </Stack>
    </AppModal>
  );
};
