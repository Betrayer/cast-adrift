import { describe, expect, it } from "vitest";
import { linear, Tweens } from "@/pixi/tween";

interface FakeTicker {
  deltaMS: number;
  add: (fn: (ticker: FakeTicker) => void) => void;
  remove: (fn: (ticker: FakeTicker) => void) => void;
}

const fakeTicker = () => {
  let listener: ((ticker: FakeTicker) => void) | null = null;
  const ticker: FakeTicker = {
    deltaMS: 16,
    add: (fn) => {
      listener = fn;
    },
    remove: () => {
      listener = null;
    },
  };
  return {
    ticker,
    step: (ms: number): void => {
      ticker.deltaMS = ms;
      listener?.(ticker);
    },
  };
};

const makeTweens = () => {
  const { ticker, step } = fakeTicker();
  return { tweens: new Tweens(ticker as never), step };
};

describe("Tweens", () => {
  it("interpolates on the ticker and reports completion once", () => {
    const { tweens, step } = makeTweens();
    const target = { x: 0 };
    let done = 0;
    tweens.to(target, { x: 100 }, 100, linear, () => {
      done += 1;
    });
    step(50);
    expect(target.x).toBeCloseTo(50);
    step(50);
    expect(target.x).toBeCloseTo(100);
    step(50);
    expect(done).toBe(1);
  });

  it("freezes every tween while the time scale is zero", () => {
    const { tweens, step } = makeTweens();
    const target = { x: 0 };
    tweens.to(target, { x: 100 }, 100, linear);
    step(20);
    const held = target.x;
    tweens.timeScale = 0;
    step(60);
    step(60);
    expect(target.x).toBe(held);
    tweens.timeScale = 1;
    step(80);
    expect(target.x).toBeCloseTo(100);
  });
});
