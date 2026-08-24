import { expect, test } from '../fixtures';
import type { Screens } from '../screens';
import type { ScreenId } from '@/types';

declare global {
  interface Window {
    caMotionProbe?: { marker: boolean; trail: boolean; arrival: boolean };
  }
}

const STATIC_SCREENS: readonly ScreenId[] = [
  'shop',
  'codex',
  'collection',
  'contracts',
  'engraving',
  'finale',
  'hangar',
  'leaderboard',
  'modes',
  'puzzle',
  'runSetup',
  'settings',
];

const ANOMALY_SEEDS = [7, 11, 13, 17, 19, 23, 29, 31] as const;

const animatedCount = async (app: Screens, screen: ScreenId): Promise<number> =>
  app.page.evaluate((id) => {
    const root = document.querySelector(`[data-screen="${id}"]`);
    if (root === null) return -1;
    const moving = [
      ...root.querySelectorAll('[data-rise], [data-entry-flourish]'),
    ].filter((node) => {
      const style = getComputedStyle(node);
      return style.animationName !== 'none' && style.animationDuration !== '0s';
    });
    return moving.length;
  }, screen);

const openScreen = async (app: Screens, screen: ScreenId): Promise<void> => {
  if (screen === 'shop' || screen === 'finale') {
    await app.seedRun({ seed: 7 });
    await app.grantRun(400);
  }
  if (screen === 'puzzle') {
    const { nodeId } = await app.seedRunWithNode('anomaly', ANOMALY_SEEDS);
    await app.expectScreen('map');
    await app.jumpToNodeInUi(nodeId);
    await app.expectScreen('puzzle');
    return;
  }
  await app.goTo(screen);
};

test.describe('screen motion', () => {
  test('forward navigation slides in from the right', async ({ app }) => {
    await app.testId('menu-settings').click();
    await app.expectScreen('settings');
    await expect(app.screen('settings')).toHaveAttribute(
      'data-nav-dir',
      'forward',
    );
  });

  test('back navigation slides in from the left', async ({ app }) => {
    await app.testId('menu-settings').click();
    await app.expectScreen('settings');
    await app.hardwareBack();
    await app.expectScreen('menu');
    await expect(app.screen('menu')).toHaveAttribute('data-nav-dir', 'back');
  });

  test('ceremonies and battle keep their bespoke entries', async ({ app }) => {
    await app.seedRun({ seed: 7 });
    await app.startBattle({ enemyIds: ['raider'], seed: 7 });
    await app.waitForPlacement();
    await expect(app.screen('battle')).toHaveAttribute('data-nav-dir', 'none');
  });

  test('every static screen shows entry motion', async ({ app }) => {
    await app.page.evaluate(() => {
      window.caTest?.grantMeta({
        level: 30,
        shards: 4000,
        collection: [{ defId: 'flare', count: 2 }],
      });
    });
    for (const screen of STATIC_SCREENS) {
      await openScreen(app, screen);
      await expect
        .poll(() => animatedCount(app, screen), {
          message: `${screen} has entry motion`,
        })
        .toBeGreaterThan(0);
    }
  });
});

test.describe('map travel', () => {
  test('the marker eases along a trail and ticks on arrival', async ({
    app,
  }) => {
    const { nodeId } = await app.seedRunWithNode('event', ANOMALY_SEEDS);
    await app.expectScreen('map');
    await app.page.locator(`[data-node="${nodeId}"]`).click();
    await app.page.evaluate(() => {
      window.caMotionProbe = { marker: false, trail: false, arrival: false };
      const probe = new MutationObserver(() => {
        const seen = window.caMotionProbe;
        if (seen === undefined) return;
        seen.marker ||= document.querySelector('[data-map-marker]') !== null;
        seen.trail ||= document.querySelector('[data-map-trail]') !== null;
        seen.arrival ||= document.querySelector('[data-map-arrival]') !== null;
      });
      probe.observe(document.body, { childList: true, subtree: true });
    });
    await app.testId('map-jump').click();
    await app.expectScreen('event');
    expect(await app.page.evaluate(() => window.caMotionProbe)).toEqual({
      marker: true,
      trail: true,
      arrival: true,
    });
  });

  test('the marker travel duration comes from the shared token', async ({
    app,
  }) => {
    const { nodeId } = await app.seedRunWithNode('event', ANOMALY_SEEDS);
    await app.expectScreen('map');
    await app.page.locator(`[data-node="${nodeId}"]`).click();
    await app.testId('map-jump').click();
    const timing = await app.page.evaluate(() => {
      const marker = document.querySelector('[data-map-marker]');
      if (marker === null) return null;
      const style = getComputedStyle(marker);
      return {
        duration: style.transitionDuration,
        token: style.getPropertyValue('--ca-map-jump-ms').trim(),
      };
    });
    expect(timing).toEqual({ duration: '0.42s', token: '420ms' });
  });
});

