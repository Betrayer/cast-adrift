import {
  backButton,
  closingBehavior,
  hapticFeedback,
  init,
  isTMA,
  miniApp,
  retrieveLaunchParams,
  retrieveRawInitData,
  swipeBehavior,
  viewport,
} from "@tma.js/sdk";
import { tokens } from "@/app/theme";
import { canGoBack, useAppStore } from "@/stores/appStore";
import type { ScreenId } from "@/types";

export type HapticEvent =
  | "place"
  | "resolveTick"
  | "hitTaken"
  | "reveal"
  | "bossIntro"
  | "kill"
  | "setComplete"
  | "purchase"
  | "chainStep"
  | "mapJump"
  | "puzzleSolve"
  | "bossDefeat"
  | "achievement"
  | "levelUp"
  | "ending";

const IMPACTS: Partial<
  Record<HapticEvent, "light" | "medium" | "heavy" | "soft">
> = {
  place: "light",
  resolveTick: "soft",
  hitTaken: "medium",
  reveal: "medium",
  bossIntro: "heavy",
  kill: "medium",
  setComplete: "medium",
  purchase: "light",
  chainStep: "light",
  mapJump: "soft",
  bossDefeat: "heavy",
};

const ENDING_ECHO_MS = 160;

export const haptic = (event: HapticEvent): void => {
  try {
    const impact = IMPACTS[event];
    if (impact !== undefined) {
      hapticFeedback.impactOccurred.ifAvailable(impact);
      return;
    }
    hapticFeedback.notificationOccurred.ifAvailable("success");
    if (event === "ending") {
      setTimeout(() => {
        try {
          hapticFeedback.notificationOccurred.ifAvailable("success");
        } catch {}
      }, ENDING_ECHO_MS);
    }
  } catch {}
};

export interface TmaSession {
  isTelegram: boolean;
  tgUserId: number | null;
  tgName: string | null;
  initDataRaw: string | null;
  startParam: string | null;
}

const BROWSER_SESSION: TmaSession = {
  isTelegram: false,
  tgUserId: null,
  tgName: null,
  initDataRaw: null,
  startParam: null,
};

const readTgUserId = (): number | null => {
  try {
    return retrieveLaunchParams().tgWebAppData?.user?.id ?? null;
  } catch {
    return null;
  }
};

const readTgName = (): string | null => {
  try {
    return retrieveLaunchParams().tgWebAppData?.user?.first_name ?? null;
  } catch {
    return null;
  }
};

const readInitDataRaw = (): string | null => {
  try {
    return retrieveRawInitData() ?? null;
  } catch {
    return null;
  }
};

const readStartParam = (): string | null => {
  try {
    return retrieveLaunchParams().tgWebAppStartParam ?? null;
  } catch {
    return null;
  }
};

const setupTelegramChrome = async (): Promise<void> => {
  try {
    const mount = viewport.mount.ifAvailable();
    if (mount.ok) {
      await mount.data.catch(() => null);
      viewport.expand.ifAvailable();
      const full = viewport.requestFullscreen.ifAvailable();
      if (full.ok) await full.data.catch(() => null);
      viewport.bindCssVars.ifAvailable();
    }
    miniApp.mount.ifAvailable();
    miniApp.setBgColor.ifAvailable(tokens.bg);
    miniApp.ready.ifAvailable();
    swipeBehavior.mount.ifAvailable();
    closingBehavior.mount.ifAvailable();
  } catch (error) {
    console.warn("tma: chrome setup failed", error);
  }
};

const SWIPE_LOCKED: ReadonlySet<ScreenId> = new Set<ScreenId>([
  "battle",
  "map",
  "puzzle",
  "chart",
]);

const applySwipe = (screen: ScreenId): void => {
  try {
    if (SWIPE_LOCKED.has(screen)) swipeBehavior.disableVertical.ifAvailable();
    else swipeBehavior.enableVertical.ifAvailable();
  } catch {}
};

const applyBackButton = (visible: boolean): void => {
  try {
    if (visible) backButton.show.ifAvailable();
    else backButton.hide.ifAvailable();
  } catch {}
};

const applyClosingConfirmation = (active: boolean): void => {
  try {
    if (active) closingBehavior.enableConfirmation.ifAvailable();
    else closingBehavior.disableConfirmation.ifAvailable();
  } catch {}
};

export const bindTelegramChrome = (hasRun: () => boolean): void => {
  try {
    backButton.mount.ifAvailable();
    backButton.onClick.ifAvailable(() => {
      useAppStore.getState().back();
    });
  } catch (error) {
    console.warn("tma: back button unavailable", error);
  }

  let lastBack: boolean | null = null;
  let lastSwipe: ScreenId | null = null;
  let lastConfirm: boolean | null = null;

  const sync = (): void => {
    const state = useAppStore.getState();
    const back = canGoBack(state);
    if (back !== lastBack) {
      lastBack = back;
      applyBackButton(back);
    }
    if (state.screen !== lastSwipe) {
      lastSwipe = state.screen;
      applySwipe(state.screen);
    }
    const confirm = hasRun();
    if (confirm !== lastConfirm) {
      lastConfirm = confirm;
      applyClosingConfirmation(confirm);
    }
  };

  sync();
  useAppStore.subscribe(sync);
};

export const initTma = async (): Promise<TmaSession> => {
  try {
    if (!isTMA()) return BROWSER_SESSION;
    init();
  } catch {
    return BROWSER_SESSION;
  }
  const session: TmaSession = {
    isTelegram: true,
    tgUserId: readTgUserId(),
    tgName: readTgName(),
    initDataRaw: readInitDataRaw(),
    startParam: readStartParam(),
  };
  await setupTelegramChrome();
  return session;
};
