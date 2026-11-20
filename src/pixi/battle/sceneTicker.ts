import { UPDATE_PRIORITY } from "pixi.js";
import type { Ticker } from "pixi.js";

export const HALO_FOLLOW_PRIORITY = UPDATE_PRIORITY.LOW + 1;

export const attachSceneTicker = (
  ticker: Ticker,
  tick: (ticker: Ticker) => void,
  followHalos: () => void,
): (() => void) => {
  ticker.add(tick);
  ticker.add(followHalos, undefined, HALO_FOLLOW_PRIORITY);
  return () => {
    ticker.remove(tick);
    ticker.remove(followHalos);
  };
};
