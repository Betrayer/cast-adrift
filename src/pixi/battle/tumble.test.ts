import { beforeAll, describe, expect, it, vi } from "vitest";
import { Container, Sprite, Texture } from "pixi.js";
import type { Application, Ticker } from "pixi.js";
import { rollParts } from "@/dice3d/dieRoll";
import { Tumble, type TumbleDie, type TumbleRect } from "@/pixi/battle/tumble";
import { Tweens, type TweenClock } from "@/pixi/tween";
import { createStreamFromState } from "@/services/rng";

vi.mock("@/dice3d/paintPixi", async () => {
  const pixi = await import("pixi.js");
  class PolyDie {
    readonly view = new pixi.Container();
    draw(): void {
      return;
    }
    destroy(): void {
      this.view.destroy({ children: true });
    }
  }
  return { PolyDie };
});

const BOX: TumbleRect = { x: 0, y: 0, w: 320, h: 120 };
const DIE_SIZE = 40;
const PALETTE = { fill: "#222222", stroke: "#888888", text: "#ffffff" };
const TIERS = [4, 6, 8, 10, 12, 20, 100] as const;

const dice = (count: number, prefix: string): TumbleDie[] =>
  Array.from({ length: count }, (_, i) => {
    const tier = TIERS[i % TIERS.length] ?? 6;
    return {
      uid: `${prefix}${String(i)}`,
      texture: Texture.EMPTY,
      grid: { x: i * DIE_SIZE, y: 0 },
      parts: rollParts(
        { defId: `basic-d${String(tier)}`, tier, value: tier === 100 ? 37 : Math.max(1, tier - 1) },
        { style: "flip", durationMs: 600, seed: 11 + i, reduced: false, radius: DIE_SIZE / 2 },
      ),
      palette: PALETTE,
    };
  });

const harness = () => {
  const listeners = new Set<(ticker: Ticker) => void>();
  let adds = 0;
  const tick = (deltaMS: number): void => {
    for (const fn of [...listeners]) fn({ deltaMS } as Ticker);
  };
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
    tick,
    sprites: (): number => root.children.filter((child) => child instanceof Sprite).length,
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

  it("hands every die back as a flat sprite showing the engine value", async () => {
    const { tumble, tick, sprites } = harness();
    const rolled = dice(7, "h");
    const faces = new Map<string, string>();
    tumble.run(rolled, BOX, DIE_SIZE, () => undefined, (uid, face) => {
      faces.set(uid, face);
    });
    await settleImport();
    for (let ms = 0; ms < 700; ms += 16) tick(16);
    expect(sprites()).toBe(7);
    expect(Object.fromEntries(faces)).toEqual({
      h0: "3",
      h1: "5",
      h2: "7",
      h3: "9",
      h4: "11",
      h5: "19",
      h6: "37",
    });
  });
});
