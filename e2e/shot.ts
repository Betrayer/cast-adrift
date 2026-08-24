import { expect } from '@playwright/test';
import type { Screens } from './screens';

const HIDE_TOASTS = '[data-toast-host]{display:none !important}';

export const quiet = (app: Screens): Promise<unknown> =>
  app.page.addStyleTag({ content: HIDE_TOASTS });

export const shot = async (app: Screens, name: string): Promise<void> => {
  await quiet(app);
  await expect(app.page).toHaveScreenshot(name);
};
