import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { publishBodyRect } from '@/app/bands';
import { EdgeVignette } from '@/components/EdgeVignette';
import styles from './Screen.module.css';

export type ScreenWidth = 'narrow' | 'wide' | 'grid' | 'full';

interface ScreenProps {
  children?: ReactNode;
  width?: ScreenWidth;
  header?: ReactNode;
  footer?: ReactNode;
  background?: ReactNode;
  overlay?: ReactNode;
  pad?: boolean;
  centered?: boolean;
  scroll?: boolean;
  passThrough?: boolean;
  className?: string;
  bodyClassName?: string;
  innerClassName?: string;
  bodyRef?: RefObject<HTMLDivElement | null>;
}

const WIDTH_CLASS: Record<ScreenWidth, keyof typeof styles> = {
  narrow: 'narrow',
  wide: 'wide',
  grid: 'grid',
  full: 'full',
};

const widthClass = (width: ScreenWidth): string =>
  styles[WIDTH_CLASS[width]] ?? '';

export const Screen = ({
  children,
  width = 'narrow',
  header,
  footer,
  background,
  overlay,
  pad = true,
  centered = false,
  scroll = true,
  passThrough = false,
  className,
  bodyClassName,
  innerClassName,
  bodyRef,
}: ScreenProps) => {
  const internalBodyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = internalBodyRef.current;
    if (element === null) return;
    const measure = (): void => {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      publishBodyRect({
        x: rect.left,
        y: rect.top,
        w: rect.width,
        h: rect.height,
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  const frameClasses = [
    styles.frame ?? '',
    widthClass(width),
    pad ? styles.padded ?? '' : '',
    centered ? styles.centered ?? '' : '',
    passThrough ? styles.passThrough ?? '' : '',
    className ?? '',
  ]
    .filter((name) => name !== '')
    .join(' ');

  const bodyClasses = [
    styles.body ?? '',
    scroll ? styles.scroll ?? '' : styles.clip ?? '',
    bodyClassName ?? '',
  ]
    .filter((name) => name !== '')
    .join(' ');

  return (
    <div className={styles.screen} data-screen-shell>
      {background === undefined ? null : (
        <div className={styles.background}>{background}</div>
      )}
      <div className={frameClasses}>
        {header === undefined ? null : (
          <div className={styles.header}>{header}</div>
        )}
        <div
          className={bodyClasses}
          data-screen-body
          ref={(node) => {
            internalBodyRef.current = node;
            if (bodyRef !== undefined) bodyRef.current = node;
          }}
        >
          <div
            className={`${styles.inner ?? ''} ${innerClassName ?? ''}`}
            data-screen-inner
          >
            {children}
          </div>
        </div>
        {footer === undefined ? null : (
          <div className={styles.footer}>{footer}</div>
        )}
      </div>
      {overlay}
      <EdgeVignette />
    </div>
  );
};
