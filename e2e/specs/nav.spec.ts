import { expect, test } from '../fixtures';

const SHOP_SEEDS = [7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59];
const BATTLE_SEEDS = [7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59];
const TEST_DECK = ['green-d4', 'green-d4', 'green-d4', 'green-d4', 'green-d4'];

const DEEP_LINKS: readonly (readonly [string, string])[] = [
  ['play', 'modes'],
  ['daily', 'modes'],
  ['drift', 'modes'],
  ['contracts', 'contracts'],
  ['board', 'leaderboard'],
  ['chart', 'chart'],
  ['hangar', 'hangar'],
  ['codex', 'codex'],
  ['profile', 'profile'],
  ['achievements', 'achievements'],
  ['collection', 'collection'],
  ['engraving', 'engraving'],
  ['settings', 'settings'],
];

test.describe('navigation', () => {
  test('hardware back out of a shop completes the node', async ({ app }) => {
    const { nodeId } = await app.seedRunWithNode('shop', SHOP_SEEDS);
    await app.jumpToNodeInUi(nodeId);
    await app.expectScreen('shop');

    expect((await app.state()).run.visited).not.toContain(nodeId);
    expect((await app.nav()).canBack).toBe(true);

    await app.hardwareBack();
    await app.expectScreen('map');
    expect((await app.state()).run.visited).toContain(nodeId);
  });

  test('hardware back out of a shipyard completes the node', async ({ app }) => {
    const { nodeId } = await app.seedRunWithNode('battle', BATTLE_SEEDS);
    await app.jumpToNodeInUi(nodeId);
    await app.page.evaluate(() => {
      window.caTest?.go('shipyard');
    });
    await app.expectScreen('shipyard');

    expect((await app.state()).run.visited).not.toContain(nodeId);
    await app.hardwareBack();
    await app.expectScreen('map');
    expect((await app.state()).run.visited).toContain(nodeId);
  });

  test('battle refuses every back gesture', async ({ app }) => {
    await app.seedRun({ seed: 7 });
    await app.startBattle({ enemyIds: ['raider'], deck: TEST_DECK, seed: 7 });
    await app.waitForPlacement();
    expect((await app.nav()).canBack).toBe(false);

    await app.hardwareBack();
    await app.expectScreen('battle');

    await app.page.goBack();
    await app.expectScreen('battle');
  });

  test('back restores the params of the screen it returns to', async ({
    app,
  }) => {
    await app.page.evaluate(() => {
      window.caTest?.go('leaderboard', { tab: 'daily' });
    });
    await app.expectScreen('leaderboard');

    await app.testId('board-tabs').locator('label').nth(2).click();
    await expect
      .poll(async () => (await app.state()).params?.tab)
      .toBe('week');

    await app.page.evaluate(() => {
      window.caTest?.go('profile');
    });
    await app.expectScreen('profile');

    await app.hardwareBack();
    await app.expectScreen('leaderboard');
    expect((await app.state()).params?.tab).toBe('week');
  });

  test('the browser back button walks the in-app stack', async ({ app }) => {
    await app.testId('menu-settings').click();
    await app.expectScreen('settings');

    await app.page.goBack();
    await app.expectScreen('menu');
    expect((await app.nav()).stack).toEqual([]);

    await app.page.goForward();
    await app.expectScreen('settings');
  });

  test('a reload keeps a meta screen and its back stack', async ({ app }) => {
    await app.testId('menu-hangar').click();
    await app.expectScreen('hangar');
    await app.testId('hangar-collection').click();
    await app.expectScreen('collection');

    await app.reboot();
    await app.expectScreen('collection');

    await app.hardwareBack();
    await app.expectScreen('hangar');
    await app.hardwareBack();
    await app.expectScreen('menu');
  });

  test('the hangar keeps its unsaved draft across a round trip', async ({
    app,
  }) => {
    await app.page.evaluate(() => {
      window.caTest?.grantMeta({
        shards: 400,
        collection: [{ defId: 'red-d6', count: 4 }],
      });
    });
    await app.testId('menu-hangar').click();
    await app.expectScreen('hangar');

    const draft = app.testId('hangar-draft');
    const before = await draft.innerText();
    await app.testId('hangar-add-red-d6').click();
    await expect(draft).not.toHaveText(before);
    const dirty = await draft.innerText();

    await app.testId('hangar-collection').click();
    await app.expectScreen('collection');
    await app.hardwareBack();
    await app.expectScreen('hangar');

    expect(await draft.innerText()).toBe(dirty);
  });

  test('the collection keeps its filters across a round trip', async ({
    app,
  }) => {
    await app.testId('menu-collection').click();
    await app.expectScreen('collection');

    await app.testId('collection-school').click();
    await app.page.getByRole('option').nth(1).click();
    await expect
      .poll(async () => (await app.state()).params?.school)
      .not.toBeUndefined();
    const school = (await app.state()).params?.school;

    await app.page.evaluate(() => {
      window.caTest?.go('codex');
    });
    await app.expectScreen('codex');
    await app.hardwareBack();
    await app.expectScreen('collection');
    expect((await app.state()).params?.school).toBe(school);
  });

  test('header, browser and hardware back all agree', async ({ app }) => {
    await app.testId('menu-hangar').click();
    await app.expectScreen('hangar');
    await app.testId('app-back').click();
    await app.expectScreen('menu');

    await app.testId('menu-codex').click();
    await app.expectScreen('codex');
    await app.page.goBack();
    await app.expectScreen('menu');

    await app.testId('menu-settings').click();
    await app.expectScreen('settings');
    await app.hardwareBack();
    await app.expectScreen('menu');
  });

  test('a parked screen never shadows the live one', async ({ app }) => {
    await app.testId('menu-hangar').click();
    await app.expectScreen('hangar');
    await app.hardwareBack();
    await app.testId('menu-starChart').click();
    await app.expectScreen('chart');
    await app.hardwareBack();
    await app.expectScreen('menu');

    expect(await app.page.locator('[data-screen]').count()).toBe(1);
    expect(await app.page.locator('[data-parked-screen]').count()).toBe(2);

    await app.seedRun({ seed: 7 });
    await app.startBattle({ enemyIds: ['raider'], deck: TEST_DECK, seed: 7 });
    await app.waitForPlacement();
    expect(await app.page.locator('[data-screen]').count()).toBe(1);
  });

  test('a deep link lands with a working back', async ({ app }) => {
    expect(await app.deepLink('board')).toBe(true);
    await app.expectScreen('leaderboard');
    expect((await app.nav()).canBack).toBe(true);

    await app.hardwareBack();
    await app.expectScreen('modes');
    await app.hardwareBack();
    await app.expectScreen('menu');
  });

  for (const [param, screen] of DEEP_LINKS) {
    test(`the ${param} deep link opens ${screen} with a way out`, async ({
      app,
    }) => {
      expect(await app.deepLink(param)).toBe(true);
      await app.expectScreen(screen);
      expect((await app.nav()).canBack).toBe(true);

      for (let step = 0; step < 4; step += 1) {
        if ((await app.state()).screen === 'menu') break;
        await app.hardwareBack();
      }
      await app.expectScreen('menu');
    });
  }
});
