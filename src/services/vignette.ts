export type VignetteSide = "all" | "left" | "right" | "top" | "bottom";

export type VignetteFlashKind =
  | "shieldGain"
  | "shieldBreak"
  | "hullHit"
  | "dodge"
  | "glancing"
  | "surge"
  | "toll";

export type VignetteRimKind = "shield" | "lowHull";

export interface VignetteFlash {
  seq: number;
  kind: VignetteFlashKind;
  side: VignetteSide;
  strength: number;
}

export type VignetteRims = Record<VignetteRimKind, boolean>;

export interface VignetteFlashOptions {
  side?: VignetteSide;
  strength?: number;
}

export type VignetteEvent =
  | { k: "flash"; flash: VignetteFlash }
  | { k: "rims"; rims: VignetteRims };

type Listener = (event: VignetteEvent) => void;

const listeners = new Set<Listener>();

const LOW_HULL_RATIO = 0.3;

let seq = 0;
let lastFlash: VignetteFlash | null = null;
let rims: VignetteRims = { shield: false, lowHull: false };

const emit = (event: VignetteEvent): void => {
  for (const listener of [...listeners]) listener(event);
};

export const subscribeVignette = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const flashVignette = (
  kind: VignetteFlashKind,
  options: VignetteFlashOptions = {},
): VignetteFlash => {
  seq += 1;
  const flash: VignetteFlash = {
    seq,
    kind,
    side: options.side ?? "all",
    strength: Math.max(0, Math.min(1, options.strength ?? 1)),
  };
  lastFlash = flash;
  emit({ k: "flash", flash });
  return flash;
};

export const setVignetteRim = (kind: VignetteRimKind, on: boolean): void => {
  if (rims[kind] === on) return;
  rims = { ...rims, [kind]: on };
  emit({ k: "rims", rims });
};

export const syncHullRim = (hull: number, hullMax: number): void => {
  const low = hullMax > 0 && hull > 0 && hull / hullMax < LOW_HULL_RATIO;
  setVignetteRim("lowHull", low);
};

export const clearVignette = (): void => {
  if (!rims.shield && !rims.lowHull) return;
  rims = { shield: false, lowHull: false };
  emit({ k: "rims", rims });
};

export const vignetteRims = (): VignetteRims => rims;

export const lastVignetteFlash = (): VignetteFlash | null => lastFlash;

export const resetVignette = (): void => {
  seq = 0;
  lastFlash = null;
  rims = { shield: false, lowHull: false };
  listeners.clear();
};

export const sideForX = (x: number, width: number): VignetteSide => {
  if (width <= 0) return "all";
  const ratio = x / width;
  if (ratio < 0.38) return "left";
  if (ratio > 0.62) return "right";
  return "top";
};
