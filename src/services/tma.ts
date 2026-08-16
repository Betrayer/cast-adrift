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

// The DESIGN §10 haptic map, expressed as game events rather than raw strengths
// so the intensity of a moment lives in one table instead of at every call site.
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
    // The ending lands twice: one beat for the win, one for the run being over.
    if (event === "ending") {
      setTimeout(() => {
        try {
          hapticFeedback.notificationOccurred.ifAvailable("success");
        } catch {
          /* unavailable */
        }
      }, ENDING_ECHO_MS);
    }
  } catch {
    // no-op on web / when unavailable
  }
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

// Board display names come from the Telegram profile when the app runs inside a
// Mini App; the web build falls back to a generated captain name.
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
      // Fullscreen is a v8.0 method; on older clients the expanded viewport is
      // already the whole sheet and the call simply reports as unsupported.
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

// Vertical swipe closes the sheet, which during a battle means losing the turn
// to a dice drag that started too close to the edge. It stays disabled while a
// run is live and comes back on the menu screens.
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
  } catch {
    /* unsupported client */
  }
};

const applyBackButton = (visible: boolean): void => {
  try {
    if (visible) backButton.show.ifAvailable();
    else backButton.hide.ifAvailable();
  } catch {
    /* unsupported client */
  }
};

const applyClosingConfirmation = (active: boolean): void => {
  try {
    if (active) closingBehavior.enableConfirmation.ifAvailable();
    else closingBehavior.disableConfirmation.ifAvailable();
  } catch {
    /* unsupported client */
  }
};

// A single subscription drives every piece of Telegram chrome that depends on
// where the player is: the back button, the swipe lock and the "you have a run
// in progress" closing confirmation.
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
