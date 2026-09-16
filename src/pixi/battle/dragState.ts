let dragged: string | null = null;
let captured: string | null = null;
const listeners = new Set<() => void>();

const announce = (): void => {
  for (const listener of [...listeners]) listener();
};

export const draggedDie = (): string | null => dragged;

export const capturedTarget = (): string | null => captured;

export const setDraggedDie = (uid: string | null): void => {
  if (dragged === uid) return;
  dragged = uid;
  if (uid === null) captured = null;
  announce();
};

export const setCapturedTarget = (target: string | null): void => {
  if (captured === target) return;
  captured = target;
  announce();
};

export const subscribeDrag = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
