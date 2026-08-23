import { useEffect, useRef } from 'react';
import type { ScreenId } from '@/types';

type BackGuard = () => void;

const guards = new Map<ScreenId, BackGuard>();

export const registerBackGuard = (
  screen: ScreenId,
  guard: BackGuard,
): (() => void) => {
  guards.set(screen, guard);
  return () => {
    if (guards.get(screen) === guard) guards.delete(screen);
  };
};

export const hasBackGuard = (screen: ScreenId): boolean => guards.has(screen);

export const runBackGuard = (screen: ScreenId): boolean => {
  const guard = guards.get(screen);
  if (guard === undefined) return false;
  guard();
  return true;
};

export const clearBackGuards = (): void => {
  guards.clear();
};

export const useBackGuard = (
  screen: ScreenId,
  guard: BackGuard | null,
): void => {
  const latest = useRef(guard);
  useEffect(() => {
    latest.current = guard;
  });
  const armed = guard !== null;
  useEffect(() => {
    if (!armed) return;
    return registerBackGuard(screen, () => {
      latest.current?.();
    });
  }, [screen, armed]);
};
