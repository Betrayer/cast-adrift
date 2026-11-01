import { useEffect } from 'react';
import { useLatest } from '@/app/useLatest';
import type { ScreenId } from '@/types';

type BackGuard = () => void;

const guards = new Map<ScreenId, BackGuard>();

const guardListeners = new Set<() => void>();

const notifyGuards = (): void => {
  for (const listener of [...guardListeners]) listener();
};

export const onBackGuardsChange = (listener: () => void): (() => void) => {
  guardListeners.add(listener);
  return () => {
    guardListeners.delete(listener);
  };
};

export const registerBackGuard = (
  screen: ScreenId,
  guard: BackGuard,
): (() => void) => {
  guards.set(screen, guard);
  notifyGuards();
  return () => {
    if (guards.get(screen) !== guard) return;
    guards.delete(screen);
    notifyGuards();
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
  notifyGuards();
};

let blockers = 0;

export const backBlocked = (): boolean => blockers > 0;

export const useBackBlock = (active: boolean): void => {
  useEffect(() => {
    if (!active) return;
    blockers += 1;
    notifyGuards();
    return () => {
      blockers -= 1;
      notifyGuards();
    };
  }, [active]);
};

export const useBackGuard = (
  screen: ScreenId,
  guard: BackGuard | null,
): void => {
  const latest = useLatest(guard);
  const armed = guard !== null;
  useEffect(() => {
    if (!armed) return;
    return registerBackGuard(screen, () => {
      latest.current?.();
    });
  }, [screen, armed, latest]);
};