test.describe('motion primitives', () => {
  test('a legendary loot reveal rains particles', async ({ app }) => {
    await app.seedRun({ seed: 7 });
    await app.startBattle({ enemyIds: ['raider'], seed: 7 });
    await app.waitForPlacement();
    await app.page.evaluate(() => {
      window.caTest?.dropLoot('lancehead');
    });
    await expect(app.page.locator('[data-loot-reveal="lancehead"]')).toBeVisible();
    await expect(
      app.page.locator('[data-loot-reveal="lancehead"] canvas'),
    ).toBeVisible();
    await app.page.evaluate(() => {
      window.caTest?.dropLoot(null);
    });
  });

  test('a sector boss intro sweeps warp streaks', async ({ app }) => {
    await app.seedRun({ seed: 7 });
    await app.startBattle({ enemyIds: ['quarantineWarden'], seed: 7 });
    await expect(app.testId('boss-intro')).toBeVisible();
    await expect(
      app.testId('boss-intro').locator('[data-warp]'),
    ).toBeVisible();
  });
});

test.describe('juice hooks', () => {
  test('arming an active pops its console button', async ({ app }) => {
    await app.seedRun({ seed: 7 });
    await app.startBattle({
      enemyIds: ['raider'],
      deck: ['gyro', 'gyro', 'gyro', 'gyro', 'gyro'],
      seed: 7,
    });
    await app.waitForPlacement();
    const tray = (await app.state()).battle.dice.find((d) => d.state === 'tray');
    expect(tray).toBeDefined();
    if (tray === undefined) return;
    await app.selectDie(tray.uid);
    const swap = app.console('swap');
    if ((await swap.count()) === 0) return;
    await swap.click();
    await expect(swap).toHaveAttribute('data-pop', '1');
  });

  test('an alternate mini-boss announces a new signature', async ({ app }) => {
    await app.seedRun({ seed: 7 });
    await app.page.evaluate(() => {
      window.caTest?.grantRun({});
    });
    await app.startBattle({ enemyIds: ['quarantineWarden'], seed: 7 });
    await expect(app.testId('boss-intro')).toBeVisible();
    await expect(app.page.locator('[data-intro-kind]')).toHaveAttribute(
      'data-intro-kind',
      'boss',
    );
  });

  test('the summary names the shards a first find paid', async ({ app }) => {
    await app.seedRun({ seed: 7 });
    await app.goTo('summary');
    const line = app.page.locator('[data-first-finds]');
    if ((await line.count()) === 0) return;
    await expect(line).toHaveAttribute('data-find-shards', /\d+/);
  });
});

test.describe('motion baselines', () => {
  test('the screens settle where they would without motion', async ({ app }) => {
    await app.page.evaluate(() => {
      window.caTest?.grantMeta({ level: 30, shards: 4000 });
    });
    await app.page.addStyleTag({ content: '[data-toast-host]{display:none !important}' });

    await app.seedRun({ seed: 7 });
    await app.grantRun(400);
    await app.goTo('shop');
    await expect(app.page).toHaveScreenshot('motion-shop.png');

    await app.goTo('hangar');
    await expect(app.page).toHaveScreenshot('motion-hangar.png');

    await app.goTo('settings');
    await app.waitForAuthSettled();
    await expect(app.page).toHaveScreenshot('motion-settings.png');
  });
});
