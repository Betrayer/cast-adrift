let focused: string | null = null;
const listeners = new Set<() => void>();

export const focusedEnemy = (): string | null => focused;

export const focusEnemy = (id: string | null): void => {
  if (focused === id) return;
  focused = id;
  for (const listener of [...listeners]) listener();
};

export const subscribeEnemyFocus = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
