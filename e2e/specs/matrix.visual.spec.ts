import { expect, test } from '../fixtures';
import { shot } from '../shot';
import type { Screens } from '../screens';
import type { BattleLayoutId } from '@/types';
import type { ThemeId } from '@/data/themes';

const SEED = 7;
const BATTLE_DECK = [
  'ember',
  'frostplate',
  'sprout',
  'grey-d4',
  'ashen',
  'coreshard',
];

const LAYOUTS: readonly BattleLayoutId[] = ['console', 'orbit', 'tablet'];
const ALT_THEMES: readonly ThemeId[] = [
  'terminal',
  'blueprint',
  'aurora',
  'ascendant',
];

const WIDE = { width: 1920, height: 1080 };

const openBattle = async (
  app: Screens,
  layout: BattleLayoutId,
): Promise<void> => {
  await app.setLayout(layout);
  await app.seedRun({ seed: SEED });
  await app.page.evaluate((deck) => {
    window.caTest?.setBattle({
      enemyIds: ['raider'],
      deck,
      seed: 42,
      startCharge: 6,
    });
  }, BATTLE_DECK);
  await app.waitForPlacement();
  await app.waitForStableAnchors();
};

const openChart = async (app: Screens): Promise<void> => {
  await app.page.evaluate(() => {
    window.caTest?.grantMeta({ level: 8, shards: 250 });
  });
  await app.goTo('chart');
  await expect(app.page.locator('[data-chart-node]').first()).toBeVisible();
};

test.describe('visual baselines — matrix', () => {
  test('menu', async ({ app }) => {
    await shot(app, 'menu.png');
  });

  test('map', async ({ app }) => {
    await app.seedRun({ seed: SEED });
    await app.expectScreen('map');
    await shot(app, 'map.png');
  });

  for (const layout of LAYOUTS) {
    test(`battle — ${layout}`, async ({ app }) => {
      await openBattle(app, layout);
      await shot(app, `battle-${layout}.png`);
    });
  }

  test('star chart', async ({ app }) => {
    await openChart(app);
    await shot(app, 'chart.png');
  });

  test('hangar', async ({ app }) => {
    await app.page.evaluate(() => {
      window.caTest?.grantMeta({ level: 20, shards: 900 });
    });
    await app.goTo('hangar');
    await shot(app, 'hangar.png');
  });

  test('collection', async ({ app }) => {
    await app.page.evaluate(() => {
      window.caTest?.grantMeta({ level: 20, shards: 900 });
    });
    await app.goTo('collection');
    await shot(app, 'collection.png');
  });

  test('shop', async ({ app }) => {
    await app.seedRun({ seed: SEED });
    await app.grantRun(400);
    await app.goTo('shop');
    await shot(app, 'shop.png');
  });

  test('settings', async ({ app }) => {
    await app.goTo('settings');
    await app.waitForAuthSettled();
    await shot(app, 'settings.png');
  });

  test('profile', async ({ app }) => {
    await app.page.evaluate(() => {
      window.caTest?.grantMeta({ level: 8, shards: 250 });
    });
    await app.goTo('profile');
    await shot(app, 'profile.png');
  });

  test('achievements', async ({ app }) => {
    await app.goTo('achievements');
    await shot(app, 'achievements.png');
  });
});

test.describe('visual baselines — themes', () => {
  test.skip(
    ({ viewport }) => (viewport?.width ?? 0) < 1280,
    'the theme sweep is a desktop gate',
  );

  for (const theme of ALT_THEMES) {
    for (const layout of LAYOUTS) {
      test(`battle — ${layout} · ${theme}`, async ({ app }) => {
        await app.page.evaluate((id) => {
          window.caTest?.grantMeta({ themes: [id] });
          window.caTest?.settings({ theme: id });
        }, theme);
        await openBattle(app, layout);
        await shot(app, `battle-${layout}-${theme}.png`);
      });
    }
  }
});

test.describe('visual baselines — 1920', () => {
  test.skip(
    ({ viewport }) => (viewport?.width ?? 0) < 1280,
    'the widest composition is a desktop gate',
  );

  for (const layout of LAYOUTS) {
    test(`battle — ${layout} at 1920`, async ({ app }) => {
      await app.page.setViewportSize(WIDE);
      await openBattle(app, layout);
      await shot(app, `battle-${layout}-1920.png`);
    });
  }

  test('star chart at 1920', async ({ app }) => {
    await app.page.setViewportSize(WIDE);
    await openChart(app);
    await shot(app, 'chart-1920.png');
  });
});
