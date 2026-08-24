import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearVignette,
  flashVignette,
  lastVignetteFlash,
  resetVignette,
  setVignetteRim,
  sideForX,
  subscribeVignette,
  syncHullRim,
  vignetteRims,
  type VignetteEvent,
} from "@/services/vignette";

afterEach(() => {
  resetVignette();
});

describe("vignette driver", () => {
  it("stamps a rising sequence on every flash", () => {
    const first = flashVignette("hullHit");
    const second = flashVignette("shieldGain");
    expect(second.seq).toBeGreaterThan(first.seq);
    expect(lastVignetteFlash()).toEqual(second);
  });

  it("clamps strength into the unit range", () => {
    expect(flashVignette("glancing", { strength: 2 }).strength).toBe(1);
    expect(flashVignette("glancing", { strength: -1 }).strength).toBe(0);
    expect(flashVignette("glancing", { strength: 0.5 }).strength).toBe(0.5);
  });

  it("defaults an unsided flash to the full edge", () => {
    expect(flashVignette("surge").side).toBe("all");
    expect(flashVignette("hullHit", { side: "left" }).side).toBe("left");
  });

  it("notifies subscribers of flashes and rim changes", () => {
    const seen: VignetteEvent[] = [];
    const stop = subscribeVignette((event) => seen.push(event));
    flashVignette("shieldBreak");
    setVignetteRim("shield", true);
    stop();
    flashVignette("dodge");
    expect(seen).toHaveLength(2);
    expect(seen[0]?.k).toBe("flash");
    expect(seen[1]).toEqual({ k: "rims", rims: { shield: true, lowHull: false } });
  });

  it("keeps rim writes idempotent", () => {
    const listener = vi.fn();
    subscribeVignette(listener);
    setVignetteRim("shield", true);
    setVignetteRim("shield", true);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("raises the low-hull rim under thirty percent and drops it on a heal", () => {
    syncHullRim(5, 20);
    expect(vignetteRims().lowHull).toBe(true);
    syncHullRim(12, 20);
    expect(vignetteRims().lowHull).toBe(false);
  });

  it("never raises the low-hull rim on a dead or unsized hull", () => {
    syncHullRim(0, 20);
    expect(vignetteRims().lowHull).toBe(false);
    syncHullRim(1, 0);
    expect(vignetteRims().lowHull).toBe(false);
  });

  it("drops every rim on clear", () => {
    setVignetteRim("shield", true);
    setVignetteRim("lowHull", true);
    clearVignette();
    expect(vignetteRims()).toEqual({ shield: false, lowHull: false });
  });

  it("reads an attacker side off the horizontal position", () => {
    expect(sideForX(20, 400)).toBe("left");
    expect(sideForX(380, 400)).toBe("right");
    expect(sideForX(200, 400)).toBe("top");
    expect(sideForX(10, 0)).toBe("all");
  });
});
