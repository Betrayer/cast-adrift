import '@mantine/core/styles.css';
import '@/app/global.css';
import '@/app/zindex.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import { applyFontScale, applyMotion, applyTheme } from '@/app/theme';
import { setupAutosave } from '@/game/run/autosave';
import { initI18n } from '@/i18n';
import {
  beginIdentityHandover,
  resolvePendingClaim,
} from '@/services/account';
import { shouldHandOver } from '@/services/account-link';
import { trackSessionStart } from '@/services/analytics';
import { authErrorCode, isSilentAuthError } from '@/services/authErrors';
import { setupErrorReporting } from '@/services/errors';
import { setupMetaSync } from '@/services/meta-sync';
import { installBrowserNavHistory } from '@/services/nav-history';
import {
  awaitProfileReady,
  bootProfileSync,
  installAuthWatch,
} from '@/services/profileSwitch';
import { hasRun } from '@/services/save';
import { seedStackFor, startTargetFor } from '@/services/start-param';
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

const bootAuth = async (session: TmaSession): Promise<void> => {
  const { consumeRedirect, ensureAnonAuth, restoredUid, signInWithTelegram } =
    await import('@/services/firebase');
  await installAuthWatch();
  const redirect = await consumeRedirect();
  if (redirect !== null && redirect.error !== null) {
    const code = authErrorCode(redirect.error);
    if (!isSilentAuthError(code)) useAppStore.getState().setAuthError(code);
  }
  const previous = await restoredUid();
  let uid: string | null = null;
  if (session.isTelegram && session.initDataRaw !== null) {
    if (shouldHandOver(previous)) await beginIdentityHandover();
    uid = await signInWithTelegram(session.initDataRaw);
  }
  uid ??= await ensureAnonAuth();
  if (uid === null) useAppStore.getState().setAuthError('network');
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
    useAppStore.getState().setIsTelegram(session.isTelegram);
  } catch (error) {
    console.error('boot: tma init failed', error);
  }
  const target = startTargetFor(session.startParam);
  if (target !== null) {
    useAppStore
      .getState()
      .seed(seedStackFor(target), target.screen, target.params);
  }
  bindTelegramChrome(hasRun);
  if (!session.isTelegram) installBrowserNavHistory();
  trackSessionStart(session.isTelegram ? 'telegram' : 'web');
  try {
    await bootAuth(session);
    await awaitProfileReady();
    await resolvePendingClaim();
  } catch (error) {
    console.error('boot: firebase boot failed', error);
  }
  await bootProfileSync();
};

if (import.meta.env.VITE_E2E === '1') {
  void import('@/services/testApi').then((module) => {
    module.mountTestApi();
  });
}

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

void initI18n()
  .catch((error: unknown) => {
    console.error('boot: i18n init failed', error);
  })
  .finally(mount);
