import { Button, Text } from '@mantine/core';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { screenTitleKey } from '@/app/routes';
import { tokens } from '@/app/theme';
import { backActionFor, useAppStore } from '@/stores/appStore';
import styles from './AppHeader.module.css';

const Chevron = () => (
  <svg
    className={styles.chevron}
    viewBox="0 0 10 10"
    aria-hidden
    focusable="false"
  >
    <path
      d="M6.6 1.2 2.8 5l3.8 3.8"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

interface AppHeaderProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  back?: 'auto' | 'none';
  onBack?: () => void;
}

export const AppHeader = ({
  title,
  subtitle,
  actions,
  back = 'auto',
  onBack,
}: AppHeaderProps) => {
  const { t } = useTranslation(['common']);
  const screen = useAppStore((s) => s.screen);
  const stack = useAppStore((s) => s.stack);
  const storeBack = useAppStore((s) => s.back);
  const available = backActionFor({ screen, stack }).kind === 'to';
  const showBack = back === 'auto' && (available || onBack !== undefined);
  const titleKey = screenTitleKey(screen);
  const heading = title ?? (titleKey === undefined ? null : t(titleKey));

  return (
    <div className={styles.bar} data-app-header={screen}>
      {showBack ? (
        <Button
          size="compact-sm"
          variant="subtle"
          color="gray"
          data-testid="app-back"
          leftSection={<Chevron />}
          onClick={onBack ?? storeBack}
        >
          {t('common:back')}
        </Button>
      ) : null}
      <div className={styles.titles}>
        {heading === null ? null : (
          <Text fw={700} c={tokens.text} className={styles.title}>
            {heading}
          </Text>
        )}
        {subtitle === undefined ? null : (
          <Text size="xs" c={tokens.faint} className={styles.title}>
            {subtitle}
          </Text>
        )}
      </div>
      {actions === undefined ? null : (
        <div className={styles.actions}>{actions}</div>
      )}
    </div>
  );
};
