export interface Bounds {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface Anchor {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Size {
  w: number;
  h: number;
}

const MARGIN = 12;

export const coachCardPlacement = (
  anchor: Anchor,
  card: Size,
  bounds: Bounds,
): { left: number; top: number } => {
  const below = anchor.y + anchor.h + MARGIN;
  const above = anchor.y - card.h - MARGIN;
  const fitsBelow = below + card.h <= bounds.bottom;
  const fitsAbove = above >= bounds.top;
  const preferred = fitsBelow ? below : fitsAbove ? above : below;
  const top = Math.min(
    Math.max(bounds.top, preferred),
    Math.max(bounds.top, bounds.bottom - card.h),
  );
  const centred = anchor.x + anchor.w / 2 - card.w / 2;
  const left = Math.min(
    Math.max(bounds.left, centred),
    Math.max(bounds.left, bounds.right - card.w),
  );
  return { left, top };
};
