import { describe, expect, it } from "vitest";
import { FX_GROUP, linear, rafClock, Tweens, UI_GROUP } from "@/pixi/tween";

interface FakeTicker {
  deltaMS: number;
  add: (fn: (ticker: FakeTicker) => void) => void;
  remove: (fn: (ticker: FakeTicker) => void) => void;
}

const fakeTicker = () => {
  let listener: ((ticker: FakeTicker) => void) | null = null;
  let detached: ((ticker: FakeTicker) => void) | null = null;
  const ticker: FakeTicker = {
    deltaMS: 16,
    add: (fn) => {
      listener = fn;
      detached = fn;
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
    stepDetached: (ms: number): void => {
      ticker.deltaMS = ms;
      detached?.(ticker);
    },
    attached: (): boolean => listener !== null,
  };
};

const makeTweens = () => {
  const { ticker, step, stepDetached, attached } = fakeTicker();
  return {
    tweens: new Tweens(ticker as never),
    step,
    stepDetached,
    attached,
  };
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

describe("Tweens v2", () => {
  it("holds a delayed tween until its delay is spent", () => {
    const { tweens, step } = makeTweens();
    const target = { x: 0 };
    tweens.to(target, { x: 100 }, 100, linear, undefined, { delay: 50 });
    step(40);
    expect(target.x).toBe(0);
    step(60);
    expect(target.x).toBeCloseTo(50);
    step(50);
    expect(target.x).toBeCloseTo(100);
  });

  it("reads the start value at the moment the delay expires", () => {
    const { tweens, step } = makeTweens();
    const target = { x: 0 };
    tweens.to(target, { x: 100 }, 100, linear, undefined, { delay: 50 });
    target.x = 20;
    step(50);
    step(50);
    expect(target.x).toBeCloseTo(60);
  });

  it("freezes one group and lets the others keep running", () => {
    const { tweens, step } = makeTweens();
    const fx = { x: 0 };
    const ui = { x: 0 };
    tweens.to(fx, { x: 100 }, 100, linear, undefined, { group: FX_GROUP });
    tweens.to(ui, { x: 100 }, 100, linear, undefined, { group: UI_GROUP });
    tweens.setGroupScale(FX_GROUP, 0);
    step(50);
    expect(fx.x).toBe(0);
    expect(ui.x).toBeCloseTo(50);
    tweens.setGroupScale(FX_GROUP, 1);
    step(50);
    expect(fx.x).toBeCloseTo(50);
    expect(ui.x).toBeCloseTo(100);
  });

  it("defaults an untagged tween to the fx group", () => {
    const { tweens, step } = makeTweens();
    const target = { x: 0 };
    tweens.to(target, { x: 100 }, 100, linear);
    tweens.setGroupScale(FX_GROUP, 0);
    step(60);
    expect(target.x).toBe(0);
  });

  it("runs a sequence in order with the gaps it was given", () => {
    const { tweens, step } = makeTweens();
    const seen: string[] = [];
    tweens.sequence([
      { run: () => seen.push("a"), ms: 100 },
      { run: () => seen.push("b"), ms: 100 },
      { delay: 50, run: () => seen.push("c") },
    ]);
    step(1);
    expect(seen).toEqual(["a"]);
    step(100);
    expect(seen).toEqual(["a", "b"]);
    step(100);
    expect(seen).toEqual(["a", "b"]);
    step(60);
    expect(seen).toEqual(["a", "b", "c"]);
  });

  it("cancels a sequence before its remaining steps fire", () => {
    const { tweens, step } = makeTweens();
    const seen: string[] = [];
    const cancel = tweens.sequence([
      { run: () => seen.push("a"), ms: 100 },
      { run: () => seen.push("b") },
    ]);
    step(1);
    cancel();
    step(200);
    expect(seen).toEqual(["a"]);
  });

  it("scales sequence timing with the group it runs in", () => {
    const { tweens, step } = makeTweens();
    const seen: string[] = [];
    tweens.channel(UI_GROUP).sequence([{ ms: 100 }, { run: () => seen.push("late") }]);
    tweens.setGroupScale(UI_GROUP, 0);
    step(200);
    expect(seen).toEqual([]);
    tweens.setGroupScale(UI_GROUP, 2);
    step(60);
    expect(seen).toEqual(["late"]);
  });

  it("drops every timer and tween on destroy, not just the ticker hook", () => {
    const { tweens, step, stepDetached, attached } = makeTweens();
    const seen: string[] = [];
    const target = { x: 0 };
    tweens.to(target, { x: 100 }, 100, linear);
    tweens.after(50, () => seen.push("timer"));
    tweens.destroy();
    expect(attached()).toBe(false);
    step(200);
    stepDetached(200);
    expect(seen).toEqual([]);
    expect(target.x).toBe(0);
  });
});

describe("Tweens destroyed targets", () => {
  it("drops a tween whose target was destroyed instead of writing to it", () => {
    const { tweens, step } = makeTweens();
    const target = { x: 0, destroyed: false };
    tweens.to(target, { x: 100 }, 100, linear);
    step(50);
    expect(target.x).toBeCloseTo(50);
    target.destroyed = true;
    step(50);
    expect(target.x).toBeCloseTo(50);
  });

  it("never fires the completion of a tween whose target was destroyed", () => {
    const { tweens, step } = makeTweens();
    const target = { x: 0, destroyed: false };
    let done = 0;
    tweens.to(target, { x: 100 }, 100, linear, () => {
      done += 1;
    });
    target.destroyed = true;
    step(200);
    expect(done).toBe(0);
  });

  it("drops a point tween once the object observing it was destroyed", () => {
    const { tweens, step } = makeTweens();
    const owner = { destroyed: false };
    const scale = { x: 1, y: 1, _observer: owner };
    tweens.to(scale, { x: 0.5 }, 100, linear);
    step(50);
    expect(scale.x).toBeCloseTo(0.75);
    owner.destroyed = true;
    step(50);
    expect(scale.x).toBeCloseTo(0.75);
  });

  it("keeps running tweens on live targets that sit beside a destroyed one", () => {
    const { tweens, step } = makeTweens();
    const dead = { x: 0, destroyed: true };
    const live = { x: 0 };
    tweens.to(dead, { x: 100 }, 100, linear);
    tweens.to(live, { x: 100 }, 100, linear);
    step(50);
    expect(dead.x).toBe(0);
    expect(live.x).toBeCloseTo(50);
  });
});

describe("rafClock", () => {
  it("runs only while it has listeners", () => {
    const frames: FrameRequestCallback[] = [];
    const cancelled: number[] = [];
    const globals = globalThis as unknown as {
      window: {
        requestAnimationFrame: (fn: FrameRequestCallback) => number;
        cancelAnimationFrame: (id: number) => void;
      };
    };
    const before = globals.window;
    globals.window = {
      requestAnimationFrame: (fn) => {
        frames.push(fn);
        return frames.length;
      },
      cancelAnimationFrame: (id) => cancelled.push(id),
    };
    const clock = rafClock();
    const listener = (): void => undefined;
    clock.add(listener);
    expect(frames).toHaveLength(1);
    clock.remove(listener);
    expect(cancelled).toEqual([1]);
    clock.destroy();
    globals.window = before;
  });
});

describe("Tweens re-entrancy", () => {
  it("does not tick a tween a timer cancelled in the same frame", () => {
    const { tweens, step } = makeTweens();
    const target = { x: 0 };
    const cancel = tweens.to(target, { x: 100 }, 100, linear);
    tweens.after(1, cancel);
    step(50);
    expect(target.x).toBe(0);
  });

  it("does not tick a timer an earlier timer cancelled in the same frame", () => {
    const { tweens, step } = makeTweens();
    const seen: string[] = [];
    let cancelSecond: (() => void) | null = null;
    tweens.after(10, () => {
      seen.push("first");
      cancelSecond?.();
    });
    cancelSecond = tweens.after(20, () => seen.push("second"));
    step(50);
    expect(seen).toEqual(["first"]);
  });

  it("keeps an undelayed tween's start value from the moment it was created", () => {
    const { tweens, step } = makeTweens();
    const target = { x: 0 };
    tweens.to(target, { x: 100 }, 100, linear);
    target.x = 90;
    step(50);
    expect(target.x).toBeCloseTo(50);
  });
});
