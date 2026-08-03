import { beforeEach, describe, expect, it } from "vitest";
import { canGoBack, ROOT_SCREEN, useAppStore } from "@/stores/appStore";

const reset = (): void => {
  useAppStore.setState({
    screen: ROOT_SCREEN,
    params: undefined,
    stack: [],
  });
};

describe("appStore navigation stack", () => {
  beforeEach(reset);

  it("starts at the root with nothing to go back to", () => {
    expect(useAppStore.getState().screen).toBe("menu");
    expect(canGoBack(useAppStore.getState())).toBe(false);
  });

  it("pushes the screen it left behind", () => {
    useAppStore.getState().go("hangar");
    useAppStore.getState().go("engraving");
    expect(useAppStore.getState().stack).toEqual(["menu", "hangar"]);
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
    expect(useAppStore.getState().stack).toEqual([]);
    expect(canGoBack(useAppStore.getState())).toBe(false);
  });

  it("does not grow the stack on a round trip", () => {
    for (let i = 0; i < 20; i += 1) {
      useAppStore.getState().go("settings");
      useAppStore.getState().go("menu");
    }
    expect(useAppStore.getState().stack).toEqual([]);
  });

  it("caps the history so a long session cannot grow it without bound", () => {
    const screens = [
      "hangar",
      "engraving",
      "collection",
      "codex",
      "chart",
      "modes",
      "contracts",
      "leaderboard",
      "profile",
      "settings",
      "runSetup",
      "map",
      "shop",
      "shipyard",
    ] as const;
    for (const screen of screens) useAppStore.getState().go(screen);
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
    expect(useAppStore.getState().stack).toEqual(["menu"]);
  });
});
