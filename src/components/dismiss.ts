import { useEffect, type RefObject } from 'react';

export type DismissPolicy = 'scrim' | 'escape' | 'none';

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
): void => {
  useEffect(() => {
    if (!active) return;
    const onPointerDown = (event: PointerEvent): void => {
      const anchor = ref.current;
      if (anchor === null) return;
      if (event.target instanceof Node && anchor.contains(event.target)) return;
      onOutside();
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, [active, ref, onOutside]);
};
