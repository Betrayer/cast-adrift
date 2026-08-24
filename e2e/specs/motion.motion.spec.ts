import { expect, test } from '../fixtures';
import type { Screens } from '../screens';
import { MARKER_TRAVEL_MS } from '@/screens/Map/travel';
import type { ScreenId } from '@/types';

declare global {
  interface Window {
    caMotionProbe?: { marker: boolean; trail: boolean; arrival: boolean };
    caTravelToken?: { duration: string; token: string } | null;
    caPopProbe?: boolean;
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

const SWAP_DIE = 'undertow';

const SWAP_DECK = [SWAP_DIE, SWAP_DIE, SWAP_DIE, SWAP_DIE, SWAP_DIE];

const MINIBOSS = 'leechQueen';

const OTHER_MINIBOSS = 'mineTyrant';

const enterAnimation = async (
  app: Screens,
  screen: ScreenId,
): Promise<{ name: string; duration: string; fill: string } | null> =>
  app.page.evaluate((id) => {
    const inner = document.querySelector(
      `[data-screen="${id}"] [data-screen-inner]`,
    );
    if (inner === null) return null;
    const style = getComputedStyle(inner);
    return {
      name: style.animationName,
      duration: style.animationDuration,
      fill: style.animationFillMode,
    };
  }, screen);

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
    return moving.filter((node) => node.getAnimations().length > 0).length;
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
    expect(await enterAnimation(app, 'settings')).toEqual({
      name: 'caEnterForward',
      duration: '0.18s',
      fill: 'backwards',
    });
  });

  test('back navigation slides in from the left', async ({ app }) => {
    await app.testId('menu-settings').click();
    await app.expectScreen('settings');
    await app.hardwareBack();
    await app.expectScreen('menu');
    await expect(app.screen('menu')).toHaveAttribute('data-nav-dir', 'back');
    expect(await enterAnimation(app, 'menu')).toEqual({
      name: 'caEnterBack',
      duration: '0.18s',
      fill: 'backwards',
    });
  });

  test('a dimmed row rises to its own opacity, not to full', async ({ app }) => {
    await app.goTo('contracts');
    const locked = app.page.locator('[data-contract-locked="1"]').first();
    await expect(locked).toBeVisible();
    const ends = await app.page.evaluate(() => {
      const node = document.querySelector('[data-contract-locked="1"]');
      if (node === null) return null;
      const rise = node
        .getAnimations()
        .find((animation) => (animation as CSSAnimation).animationName === 'caRise');
      if (rise === undefined) return null;
      const effect = rise.effect as KeyframeEffect | null;
      const frames = effect === null ? [] : effect.getKeyframes();
      const last = frames[frames.length - 1];
      return String(last?.opacity ?? '');
    });
    expect(ends).toBe('0.6');
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
    await app.page.evaluate(() => {
      window.caTravelToken = null;
      const probe = new MutationObserver(() => {
        if (window.caTravelToken !== null) return;
        const marker = document.querySelector('[data-map-marker]');
        if (marker === null) return;
        const style = getComputedStyle(marker);
        window.caTravelToken = {
          duration: style.transitionDuration,
          token: style.getPropertyValue('--ca-map-jump-ms').trim(),
        };
      });
      probe.observe(document.body, { childList: true, subtree: true });
    });
    await app.testId('map-jump').click();
    await app.expectScreen('event');
    expect(await app.page.evaluate(() => window.caTravelToken)).toEqual({
      duration: `${String(MARKER_TRAVEL_MS / 1000)}s`,
      token: `${String(MARKER_TRAVEL_MS)}ms`,
    });
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
      deck: SWAP_DECK,
      seed: 7,
    });
    await app.waitForPlacement();
    const tray = (await app.state()).battle.dice.find(
      (d) => d.state === 'tray' && d.defId === SWAP_DIE,
    );
    expect(tray, `the deck must offer a ${SWAP_DIE} in the tray`).toBeDefined();
    if (tray === undefined) return;
    await app.selectDie(tray.uid);
    const swap = app.console('swap');
    await expect(swap).toBeVisible();
    await app.page.evaluate(() => {
      window.caPopProbe = false;
      const node = document.querySelector('[data-testid="console-swap"]');
      if (node === null) return;
      const probe = new MutationObserver(() => {
        if (node.getAttribute('data-pop') === '1') window.caPopProbe = true;
      });
      probe.observe(node, { attributes: true, attributeFilter: ['data-pop'] });
    });
    await swap.click();
    await expect
      .poll(() => app.page.evaluate(() => window.caPopProbe))
      .toBe(true);
  });

  test('a mini-boss reads as an alternate only once another was faced', async ({
    app,
  }) => {
    await app.seedRun({ seed: 7 });
    await app.startBattle({ enemyIds: [MINIBOSS], seed: 7 });
    await expect(app.testId('boss-intro')).toBeVisible();
    await expect(app.page.locator('[data-intro-kind]')).toHaveAttribute(
      'data-intro-kind',
      'miniboss',
    );

    await app.page.evaluate((used: string) => {
      window.caTest?.grantRun({ usedMinibosses: [used] });
    }, OTHER_MINIBOSS);
    await app.startBattle({ enemyIds: [MINIBOSS], seed: 7 });
    await expect(app.testId('boss-intro')).toBeVisible();
    await expect(app.page.locator('[data-intro-kind]')).toHaveAttribute(
      'data-intro-kind',
      'minibossAlt',
    );
  });

  test('the summary lists the dice a run met for the first time', async ({
    app,
  }) => {
    await app.seedRun({ seed: 7 });
    await app.goTo('summary');
    await expect(app.page.locator('[data-first-finds]')).toHaveCount(0);
    await app.summaryFinds(['flare'], 12);
    const line = app.page.locator('[data-first-finds]');
    await expect(line).toBeVisible();
    await expect(line).toHaveAttribute('data-find-shards', '12');
  });
});

test.describe('visual baselines — motion', () => {
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
