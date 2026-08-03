import type { Application, Container } from "pixi.js";

export interface PerfSnapshot {
  fps: number;
  objects: number;
  textures: number;
  textureMb: number;
  poolUsed: number;
  poolSize: number;
}

export interface TextureUsage {
  live: number;
  bytes: number;
}

const NO_TEXTURES: TextureUsage = { live: 0, bytes: 0 };

let app: Application | null = null;
// Pushed in by the texture cache once Pixi is on screen. Reading it the other
// way round would give this module a static pixi.js dependency, and the perf
// overlay lives in the App shell — which is exactly the chunk Pixi must stay
// out of (DESIGN §17).
let readTextures: () => TextureUsage = () => NO_TEXTURES;
const pools = new Map<string, { used: number; size: number }>();

export const registerTextureUsage = (read: () => TextureUsage): void => {
  readTextures = read;
};

export const registerPerfApp = (next: Application): (() => void) => {
  app = next;
  return () => {
    if (app === next) app = null;
  };
};

export const reportPool = (id: string, used: number, size: number): void => {
  pools.set(id, { used, size });
};

export const clearPool = (id: string): void => {
  pools.delete(id);
};

const countObjects = (node: Container): number => {
  let total = 1;
  for (const child of node.children) total += countObjects(child as Container);
  return total;
};

declare global {
  interface Window {
    __perf?: () => PerfSnapshot;
  }
}

export const readPerf = (): PerfSnapshot => {
  const textures = readTextures();
  let poolUsed = 0;
  let poolSize = 0;
  for (const pool of pools.values()) {
    poolUsed += pool.used;
    poolSize += pool.size;
  }
  return {
    fps: app === null ? 0 : Math.round(app.ticker.FPS),
    objects: app === null ? 0 : countObjects(app.stage),
    textures: textures.live,
    textureMb: textures.bytes / (1024 * 1024),
    poolUsed,
    poolSize,
  };
};

if (import.meta.env.DEV && typeof window !== "undefined") {
  window.__perf = readPerf;
}
