import { Button, FocusTrap, Text, type ButtonProps } from '@mantine/core';
import type { ReactNode } from 'react';
import { cx } from '@/app/cx';
import { tokens } from '@/app/theme';
import { useEscapeKey, type DismissPolicy } from '@/components/dismiss';
import styles from './AppModal.module.css';

interface SurfaceProps {
  children: ReactNode;
  onClose: () => void;
  dismiss?: DismissPolicy;
  label: string;
  testId?: string;
  ceremony?: boolean;
  plain?: boolean;
  blur?: boolean;
  className?: string;
}

interface SheetProps extends SurfaceProps {
  closeLabel?: string;
  closeTestId?: string;
  closeSize?: ButtonProps['size'];
}

const useSurface = (
  dismiss: DismissPolicy,
  onClose: () => void,
): ((event: { target: EventTarget | null; currentTarget: EventTarget }) => void) => {
  useEscapeKey(dismiss !== 'none', onClose);
  return (event) => {
    if (dismiss !== 'scrim') return;
    if (event.target !== event.currentTarget) return;
    onClose();
  };
};

export const AppModal = ({
  children,
  onClose,
  dismiss = 'scrim',
  label,
  testId,
  ceremony = false,
  plain = false,
  blur = false,
  className,
}: SurfaceProps) => {
  const onScrimClick = useSurface(dismiss, onClose);
  return (
    <div
      className={cx(
        styles.scrim,
        styles.center,
        ceremony && styles.scrimCeremony,
        blur && styles.blurred,
      )}
      data-app-modal={testId ?? label}
      onClick={onScrimClick}
    >
      <FocusTrap active>
        <div
          role="dialog"
          aria-modal="true"
          aria-label={label}
          tabIndex={-1}
          data-testid={testId}
          className={cx(plain ? styles.panelModalPlain : styles.panelModal, className)}
        >
          {children}
        </div>
      </FocusTrap>
    </div>
  );
};

export const AppSheet = ({
  children,
  onClose,
  dismiss = 'scrim',
  label,
  testId,
  plain = false,
  blur = false,
  className,
  closeLabel,
  closeTestId,
  closeSize = 'compact-sm',
}: SheetProps) => {
  const onScrimClick = useSurface(dismiss, onClose);
  return (
    <div
      className={cx(styles.scrim, styles.sheetFrame, blur && styles.blurred)}
      data-app-sheet={testId ?? label}
      onClick={onScrimClick}
    >
      <FocusTrap active>
        <div
          role="dialog"
          aria-modal="true"
          aria-label={label}
          tabIndex={-1}
          data-testid={testId}
          className={cx(plain ? styles.panelSheetPlain : styles.panelSheet, className)}
        >
          {closeLabel === undefined ? null : (
            <div className={styles.sheetHead}>
              <Text fw={700} c={tokens.text}>{label}</Text>
              <Button
                size={closeSize}
                variant="subtle"
                color="gray"
                data-testid={closeTestId}
                onClick={onClose}
              >
                {closeLabel}
              </Button>
            </div>
          )}
          {children}
        </div>
      </FocusTrap>
    </div>
  );
};
