import { test as base, expect } from '@playwright/test';
import { Screens } from './screens';

export interface CastAdriftFixtures {
  app: Screens;
}

export const test = base.extend<CastAdriftFixtures>({
  app: async ({ page }, use, testInfo) => {
    const log: string[] = [];
    page.on('console', (message) => {
      const type = message.type();
      if (type !== 'warning' && type !== 'error') return;
      log.push(`[${type}] ${message.text()}`);
    });
    page.on('pageerror', (error) => {
      log.push(`[pageerror] ${error.message}`);
    });
    const screens = new Screens(page);
    await screens.boot();
    await use(screens);
    if (testInfo.status !== testInfo.expectedStatus && log.length > 0) {
      await testInfo.attach('browser-console', {
        body: log.join('\n'),
        contentType: 'text/plain',
      });
    }
  },
});

export { expect };
