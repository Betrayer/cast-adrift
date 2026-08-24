import { useCallback } from 'react';
import { useAppStore } from '@/stores/appStore';

export const useScreenParam = <T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T,
): [T, (value: T) => void] => {
  const raw = useAppStore((s) => s.params?.[key]);
  const value = allowed.includes(raw as T) ? (raw as T) : fallback;
  const set = useCallback(
    (next: T) => {
      const store = useAppStore.getState();
      store.setParams({ ...store.params, [key]: next });
    },
    [key],
  );
  return [value, set];
};
