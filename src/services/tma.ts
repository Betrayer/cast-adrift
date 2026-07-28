import {
  hapticFeedback,
  init,
  isTMA,
  miniApp,
  retrieveLaunchParams,
  viewport,
} from "@tma.js/sdk";
import { tokens } from "@/app/theme";

export type HapticStyle = "light" | "medium" | "heavy";

export const haptic = (style: HapticStyle): void => {
  try {
    hapticFeedback.impactOccurred.ifAvailable(style);
  } catch {
    // no-op on web / when unavailable
  }
};

export interface TmaSession {
  isTelegram: boolean;
  tgUserId: number | null;
  tgName: string | null;
}

const BROWSER_SESSION: TmaSession = {
  isTelegram: false,
  tgUserId: null,
  tgName: null,
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

const setupTelegramChrome = async (): Promise<void> => {
  try {
    const mount = viewport.mount.ifAvailable();
    if (mount.ok) {
      await mount.data.catch(() => null);
      viewport.expand.ifAvailable();
    }
    miniApp.mount.ifAvailable();
    miniApp.setBgColor.ifAvailable(tokens.bg);
    miniApp.ready.ifAvailable();
  } catch (error) {
    console.warn("tma: chrome setup failed", error);
  }
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
  };
  await setupTelegramChrome();
  return session;
};
