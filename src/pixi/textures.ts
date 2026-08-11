import {
  Container,
  FillGradient,
  Graphics,
  GraphicsPath,
  Text,
} from "pixi.js";
import type { Application, Renderer, Texture } from "pixi.js";
import { registerTextureUsage } from "@/pixi/perf";
import { mixHex } from "@/app/color";
import { currentTheme, tokens } from "@/app/theme";
import { DIE_SKIN_BY_ID, dieSkinStyle } from "@/data/cosmetics";
import { schoolGlyphPath } from "@/data/glyphs";
import { schools } from "@/data/schools";
import { fnv1a, mulberry32 } from "@/services/rng";
import { useMetaStore } from "@/stores/metaStore";
import type { DieTier, School } from "@/types/content";

export const PIXI_FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export const TEXTURE_CACHE_CAP = 200;

export interface DieTextureOptions {
  school: School;
  tier: DieTier;
  value: number;
  size: number;
  defId?: string;
  engraved?: boolean;
  growth?: number;
  hasActive?: boolean;
}

interface CacheEntry {
  texture: Texture;
  key: string;
  bytes: number;
}

export interface TextureStats {
  built: number;
  evicted: number;
  live: number;
  bytes: number;
}

const caches = new WeakMap<Renderer, Map<string, CacheEntry>>();
const stats: TextureStats = { built: 0, evicted: 0, live: 0, bytes: 0 };

export const textureStats = (): TextureStats => ({ ...stats });

registerTextureUsage(() => ({ live: stats.live, bytes: stats.bytes }));

// School identity has to survive Terminal's monochrome palette and every kind
// of colour blindness, so each school also carries a shape (DESIGN a11y pass).
export const drawSchoolGlyph = (
  g: Graphics,
  school: School,
  cx: number,
  cy: number,
  r: number,
  color: string,
): void => {
  const glyph = schoolGlyphPath(school, cx, cy, r);
  g.path(new GraphicsPath(glyph.d));
  if (glyph.mode === "stroke") g.stroke({ color, width: Math.max(1, glyph.width) });
  else g.fill(color);
};

// Speckle stays inside the corner radius by construction — cheaper and more
// predictable than masking the whole face during generateTexture.
const paintNoise = (
  g: Graphics,
  seed: number,
  size: number,
  amount: number,
  color: string,
): void => {
  if (amount <= 0) return;
  const rand = mulberry32(seed);
  const pad = size * 0.12;
  const span = size - pad * 2;
  const count = Math.round(size * size * 0.012);
  for (let i = 0; i < count; i += 1) {
    const x = pad + rand() * span;
    const y = pad + rand() * span;
    const s = 0.8 + rand() * 1.4;
    g.rect(x, y, s, s).fill({ color, alpha: amount * (0.4 + rand() * 0.6) });
  }
};

const cacheFor = (renderer: Renderer): Map<string, CacheEntry> => {
  let cache = caches.get(renderer);
  if (cache === undefined) {
    cache = new Map();
    caches.set(renderer, cache);
  }
  return cache;
};

const touch = (cache: Map<string, CacheEntry>, key: string, entry: CacheEntry): void => {
  cache.delete(key);
  cache.set(key, entry);
};

const evictIfNeeded = (cache: Map<string, CacheEntry>): void => {
  while (cache.size > TEXTURE_CACHE_CAP) {
    const oldest = cache.keys().next();
    if (oldest.done === true) return;
    const entry = cache.get(oldest.value);
    cache.delete(oldest.value);
    entry?.texture.destroy(true);
    stats.bytes -= entry?.bytes ?? 0;
    stats.evicted += 1;
  }
};

