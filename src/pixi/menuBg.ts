import { Container, Graphics } from 'pixi.js';
import type { Application, Ticker } from 'pixi.js';
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

const STAR_COLOR = 0xe8edf7;

export const mountMenuBg = (
  app: Application,
  opts: { reducedMotion: boolean },
): (() => void) => {
  const rng = createStream(deriveSeed(0, 'menuBg'));
  const root = new Container();
  app.stage.addChild(root);

  const stars: Star[] = [];
  for (const band of BANDS) {
    for (let i = 0; i < band.count; i += 1) {
      const dot = new Graphics()
        .circle(0, 0, band.radius)
        .fill({ color: STAR_COLOR, alpha: band.alpha });
      dot.x = rng.next() * app.screen.width;
      dot.y = rng.next() * app.screen.height;
      root.addChild(dot);
      stars.push({ dot, speed: band.speed });
    }
  }

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

  if (!opts.reducedMotion) app.ticker.add(tick);

  return () => {
    if (!opts.reducedMotion) app.ticker.remove(tick);
    root.destroy({ children: true });
  };
};
