import { beforeAll, describe, expect, it } from "vitest";
import { Container, Texture } from "pixi.js";
import type { Application, Ticker } from "pixi.js";
import { Tumble, type TumbleDie, type TumbleRect } from "@/pixi/battle/tumble";
import { Tweens, type TweenClock } from "@/pixi/tween";
import { createStreamFromState } from "@/services/rng";

const BOX: TumbleRect = { x: 0, y: 0, w: 320, h: 120 };
const DIE_SIZE = 40;

const dice = (count: number, prefix: string): TumbleDie[] =>
  Array.from({ length: count }, (_, i) => ({
    uid: `${prefix}${String(i)}`,
    texture: Texture.EMPTY,
    grid: { x: i * DIE_SIZE, y: 0 },
  }));

const harness = () => {
  const listeners = new Set<(ticker: Ticker) => void>();
  let adds = 0;
  const app = {
    ticker: {
      add: (fn: (ticker: Ticker) => void): void => {
        listeners.add(fn);
        adds += 1;
      },
      remove: (fn: (ticker: Ticker) => void): void => {
        listeners.delete(fn);
      },
    },
  } as unknown as Application;
  const clock: TweenClock = { add: () => undefined, remove: () => undefined };
  const layer = new Container();
  const tumble = new Tumble(
    app,
    layer,
    new Tweens(clock),
    createStreamFromState(7),
  );
  const root = layer.children[0] as Container;
  return {
    tumble,
    spawned: (): number => root.children.length,
    tickerAdds: (): number => adds,
    stepping: (): number => listeners.size,
  };
};

const settleImport = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 30));
};

describe("Tumble", () => {
  beforeAll(async () => {
    await import("matter-js");
  });

  it("spawns one sprite per die and drives the ticker", async () => {
    const { tumble, spawned, tickerAdds } = harness();
    tumble.run(dice(3, "a"), BOX, DIE_SIZE, () => undefined);
    await settleImport();
    expect(spawned()).toBe(3);
    expect(tickerAdds()).toBe(1);
  });

  it("cancel while the physics module is loading spawns nothing", async () => {
    const { tumble, spawned, tickerAdds } = harness();
    let finished = 0;
    tumble.run(dice(4, "b"), BOX, DIE_SIZE, () => {
      finished += 1;
    });
    tumble.cancel();
    await settleImport();
    expect(spawned()).toBe(0);
    expect(tickerAdds()).toBe(0);
    expect(finished).toBe(0);
  });

  it("a rerun during the load window replaces the pending tumble", async () => {
    const { tumble, spawned, tickerAdds, stepping } = harness();
    tumble.run(dice(2, "c"), BOX, DIE_SIZE, () => undefined);
    tumble.run(dice(5, "d"), BOX, DIE_SIZE, () => undefined);
    await settleImport();
    expect(spawned()).toBe(5);
    expect(tickerAdds()).toBe(1);
    expect(stepping()).toBe(1);
  });

  it("cancel does not poison the next tumble", async () => {
    const { tumble, spawned, tickerAdds } = harness();
    tumble.run(dice(3, "e"), BOX, DIE_SIZE, () => undefined);
    tumble.cancel();
    tumble.run(dice(2, "f"), BOX, DIE_SIZE, () => undefined);
    await settleImport();
    expect(spawned()).toBe(2);
    expect(tickerAdds()).toBe(1);
  });

  it("cancel tears down a tumble that is already running", async () => {
    const { tumble, spawned, stepping } = harness();
    tumble.run(dice(3, "g"), BOX, DIE_SIZE, () => undefined);
    await settleImport();
    expect(spawned()).toBe(3);
    tumble.cancel();
    expect(spawned()).toBe(0);
    expect(stepping()).toBe(0);
  });
});
