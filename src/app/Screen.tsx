import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { publishBodyRect } from '@/app/bands';
import styles from './Screen.module.css';

export type ScreenWidth = 'narrow' | 'wide' | 'full';

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

const widthClass = (width: ScreenWidth): string =>
  width === 'wide'
    ? styles.wide ?? ''
    : width === 'full'
      ? styles.full ?? ''
      : styles.narrow ?? '';

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
          <div className={`${styles.inner ?? ''} ${innerClassName ?? ''}`}>
            {children}
          </div>
        </div>
        {footer === undefined ? null : (
          <div className={styles.footer}>{footer}</div>
        )}
      </div>
      {overlay}
    </div>
  );
};
