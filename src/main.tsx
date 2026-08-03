import '@mantine/core/styles.css';
import '@/app/global.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import { applyFontScale, applyMotion, applyTheme } from '@/app/theme';
import { setupAutosave } from '@/game/run/autosave';
import { bootCloud } from '@/game/run/cloud';
import { initI18n } from '@/i18n';
import { linkAccounts, readMetaDocFor, shouldAttemptLink } from '@/services/account-link';
import { trackSessionStart } from '@/services/analytics';
import { setupErrorReporting } from '@/services/errors';
import { bootMetaSync, setupMetaSync } from '@/services/meta-sync';
import { hasRun } from '@/services/save';
import { startTargetFor } from '@/services/start-param';
import { bindTelegramChrome, initTma, type TmaSession } from '@/services/tma';
import { useAppStore } from '@/stores/appStore';
import {
  resolveReducedMotion,
  useSettingsStore,
} from '@/stores/settingsStore';

applyTheme(useSettingsStore.getState().theme);
applyFontScale(useSettingsStore.getState().fontScale);
applyMotion(resolveReducedMotion(useSettingsStore.getState().reducedMotion));

setupErrorReporting();
setupAutosave();
setupMetaSync();

// Telegram players get the stable `tg:` uid; the anonymous profile a device may
// already carry is merged into it exactly once (DESIGN §4). The anonymous meta
// document has to be read before the sign-in swaps identities, because the
// rules stop the Telegram user from reading it afterwards.
const bootAuth = async (session: TmaSession): Promise<void> => {
  const { ensureAnonAuth, restoredUid, signInWithTelegram } = await import(
    '@/services/firebase'
  );
  const previous = await restoredUid();
  let uid: string | null = null;
  if (session.isTelegram && session.initDataRaw !== null) {
    const anonMeta =
      previous !== null && shouldAttemptLink(previous)
        ? await readMetaDocFor(previous)
        : null;
    uid = await signInWithTelegram(session.initDataRaw);
    if (uid !== null) {
      const outcome = await linkAccounts({
        anonUid: previous,
        telegramUid: uid,
        anonMeta,
      });
      if (import.meta.env.DEV) console.info(`boot: account link ${outcome}`);
    }
  }
  uid ??= await ensureAnonAuth();
  useAppStore.getState().setUid(uid);
};

const bootPlatform = async (): Promise<void> => {
  let session: TmaSession = {
    isTelegram: false,
    tgUserId: null,
    tgName: null,
    initDataRaw: null,
    startParam: null,
  };
  try {
    session = await initTma();
    useAppStore.getState().setTgUserId(session.tgUserId);
    useAppStore.getState().setTgName(session.tgName);
  } catch (error) {
    console.error('boot: tma init failed', error);
  }
  const target = startTargetFor(session.startParam);
  if (target !== null) useAppStore.getState().go(target.screen, target.params);
  bindTelegramChrome(hasRun);
  trackSessionStart(session.isTelegram ? 'telegram' : 'web');
  try {
    await bootAuth(session);
  } catch (error) {
    console.error('boot: firebase boot failed', error);
  }
  await bootMetaSync();
  await bootCloud();
};

void bootPlatform();

const mount = (): void => {
  const rootElement = document.getElementById('root');
  if (rootElement === null) throw new Error('missing #root element');
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
};

// The active locale is a lazy chunk, so the first paint waits for it — a frame
// of English before a Ukrainian menu reads as a bug, not as a fast boot.
void initI18n()
  .catch((error: unknown) => {
    console.error('boot: i18n init failed', error);
  })
  .finally(mount);
