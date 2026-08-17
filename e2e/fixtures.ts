import { test as base, expect } from '@playwright/test';
import { Screens } from './screens';

export interface CastAdriftFixtures {
  app: Screens;
}

export const test = base.extend<CastAdriftFixtures>({
  app: async ({ page }, use) => {
    const screens = new Screens(page);
    await screens.boot();
    await use(screens);
  },
});

export { expect };
