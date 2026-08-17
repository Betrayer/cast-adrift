import { expect, test } from '../fixtures';
import type { Screens } from '../screens';

const SEED = 7;

const HIDE_TOASTS = '[data-toast-host]{display:none !important}';

const quiet = (app: Screens): Promise<unknown> =>
  app.page.addStyleTag({ content: HIDE_TOASTS });

const shot = async (app: Screens, name: string): Promise<void> => {
  await quiet(app);
  await expect(app.page).toHaveScreenshot(name);
};

test.describe('visual baselines', () => {
  test('menu', async ({ app }) => {
    await shot(app, 'menu.png');
  });

  test('map', async ({ app }) => {
    await app.seedRun({ seed: SEED });
    await app.expectScreen('map');
    await shot(app, 'map.png');
  });

  test('battle placement', async ({ app }) => {
    await app.seedRun({ seed: SEED });
    await app.page.evaluate(() => {
      window.caTest?.setBattle({ enemyIds: ['raider'], seed: 42 });
    });
    await app.waitForPlacement();
    await app.waitForStableAnchors();
    await shot(app, 'battle-placement.png');
  });

  test('shop', async ({ app }) => {
    await app.seedRun({ seed: SEED });
    await app.grantRun(400);
    await app.page.evaluate(() => {
      window.caTest?.go('shop');
    });
    await app.expectScreen('shop');
    await shot(app, 'shop.png');
  });

  test('star chart', async ({ app }) => {
    await app.page.evaluate(() => {
      window.caTest?.grantMeta({ level: 8, shards: 250 });
    });
    await app.testId('menu-starChart').click();
    await app.expectScreen('chart');
    await shot(app, 'chart.png');
  });

  test('settings', async ({ app }) => {
    await app.testId('menu-settings').click();
    await app.expectScreen('settings');
    await app.waitForAuthSettled();
    await shot(app, 'settings.png');
  });

  test('account section', async ({ app }) => {
    await app.testId('menu-settings').click();
    await app.expectScreen('settings');
    await app.waitForAuthSettled();
    await quiet(app);
    await expect(app.testId('account-section')).toHaveScreenshot('account.png');
  });
});
