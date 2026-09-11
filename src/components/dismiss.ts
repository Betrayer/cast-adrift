import { useEffect, type RefObject } from 'react';
import { openTapLayer } from '@/app/tapLayer';

export type DismissPolicy = 'scrim' | 'escape' | 'none';

const CLICK_WINDOW_MS = 400;

const SAME_TAP_PX = 24;

export interface TapPoint {
  x: number;
  y: number;
}

let pendingSwallow: (() => void) | null = null;

export const cancelSwallow = (): void => {
  const stop = pendingSwallow;
  pendingSwallow = null;
  stop?.();
};

export const swallowNextClick = (near?: TapPoint): void => {
  cancelSwallow();
  let timer = 0;
  const stop = (): void => {
    window.removeEventListener('click', swallow, true);
    window.clearTimeout(timer);
    pendingSwallow = null;
  };
  const swallow = (event: MouseEvent): void => {
    if (
      near !== undefined &&
      (Math.abs(event.clientX - near.x) > SAME_TAP_PX ||
        Math.abs(event.clientY - near.y) > SAME_TAP_PX)
    ) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    stop();
  };
  window.addEventListener('click', swallow, true);
  timer = window.setTimeout(stop, CLICK_WINDOW_MS);
  pendingSwallow = stop;
};

export const useEscapeKey = (active: boolean, onEscape: () => void): void => {
  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      onEscape();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [active, onEscape]);
};

export const useOutsidePointer = (
  active: boolean,
  ref: RefObject<HTMLElement | null>,
  onOutside: () => void,
  secondary?: RefObject<HTMLElement | null>,
): void => {
  useEffect(() => {
    if (!active) return;
    const release = openTapLayer();
    const inside = (target: Node): boolean =>
      ref.current?.contains(target) === true ||
      secondary?.current?.contains(target) === true;
    const onPointerDown = (event: PointerEvent): void => {
      if (event.target instanceof Node && inside(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
      swallowNextClick();
      onOutside();
    };
    window.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      release();
      window.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [active, ref, secondary, onOutside]);
};
