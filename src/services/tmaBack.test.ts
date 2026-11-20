import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearBackGuards, registerBackGuard } from "@/app/backGuard";
import { useAppStore } from "@/stores/appStore";

const showBack = vi.fn();
const hideBack = vi.fn();

const stub = () => ({ ifAvailable: vi.fn() });

vi.mock("@tma.js/sdk", () => ({
  backButton: {
    mount: stub(),
    onClick: stub(),
    show: { ifAvailable: showBack },
    hide: { ifAvailable: hideBack },
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
    disableVertical: stub(),
    enableVertical: stub(),
  },
  viewport: {
    mount: stub(),
    expand: stub(),
    requestFullscreen: stub(),
    bindCssVars: stub(),
  },
}));

describe("the Telegram back button follows the guards", () => {
  beforeEach(() => {
    clearBackGuards();
    showBack.mockClear();
    hideBack.mockClear();
  });

  it("shows once a guarded screen arms its guard, with no store write in between", async () => {
    const { bindTelegramChrome } = await import("@/services/tma");
    useAppStore.getState().go("menu");
    bindTelegramChrome(() => false);
    useAppStore.getState().go("map");
    showBack.mockClear();
    expect(showBack).not.toHaveBeenCalled();

    const release = registerBackGuard("map", () => undefined);
    expect(showBack).toHaveBeenCalledTimes(1);

    hideBack.mockClear();
    release();
    expect(hideBack).toHaveBeenCalledTimes(1);
  });
});
