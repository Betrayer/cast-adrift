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
  popoverMaxHeight,
  popoverPlacement,
  viewportBounds,
  type PopoverAlign,
} from '@/components/coachPlacement';
import {
  cancelSwallow,
  swallowNextClick,
  useEscapeKey,
  useOutsidePointer,
  type TapPoint,
} from '@/components/dismiss';
import styles from './TapPopover.module.css';

export type { PopoverAlign };

export type PopoverDismiss = (at?: TapPoint) => void;

export const tapPointOf = (event: {
  clientX: number;
  clientY: number;
}): TapPoint => ({ x: event.clientX, y: event.clientY });

const EDGE = 12;

interface TapPopoverProps {
  children: ReactNode;
  content: ReactNode | ((close: PopoverDismiss) => ReactNode);
  label: string;
  align?: PopoverAlign;
  testId?: string;
  className?: string;
  role?: 'tooltip' | 'menu';
}

export const TapPopover = ({
  children,
  content,
  label,
  align = 'center',
  testId,
  className,
  role = 'tooltip',
}: TapPopoverProps) => {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const bubbleRef = useRef<HTMLSpanElement | null>(null);
  const bubbleId = useId();

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  const closeFromContent = useCallback<PopoverDismiss>((at) => {
    setOpen(false);
    swallowNextClick(at);
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
      const bounds = viewportBounds(EDGE);
      bubble.style.maxHeight = `${String(popoverMaxHeight(bounds))}px`;
      const { left, top } = popoverPlacement(
        { x: rect.left, y: rect.top, w: rect.width, h: rect.height },
        { w: bubble.offsetWidth, h: bubble.offsetHeight },
        bounds,
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
        aria-haspopup={role === 'menu' ? 'menu' : undefined}
        data-testid={testId}
        onClick={() => {
          cancelSwallow();
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
              role={role}
              data-tap-popover={testId ?? label}
              className={styles.bubble}
            >
              {typeof content === 'function' ? content(closeFromContent) : content}
            </span>,
            document.body,
          )
        : null}
    </span>
  );
};
