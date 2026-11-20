import { beforeEach, describe, expect, it, vi } from "vitest";
import { isSwipeLocked } from "@/app/routes";
import { useAppStore } from "@/stores/appStore";

const disableVertical = vi.fn();
const enableVertical = vi.fn();

const stub = () => ({ ifAvailable: vi.fn() });

vi.mock("@tma.js/sdk", () => ({
  backButton: {
    mount: stub(),
    onClick: stub(),
    show: stub(),
    hide: stub(),
  },
  closingBehavior: {
    mount: stub(),
    enableConfirmation: stub(),
    disableConfirmation: stub(),
  },
  hapticFeedback: {
    impactOccurred: stub(),
    notificationOccurred: stub(),
    selectionChanged: stub(),
  },
  init: vi.fn(),
  isTMA: () => false,
  miniApp: { mount: stub(), setBgColor: stub(), ready: stub() },
  openLink: { ifAvailable: vi.fn(() => ({ ok: false })) },
  retrieveLaunchParams: () => ({}),
  retrieveRawInitData: () => null,
  swipeBehavior: {
    mount: stub(),
    disableVertical: { ifAvailable: disableVertical },
    enableVertical: { ifAvailable: enableVertical },
  },
  viewport: {
    mount: stub(),
    expand: stub(),
    requestFullscreen: stub(),
    bindCssVars: stub(),
  },
}));

describe("the Telegram sheet may not steal a battle gesture", () => {
  beforeEach(() => {
    disableVertical.mockClear();
    enableVertical.mockClear();
  });

  it("locks the vertical swipe on every screen that owns a drag", () => {
    expect(isSwipeLocked("battle")).toBe(true);
    expect(isSwipeLocked("map")).toBe(true);
    expect(isSwipeLocked("puzzle")).toBe(true);
    expect(isSwipeLocked("chart")).toBe(true);
  });

  it("leaves the swipe alone on a screen that only scrolls", () => {
    expect(isSwipeLocked("menu")).toBe(false);
    expect(isSwipeLocked("settings")).toBe(false);
  });

  it("disables the swipe on entering battle and restores it on leaving", async () => {
    const { bindTelegramChrome } = await import("@/services/tma");
    useAppStore.getState().go("menu");
    bindTelegramChrome(() => false);
    disableVertical.mockClear();
    enableVertical.mockClear();

    useAppStore.getState().go("battle");
    expect(disableVertical).toHaveBeenCalledTimes(1);
    expect(enableVertical).not.toHaveBeenCalled();

    useAppStore.getState().go("menu");
    expect(enableVertical).toHaveBeenCalledTimes(1);
  });
});
