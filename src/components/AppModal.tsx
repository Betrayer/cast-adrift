import { FocusTrap } from '@mantine/core';
import type { ReactNode } from 'react';
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

const classes = (...names: (string | undefined)[]): string =>
  names.filter((name) => name !== undefined && name !== '').join(' ');

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
      className={classes(
        styles.scrim,
        styles.center,
        ceremony ? styles.scrimCeremony : undefined,
        blur ? styles.blurred : undefined,
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
          className={classes(
            plain ? styles.panelModalPlain : styles.panelModal,
            className,
          )}
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
}: SurfaceProps) => {
  const onScrimClick = useSurface(dismiss, onClose);
  return (
    <div
      className={classes(
        styles.scrim,
        styles.sheetFrame,
        blur ? styles.blurred : undefined,
      )}
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
          className={classes(
            plain ? styles.panelSheetPlain : styles.panelSheet,
            className,
          )}
        >
          {children}
        </div>
      </FocusTrap>
    </div>
  );
};
