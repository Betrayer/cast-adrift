import '@mantine/core/styles.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import { setupAutosave } from '@/game/run/autosave';
import { bootCloud } from '@/game/run/cloud';
import { initI18n } from '@/i18n';
import { initTma } from '@/services/tma';
import { useAppStore } from '@/stores/appStore';

void initI18n();
setupAutosave();

const bootPlatform = async (): Promise<void> => {
  try {
    const session = await initTma();
    useAppStore.getState().setTgUserId(session.tgUserId);
  } catch (error) {
    console.error('boot: tma init failed', error);
  }
  try {
    const { ensureAnonAuth } = await import('@/services/firebase');
    await ensureAnonAuth();
  } catch (error) {
    console.error('boot: firebase boot failed', error);
  }
  await bootCloud();
};

void bootPlatform();

const rootElement = document.getElementById('root');
if (rootElement === null) throw new Error('missing #root element');

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
