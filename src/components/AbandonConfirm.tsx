import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/components/ConfirmDialog';
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

  return (
    <ConfirmDialog
      opened={opened}
      testId={`${prefix}-abandon`}
      title={t('menu:abandonTitle')}
      body={t('menu:abandonBody')}
      cancelLabel={t('menu:abandonNo')}
      confirmLabel={t('menu:abandonYes')}
      onCancel={onCancel}
      onConfirm={() => {
        onConfirm?.();
        void dropCloudRun();
        abandonRun();
      }}
    />
  );
};
