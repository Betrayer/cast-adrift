import {
  init,
  isTMA,
  miniApp,
  retrieveLaunchParams,
  viewport,
} from "@tma.js/sdk";
import { tokens } from "@/app/theme";

export interface TmaSession {
  isTelegram: boolean;
  tgUserId: number | null;
}

const BROWSER_SESSION: TmaSession = { isTelegram: false, tgUserId: null };

const readTgUserId = (): number | null => {
  try {
    return retrieveLaunchParams().tgWebAppData?.user?.id ?? null;
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
  const session: TmaSession = { isTelegram: true, tgUserId: readTgUserId() };
  await setupTelegramChrome();
  return session;
};
