import { Container, Graphics } from 'pixi.js';
import type { Application, Ticker } from 'pixi.js';
import { hslToHex } from '@/app/color';
import { currentTheme, onThemeChange } from '@/app/theme';
import type { BgStyle } from '@/data/themes';
import { createStream, deriveSeed } from '@/services/rng';

interface Star {
  dot: Graphics;
  speed: number;
}

const BANDS = [
  { count: 60, radius: 1, alpha: 0.35, speed: 0.12 },
  { count: 40, radius: 1.6, alpha: 0.55, speed: 0.3 },
  { count: 20, radius: 2.2, alpha: 0.85, speed: 0.6 },
] as const;

const SCANLINE_STEP = 3;
const SCANLINE_ALPHA = 0.03;
const GRID_STEP = 34;

const starColor = (style: BgStyle): string =>
  hslToHex({ h: style.hue, s: 0.18, l: 0.94 });

const paintOverlay = (
  app: Application,
  style: BgStyle,
  accent: string,
): Graphics | null => {
  if (style.scanlines !== true && style.grid !== true) return null;
  const g = new Graphics();
  const w = app.screen.width;
  const h = app.screen.height;
  if (style.grid === true) {
    for (let x = GRID_STEP; x < w; x += GRID_STEP) {
      g.moveTo(x, 0).lineTo(x, h);
    }
    for (let y = GRID_STEP; y < h; y += GRID_STEP) {
      g.moveTo(0, y).lineTo(w, y);
    }
    g.stroke({ color: accent, alpha: 0.08, width: 1 });
  }
  if (style.scanlines === true) {
    for (let y = 0; y < h; y += SCANLINE_STEP) {
      g.rect(0, y, w, 1);
    }
    g.fill({ color: '#000000', alpha: SCANLINE_ALPHA });
  }
  g.eventMode = 'none';
  return g;
};

export const mountMenuBg = (
  app: Application,
  opts: { reducedMotion: boolean },
): (() => void) => {
  let root: Container | null = null;
  let stars: Star[] = [];
  let ticking = false;

  const tick = (ticker: Ticker) => {
    const w = app.screen.width;
    const h = app.screen.height;
    for (const star of stars) {
      star.dot.x -= star.speed * ticker.deltaTime;
      star.dot.y += star.speed * ticker.deltaTime * 0.6;
      if (star.dot.x < -4) star.dot.x += w + 8;
      if (star.dot.y > h + 4) star.dot.y -= h + 8;
    }
  };

  const build = (): void => {
    const theme = currentTheme();
    const style = theme.bgStyle;
    const rng = createStream(deriveSeed(0, 'menuBg'));
    const container = new Container();
    app.stage.addChild(container);
    const color = starColor(style);
    const built: Star[] = [];
    for (const band of BANDS) {
      const count = Math.round(band.count * style.starDensity);
      for (let i = 0; i < count; i += 1) {
        const dot = new Graphics()
          .circle(0, 0, band.radius)
          .fill({ color, alpha: band.alpha });
        dot.x = rng.next() * app.screen.width;
        dot.y = rng.next() * app.screen.height;
        container.addChild(dot);
        built.push({ dot, speed: band.speed });
      }
    }
    const overlay = paintOverlay(app, style, theme.palette.accent);
    if (overlay !== null) container.addChild(overlay);
    root = container;
    stars = built;
    if (!opts.reducedMotion && !ticking) {
      app.ticker.add(tick);
      ticking = true;
    }
  };

  const teardown = (): void => {
    root?.destroy({ children: true });
    root = null;
    stars = [];
  };

  build();
  const unsubscribe = onThemeChange(() => {
    teardown();
    build();
  });

  return () => {
    unsubscribe();
    if (ticking) {
      app.ticker.remove(tick);
      ticking = false;
    }
    teardown();
  };
};
