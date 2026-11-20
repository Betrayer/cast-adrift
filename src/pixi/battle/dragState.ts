export interface DragTally {
  drops: number;
  cancels: number;
}

let dragged: string | null = null;
let tally: DragTally = { drops: 0, cancels: 0 };
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

export const noteDragDrop = (): void => {
  tally = { ...tally, drops: tally.drops + 1 };
};

export const noteDragCancel = (): void => {
  tally = { ...tally, cancels: tally.cancels + 1 };
};

export const dragTally = (): DragTally => tally;

export const takeDragTally = (): DragTally => {
  const taken = tally;
  tally = { drops: 0, cancels: 0 };
  return taken;
};
