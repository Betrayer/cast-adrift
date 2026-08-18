import { test as base, expect, type Page, type TestInfo } from '@playwright/test';
import { Screens } from './screens';

export interface CastAdriftFixtures {
  app: Screens;
  fresh: Screens;
}

const withConsoleLog = async (
  page: Page,
  testInfo: TestInfo,
  boot: (screens: Screens) => Promise<void>,
  use: (screens: Screens) => Promise<void>,
): Promise<void> => {
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
  await boot(screens);
  await use(screens);
  if (testInfo.status !== testInfo.expectedStatus && log.length > 0) {
    await testInfo.attach('browser-console', {
      body: log.join('\n'),
      contentType: 'text/plain',
    });
  }
};

export const test = base.extend<CastAdriftFixtures>({
  app: async ({ page }, use, testInfo) => {
    await withConsoleLog(
      page,
      testInfo,
      (screens) => screens.boot(),
      (screens) => use(screens),
    );
  },
  fresh: async ({ page }, use, testInfo) => {
    await withConsoleLog(
      page,
      testInfo,
      (screens) => screens.bootFresh(),
      (screens) => use(screens),
    );
  },
});

export { expect };
