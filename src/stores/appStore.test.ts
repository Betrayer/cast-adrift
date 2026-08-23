import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearBackGuards, registerBackGuard } from "@/app/backGuard";
import {
  backActionFor,
  canGoBack,
  ROOT_SCREEN,
  useAppStore,
  type StackEntry,
} from "@/stores/appStore";

const reset = (): void => {
  clearBackGuards();
  useAppStore.setState({
    screen: ROOT_SCREEN,
    params: undefined,
    stack: [],
    systemMenu: false,
  });
};

const screens = (): string[] =>
  useAppStore.getState().stack.map((entry: StackEntry) => entry.screen);

describe("appStore navigation stack", () => {
  beforeEach(reset);

  it("starts at the root with nothing to go back to", () => {
    expect(useAppStore.getState().screen).toBe("menu");
    expect(canGoBack(useAppStore.getState())).toBe(false);
  });

  it("pushes the screen it left behind", () => {
    useAppStore.getState().go("hangar");
    useAppStore.getState().go("engraving");
    expect(screens()).toEqual(["menu", "hangar"]);
    expect(canGoBack(useAppStore.getState())).toBe(true);
  });

  it("pops back one screen at a time", () => {
    useAppStore.getState().go("hangar");
    useAppStore.getState().go("engraving");
    useAppStore.getState().back();
    expect(useAppStore.getState().screen).toBe("hangar");
    useAppStore.getState().back();
    expect(useAppStore.getState().screen).toBe("menu");
    expect(canGoBack(useAppStore.getState())).toBe(false);
  });

  it("treats navigating to a screen already behind us as a return", () => {
    useAppStore.getState().go("hangar");
    useAppStore.getState().go("engraving");
    useAppStore.getState().go("menu");
    expect(screens()).toEqual([]);
    expect(canGoBack(useAppStore.getState())).toBe(false);
  });

  it("does not grow the stack on a round trip", () => {
    for (let i = 0; i < 20; i += 1) {
      useAppStore.getState().go("settings");
      useAppStore.getState().go("menu");
    }
    expect(screens()).toEqual([]);
  });

  it("caps the history so a long session cannot grow it without bound", () => {
    const path = [
      "hangar",
      "engraving",
      "collection",
      "codex",
      "chart",
      "modes",
      "contracts",
      "leaderboard",
      "profile",
      "achievements",
      "settings",
      "runSetup",
      "map",
      "shop",
    ] as const;
    for (const screen of path) useAppStore.getState().go(screen);
    expect(useAppStore.getState().stack.length).toBeLessThanOrEqual(12);
  });

  it("hides back on screens the player must resolve", () => {
    useAppStore.getState().go("map");
    useAppStore.getState().go("battle");
    expect(canGoBack(useAppStore.getState())).toBe(false);
    useAppStore.getState().back();
    expect(useAppStore.getState().screen).toBe("battle");
  });

  it("keeps params when re-entering the same screen", () => {
    useAppStore.getState().go("leaderboard", { tab: "drift" });
    useAppStore.getState().go("leaderboard", { tab: "daily" });
    expect(useAppStore.getState().params).toEqual({ tab: "daily" });
    expect(screens()).toEqual(["menu"]);
  });
});

describe("appStore back semantics", () => {
  beforeEach(reset);

  it("restores the params of the screen it returns to", () => {
    useAppStore.getState().go("modes");
    useAppStore.getState().go("leaderboard", { tab: "daily" });
    useAppStore.getState().go("profile");
    useAppStore.getState().back();
    expect(useAppStore.getState().screen).toBe("leaderboard");
    expect(useAppStore.getState().params).toEqual({ tab: "daily" });
  });

  it("sends a fixed-back route to its declared parent", () => {
    useAppStore.getState().go("hangar");
    useAppStore.getState().go("collection");
    useAppStore.getState().go("engraving");
    useAppStore.getState().back();
    expect(useAppStore.getState().screen).toBe("hangar");
    expect(screens()).toEqual(["menu"]);
  });

  it("reaches the fixed parent even when the stack never held it", () => {
    useAppStore.getState().seed([{ screen: "menu", params: undefined }], "engraving");
    useAppStore.getState().back();
    expect(useAppStore.getState().screen).toBe("hangar");
    expect(screens()).toEqual(["menu"]);
  });

  it("returns a journal opened from a battle to that battle", () => {
    useAppStore.getState().go("map");
    useAppStore.getState().go("battle");
    useAppStore.getState().go("journal");
    useAppStore.getState().back();
    expect(useAppStore.getState().screen).toBe("battle");
  });

  it("offers no back on a guarded screen until the screen arms one", () => {
    useAppStore.getState().go("map");
    useAppStore.getState().go("shop");
    expect(canGoBack(useAppStore.getState())).toBe(false);

    const leave = vi.fn();
    const release = registerBackGuard("shop", leave);
    expect(canGoBack(useAppStore.getState())).toBe(true);
    expect(backActionFor(useAppStore.getState()).kind).toBe("guard");

    useAppStore.getState().back();
    expect(leave).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().screen).toBe("shop");

    release();
    expect(canGoBack(useAppStore.getState())).toBe(false);
  });

  it("closes the system menu on every navigation", () => {
    useAppStore.getState().go("map");
    useAppStore.getState().setSystemMenu(true);
    useAppStore.getState().go("journal");
    expect(useAppStore.getState().systemMenu).toBe(false);

    useAppStore.getState().setSystemMenu(true);
    useAppStore.getState().back();
    expect(useAppStore.getState().systemMenu).toBe(false);
  });

  it("seeds a stack for a deep link so back always exists", () => {
    useAppStore
      .getState()
      .seed([{ screen: "menu", params: undefined }], "leaderboard", {
        tab: "drift",
      });
    expect(canGoBack(useAppStore.getState())).toBe(true);
    useAppStore.getState().back();
    expect(useAppStore.getState().screen).toBe("menu");
  });
});
