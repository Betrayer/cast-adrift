import { Container, Graphics, Text } from "pixi.js";
import type { Application, Renderer, Texture } from "pixi.js";
import { tokens } from "@/app/theme";
import { schools } from "@/data/schools";
import type { DieTier, School } from "@/types/content";

export const PIXI_FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export interface DieTextureOptions {
  school: School;
  tier: DieTier;
  value: number;
  size: number;
}

const caches = new WeakMap<Renderer, Map<string, Texture>>();

export const dieTexture = (
  app: Application,
  options: DieTextureOptions,
): Texture => {
  const { school, tier, value } = options;
  const size = Math.round(options.size);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let cache = caches.get(app.renderer);
  if (cache === undefined) {
    cache = new Map();
    caches.set(app.renderer, cache);
  }
  const key = `${school}:${String(tier)}:${String(value)}:${String(size)}:${String(dpr)}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  const colors = schools[school];
  const root = new Container();
  const box = new Graphics()
    .roundRect(0.75, 0.75, size - 1.5, size - 1.5, size * 0.23)
    .fill(colors.fill)
    .stroke({ color: colors.stroke, width: 1.5 });
  const num = new Text({
    text: String(value),
    style: {
      fontFamily: PIXI_FONT_FAMILY,
      fontSize: size * 0.42,
      fontWeight: "700",
      fill: colors.text,
    },
  });
  num.anchor.set(0.5);
  num.position.set(size / 2, size * 0.46);
  const tag = new Text({
    text: `d${String(tier)}`,
    style: {
      fontFamily: PIXI_FONT_FAMILY,
      fontSize: Math.max(9, size * 0.18),
      fill: tokens.faint,
    },
  });
  tag.anchor.set(0.5, 1);
  tag.position.set(size / 2, size * 0.94);
  root.addChild(box, num, tag);

  const texture = app.renderer.generateTexture({
    target: root,
    resolution: dpr,
    antialias: true,
  });
  root.destroy({ children: true });
  cache.set(key, texture);
  return texture;
};

export const releaseDieTextures = (app: Application): void => {
  const cache = caches.get(app.renderer);
  if (cache === undefined) return;
  for (const texture of cache.values()) texture.destroy(true);
  caches.delete(app.renderer);
};