export const dieTexture = (
  app: Application,
  options: DieTextureOptions,
): Texture => {
  const { school, tier, value } = options;
  const theme = currentTheme();
  const skinId = useMetaStore.getState().dieSkin;
  const style = dieSkinStyle(theme.dieStyle, skinId);
  const skinEdge = DIE_SKIN_BY_ID.get(skinId)?.edge;
  const engraved = options.engraved === true;
  const growth = options.growth ?? 0;
  const hasActive = options.hasActive === true;
  const defId = options.defId ?? `${school}-d${String(tier)}`;
  const size = Math.round(options.size);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cache = cacheFor(app.renderer);
  const key = [
    theme.id,
    skinId,
    school,
    tier,
    value,
    size,
    dpr,
    defId,
    engraved ? "e" : "-",
    growth,
    hasActive ? "a" : "-",
  ].join(":");
  const cached = cache.get(key);
  if (cached !== undefined) {
    touch(cache, key, cached);
    return cached.texture;
  }

  const colors = schools[school];
  const root = new Container();
  const inset = style.strokeW / 2;
  const radius = size * style.radius;

  const gradient = new FillGradient({
    type: "radial",
    center: { x: 0.42, y: 0.34 },
    innerRadius: 0,
    outerCenter: { x: 0.5, y: 0.5 },
    outerRadius: 0.72,
    textureSpace: "local",
    colorStops: [
      { offset: 0, color: mixHex(colors.fill, colors.stroke, style.gradient) },
      { offset: 1, color: mixHex(colors.fill, "#000000", style.gradient * 0.5) },
    ],
  });

  const box = new Graphics()
    .roundRect(inset, inset, size - style.strokeW, size - style.strokeW, radius)
    .fill(gradient)
    .stroke({
      color: skinEdge ?? colors.stroke,
      width: style.strokeW,
    });

  const noise = new Graphics();
  paintNoise(noise, fnv1a(defId), size, style.noise, colors.text);

  const num = new Text({
    text: String(value),
    style: {
      fontFamily: style.glyphFont,
      fontSize: size * 0.42,
      fontWeight: "700",
      fill: colors.text,
    },
  });
  num.anchor.set(0.5);
  num.position.set(size / 2, size * 0.46);

  const tag = new Text({
    text: growth > 0 ? `d${String(tier)}+${String(growth)}` : `d${String(tier)}`,
    style: {
      fontFamily: style.glyphFont,
      fontSize: Math.max(9, size * 0.18),
      fill: growth > 0 ? tokens.amber : tokens.faint,
    },
  });
  tag.anchor.set(0.5, 1);
  tag.position.set(size / 2, size * 0.94);

  const glyph = new Graphics();
  drawSchoolGlyph(
    glyph,
    school,
    size * 0.17,
    size * 0.17,
    size * 0.085,
    colors.text,
  );
  glyph.alpha = 0.9;

  root.addChild(box, noise, glyph, num, tag);

  if (hasActive) {
    const dot = new Graphics()
      .circle(size * 0.83, size * 0.83, size * 0.055)
      .fill(tokens.accent)
      .stroke({ color: colors.fill, width: Math.max(1, size * 0.02) });
    root.addChild(dot);
  }

  // Engraved dice wear a corner rune: a notched chevron in the school stroke.
  if (engraved) {
    const r = size * 0.17;
    const runeInset = size * 0.13;
    const rune = new Graphics()
      .moveTo(size - runeInset - r, runeInset)
      .lineTo(size - runeInset, runeInset)
      .lineTo(size - runeInset, runeInset + r)
      .stroke({ color: colors.stroke, width: Math.max(1.5, size * 0.05) })
      .moveTo(size - runeInset - r * 0.55, runeInset + r * 0.55)
      .lineTo(size - runeInset - r * 0.05, runeInset + r * 0.05)
      .stroke({ color: colors.text, width: Math.max(1, size * 0.04) });
    root.addChild(rune);
  }

  const texture = app.renderer.generateTexture({
    target: root,
    resolution: dpr,
    antialias: true,
  });
  root.destroy({ children: true });
  const entry: CacheEntry = { texture, key, bytes: (size * dpr) ** 2 * 4 };
  cache.set(key, entry);
  stats.built += 1;
  stats.bytes += entry.bytes;
  evictIfNeeded(cache);
  stats.live = cache.size;
  return texture;
};

export const releaseDieTextures = (app: Application): void => {
  const cache = caches.get(app.renderer);
  if (cache === undefined) return;
  for (const entry of cache.values()) entry.texture.destroy(true);
  cache.clear();
  caches.delete(app.renderer);
  stats.live = 0;
  stats.bytes = 0;
};

// A theme switch invalidates every cached face; the scene rebuilds right
// after, so dropping the whole map is cheaper than keying around it.
export const clearDieTextureCache = (app: Application): void => {
  const cache = caches.get(app.renderer);
  if (cache === undefined) return;
  for (const entry of cache.values()) entry.texture.destroy(true);
  cache.clear();
  stats.live = 0;
  stats.bytes = 0;
};
