import type { CSSProperties } from "react";
import { MOTION_MS } from "@/app/motion";

export const FORGE_BEAT_MS = MOTION_MS.l;

export const FORGE_PULL = 0.62;

export interface ForgeOffset {
  dx: number;
  dy: number;
}

export type ForgeRect = Pick<DOMRect, "left" | "top" | "width" | "height">;

const centreOf = (rect: ForgeRect): { x: number; y: number } => ({
  x: rect.left + rect.width / 2,
  y: rect.top + rect.height / 2,
});

export const forgeOffsets = (
  a: ForgeRect,
  b: ForgeRect,
): { a: ForgeOffset; b: ForgeOffset } => {
  const ca = centreOf(a);
  const cb = centreOf(b);
  const mid = { x: (ca.x + cb.x) / 2, y: (ca.y + cb.y) / 2 };
  return {
    a: { dx: (mid.x - ca.x) * FORGE_PULL, dy: (mid.y - ca.y) * FORGE_PULL },
    b: { dx: (mid.x - cb.x) * FORGE_PULL, dy: (mid.y - cb.y) * FORGE_PULL },
  };
};

export const forgeOffsetStyle = (offset: ForgeOffset | undefined): CSSProperties =>
  offset === undefined
    ? {}
    : ({
        "--ca-forge-dx": `${String(offset.dx)}px`,
        "--ca-forge-dy": `${String(offset.dy)}px`,
      } as CSSProperties);
