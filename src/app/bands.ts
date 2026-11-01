export interface BodyRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface BandInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

const EMPTY: BodyRect = { x: 0, y: 0, w: 0, h: 0 };

let current: BodyRect = EMPTY;
const listeners = new Set<(rect: BodyRect) => void>();

export const bandInsets = (
  rect: BodyRect,
  viewportWidth: number,
  viewportHeight: number,
): BandInsets => ({
  top: Math.max(0, Math.round(rect.y)),
  bottom: Math.max(0, Math.round(viewportHeight - (rect.y + rect.h))),
  left: Math.max(0, Math.round(rect.x)),
  right: Math.max(0, Math.round(viewportWidth - (rect.x + rect.w))),
});

const writeVariables = (rect: BodyRect): void => {
  if (typeof window === 'undefined') return;
  const insets = bandInsets(rect, window.innerWidth, window.innerHeight);
  const root = document.documentElement.style;
  root.setProperty('--ca-band-top', `${String(insets.top)}px`);
  root.setProperty('--ca-band-bottom', `${String(insets.bottom)}px`);
  root.setProperty('--ca-band-left', `${String(insets.left)}px`);
  root.setProperty('--ca-band-right', `${String(insets.right)}px`);
};

export const publishBodyRect = (rect: BodyRect): void => {
  if (
    rect.x === current.x &&
    rect.y === current.y &&
    rect.w === current.w &&
    rect.h === current.h
  ) {
    return;
  }
  current = rect;
  writeVariables(rect);
  for (const listener of [...listeners]) listener(rect);
};

const ENEMY_NEED_PROPERTY = '--ca-enemy-need';

export const publishEnemyNeed = (px: number | null): void => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement.style;
  const value =
    px === null || !Number.isFinite(px)
      ? ''
      : `${String(Math.round(px * 10) / 10)}px`;
  if (root.getPropertyValue(ENEMY_NEED_PROPERTY) === value) return;
  if (value === '') root.removeProperty(ENEMY_NEED_PROPERTY);
  else root.setProperty(ENEMY_NEED_PROPERTY, value);
};

export const subscribeBodyRect = (
  listener: (rect: BodyRect) => void,
): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
