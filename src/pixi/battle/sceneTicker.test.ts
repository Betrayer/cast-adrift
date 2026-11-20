import { describe, expect, it } from "vitest";
import { Ticker, UPDATE_PRIORITY } from "pixi.js";
import { attachSceneTicker } from "@/pixi/battle/sceneTicker";

const manualTicker = (): Ticker => {
  const ticker = new Ticker();
  ticker.autoStart = false;
  return ticker;
};

describe("attachSceneTicker", () => {
  it("moves the halos after every normal update of the frame, a tween attached later included, and before the render the app registered first", () => {
    const ticker = manualTicker();
    const order: string[] = [];
    ticker.add(() => order.push("render"), undefined, UPDATE_PRIORITY.LOW);
    attachSceneTicker(ticker, () => order.push("tick"), () => order.push("halo"));
    ticker.add(() => order.push("tween"));
    ticker.update(ticker.lastTime + 16);
    expect(order).toEqual(["tick", "tween", "halo", "render"]);
    ticker.destroy();
  });

  it("detaches both callbacks", () => {
    const ticker = manualTicker();
    const order: string[] = [];
    const detach = attachSceneTicker(ticker, () => order.push("tick"), () => order.push("halo"));
    detach();
    ticker.update(ticker.lastTime + 16);
    expect(order).toEqual([]);
    ticker.destroy();
  });
});
