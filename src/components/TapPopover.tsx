import {
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import {
  popoverPlacement,
  viewportBounds,
  type PopoverAlign,
} from '@/components/coachPlacement';
import { useEscapeKey, useOutsidePointer } from '@/components/dismiss';
import styles from './TapPopover.module.css';

export type { PopoverAlign };

const EDGE = 12;

interface TapPopoverProps {
  children: ReactNode;
  content: ReactNode;
  label: string;
  align?: PopoverAlign;
  testId?: string;
  className?: string;
}

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
  const bubbleRef = useRef<HTMLSpanElement | null>(null);
  const bubbleId = useId();

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  useEscapeKey(open, close);
  useOutsidePointer(open, anchorRef, close, bubbleRef);

  useLayoutEffect(() => {
    if (!open) return;
    const bubble = bubbleRef.current;
    const anchor = anchorRef.current;
    if (bubble === null || anchor === null) return;
    const place = (): void => {
      const rect = anchor.getBoundingClientRect();
      const { left, top } = popoverPlacement(
        { x: rect.left, y: rect.top, w: rect.width, h: rect.height },
        { w: bubble.offsetWidth, h: bubble.offsetHeight },
        viewportBounds(EDGE),
        align,
      );
      bubble.style.left = `${String(left)}px`;
      bubble.style.top = `${String(top)}px`;
      bubble.dataset.placed = '1';
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(bubble);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, align]);

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
      {open
        ? createPortal(
            <span
              ref={bubbleRef}
              id={bubbleId}
              role="tooltip"
              data-tap-popover={testId ?? label}
              className={styles.bubble}
            >
              {content}
            </span>,
            document.body,
          )
        : null}
    </span>
  );
};
