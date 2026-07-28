import type { Application, Container } from "pixi.js";
import { textureStats } from "@/pixi/textures";

export interface PerfSnapshot {
  fps: number;
  objects: number;
  textures: number;
  textureMb: number;
  poolUsed: number;
  poolSize: number;
}

let app: Application | null = null;
const pools = new Map<string, { used: number; size: number }>();

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
  const textures = textureStats();
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
