import { useCallback, useId, useRef, useState, type ReactNode } from 'react';
import { useEscapeKey, useOutsidePointer } from '@/components/dismiss';
import styles from './TapPopover.module.css';

export type PopoverAlign = 'center' | 'start' | 'end';

interface TapPopoverProps {
  children: ReactNode;
  content: ReactNode;
  label: string;
  align?: PopoverAlign;
  testId?: string;
  className?: string;
}

const alignClass = (align: PopoverAlign): string | undefined =>
  align === 'start'
    ? styles.bubbleStart
    : align === 'end'
      ? styles.bubbleEnd
      : undefined;

export const TapPopover = ({
  children,
  content,
  label,
  align = 'center',
  testId,
  className,
}: TapPopoverProps) => {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const bubbleId = useId();

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  useEscapeKey(open, close);
  useOutsidePointer(open, anchorRef, close);

  return (
    <span
      ref={anchorRef}
      className={[styles.anchor, className].filter((n) => n !== undefined).join(' ')}
    >
      <button
        type="button"
        className={styles.trigger}
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? bubbleId : undefined}
        data-testid={testId}
        onClick={() => {
          setOpen((value) => !value);
        }}
      >
        {children}
      </button>
      {open ? (
        <span
          id={bubbleId}
          role="tooltip"
          data-tap-popover={testId ?? label}
          className={[styles.bubble, alignClass(align)]
            .filter((n) => n !== undefined)
            .join(' ')}
        >
          {content}
        </span>
      ) : null}
    </span>
  );
};
