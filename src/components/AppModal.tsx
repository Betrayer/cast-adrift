import { Button, FocusTrap, Text, type ButtonProps } from '@mantine/core';
import { useContext, useLayoutEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '@/app/cx';
import { ParkedContext } from '@/app/parked';
import { tokens } from '@/app/theme';
import { useLayeredEscape, type DismissPolicy } from '@/components/dismiss';
import styles from './AppModal.module.css';

export type SheetPlacement = 'bottom' | 'side';

export type PanelData = Readonly<Record<`data-${string}`, string>>;

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
  placement?: SheetPlacement;
  panelData?: PanelData;
}

const useSurface = (
  dismiss: DismissPolicy,
  onClose: () => void,
  parked: boolean,
): ((event: { target: EventTarget | null; currentTarget: EventTarget }) => void) => {
  useLayeredEscape(dismiss, onClose, parked);
  return (event) => {
    if (dismiss !== 'scrim') return;
    if (event.target !== event.currentTarget) return;
    onClose();
  };
};

const useReturnFocus = (active: boolean): void => {
  useLayoutEffect(() => {
    if (!active) return;
    const opener = document.activeElement;
    return () => {
      if (opener instanceof HTMLElement && opener.isConnected) {
        opener.focus({ preventScroll: true });
      }
    };
  }, [active]);
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
  const parked = useContext(ParkedContext);
  const onScrimClick = useSurface(dismiss, onClose, parked);
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
      <FocusTrap active={!parked}>
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

const panelClass = (placement: SheetPlacement | undefined, plain: boolean): string | undefined => {
  if (placement !== undefined) return styles.panelDock;
  return plain ? styles.panelSheetPlain : styles.panelSheet;
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
  placement,
  panelData,
}: SheetProps) => {
  const parked = useContext(ParkedContext);
  const onScrimClick = useSurface(dismiss, onClose, parked);
  const docked = placement !== undefined;
  useReturnFocus(docked);
  const frame = (
    <div
      className={cx(styles.scrim, styles.sheetFrame, blur && styles.blurred)}
      data-app-sheet={testId ?? label}
      data-sheet-placement={placement}
      onClick={onScrimClick}
    >
      <FocusTrap active={!parked}>
        <div
          role="dialog"
          aria-modal="true"
          aria-label={label}
          tabIndex={-1}
          data-testid={testId}
          data-sheet-placement={placement}
          {...panelData}
          className={cx(panelClass(placement, plain), className)}
        >
          {closeLabel === undefined ? null : (
            <div className={styles.sheetHead}>
              <Text fw={700} c={tokens.text} className={styles.sheetTitle}>
                {label}
              </Text>
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
          {docked ? <div className={styles.dockBody}>{children}</div> : children}
        </div>
      </FocusTrap>
    </div>
  );
  return docked ? createPortal(frame, document.body) : frame;
};
