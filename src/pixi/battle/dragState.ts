let dragged: string | null = null;
const listeners = new Set<() => void>();

export const draggedDie = (): string | null => dragged;

export const setDraggedDie = (uid: string | null): void => {
  if (dragged === uid) return;
  dragged = uid;
  for (const listener of [...listeners]) listener();
};

export const subscribeDrag = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
