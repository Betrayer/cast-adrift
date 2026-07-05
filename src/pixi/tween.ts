import type { Ticker } from "pixi.js";

export type Ease = (t: number) => number;

export const linear: Ease = (t) => t;

export const easeOutQuad: Ease = (t) => 1 - (1 - t) * (1 - t);

export const easeOutBack: Ease = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
};

export type TweenProps<T> = {
  [K in keyof T & string as T[K] extends number ? K : never]?: number;
};

interface ActiveTween {
  target: Record<string, number>;
  from: Record<string, number>;
  to: Record<string, number>;
  ms: number;
  elapsed: number;
  ease: Ease;
  onComplete?: () => void;
}

export class Tweens {
  private readonly ticker: Ticker;
  private readonly active = new Set<ActiveTween>();

  constructor(ticker: Ticker) {
    this.ticker = ticker;
    this.ticker.add(this.update);
  }

  to<T extends object>(
    target: T,
    props: TweenProps<T>,
    ms: number,
    ease: Ease = easeOutQuad,
    onComplete?: () => void,
  ): () => void {
    const record = target as unknown as Record<string, number>;
    const from: Record<string, number> = {};
    const to: Record<string, number> = {};
    for (const [key, value] of Object.entries(props)) {
      if (typeof value !== "number") continue;
      from[key] = record[key] ?? 0;
      to[key] = value;
    }
    const tween: ActiveTween = {
      target: record,
      from,
      to,
      ms: Math.max(1, ms),
      elapsed: 0,
      ease,
      onComplete,
    };
    this.active.add(tween);
    return () => {
      this.active.delete(tween);
    };
  }

  private readonly update = (ticker: Ticker): void => {
    for (const tween of [...this.active]) {
      tween.elapsed += ticker.deltaMS;
      const t = Math.min(1, tween.elapsed / tween.ms);
      const k = tween.ease(t);
      for (const key of Object.keys(tween.to)) {
        const from = tween.from[key] ?? 0;
        const to = tween.to[key] ?? 0;
        tween.target[key] = from + (to - from) * k;
      }
      if (t >= 1) {
        this.active.delete(tween);
        tween.onComplete?.();
      }
    }
  };

  destroy(): void {
    this.ticker.remove(this.update);
    this.active.clear();
  }
}
