import { afterEach, describe, expect, it, vi } from "vitest";
import { useSettingsStore } from "@/stores/settingsStore";

const impact = vi.fn();
const notify = vi.fn();
const stub = () => ({ ifAvailable: vi.fn() });

vi.mock("@tma.js/sdk", () => ({
  backButton: { mount: stub(), onClick: stub(), show: stub(), hide: stub() },
  closingBehavior: { mount: stub(), enableConfirmation: stub(), disableConfirmation: stub() },
  hapticFeedback: {
    impactOccurred: { ifAvailable: impact },
    notificationOccurred: { ifAvailable: notify },
    selectionChanged: stub(),
  },
  init: vi.fn(),
  isTMA: () => false,
  miniApp: { mount: stub(), setBgColor: stub(), ready: stub() },
  openLink: { ifAvailable: vi.fn(() => ({ ok: false })) },
  retrieveLaunchParams: () => ({}),
  retrieveRawInitData: () => null,
  swipeBehavior: { mount: stub(), disableVertical: stub(), enableVertical: stub() },
  viewport: { mount: stub(), expand: stub(), requestFullscreen: stub(), bindCssVars: stub() },
}));

const { haptic } = await import("@/services/tma");

describe("the haptics switch", () => {
  afterEach(() => {
    impact.mockClear();
    notify.mockClear();
    useSettingsStore.getState().setHaptics(true);
  });

  it("buzzes while the switch is on", () => {
    haptic("place");
    haptic("levelUp");
    expect(impact).toHaveBeenCalledWith("light");
    expect(notify).toHaveBeenCalledWith("success");
  });

  it("keeps the phone still once it is off", () => {
    useSettingsStore.getState().setHaptics(false);
    haptic("place");
    haptic("levelUp");
    expect(impact).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });
});
