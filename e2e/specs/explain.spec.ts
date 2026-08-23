import { expect, test } from '../fixtures';
import type { Screens } from '../screens';

const DECK = ['ember', 'frostplate', 'sprout', 'grey-d4', 'ashen'];

const openBattle = async (
  app: Screens,
  patch: Parameters<Screens['startBattle']>[0] = {},
): Promise<void> => {
  await app.seedRun({ seed: 7 });
  await app.startBattle({
    enemyIds: ['raider'],
    deck: DECK,
    seed: 42,
    hull: 30,
    hullMax: 30,
    ...patch,
  });
  await app.waitForPlacement();
  await app.waitForStableAnchors();
};

test.describe('systems explainers', () => {
  test('the enemy card states the intent in words and its mitigation in numbers', async ({
    app,
  }) => {
    for (const seed of [11, 23, 37]) {
      await openBattle(app, { seed });
      await app.tapEnemy();
      await expect(app.page.locator('[data-enemy-detail]')).toBeVisible();

      const enemyId = (await app.state()).battle.enemies[0]?.id;
      expect(enemyId).toBeDefined();
      if (enemyId === undefined) continue;

      const why = app.page.locator('[data-intent-why]');
      await expect(why).toBeVisible();
      const kind = await why.getAttribute('data-intent-why');
      expect(kind).not.toBeNull();
      expect((await why.innerText()).length).toBeGreaterThan(12);

      const data = await app.mitigation(enemyId);
      expect(data).not.toBeNull();
      if (data === null) continue;
      const math = await app.page.locator('[data-enemy-math]').innerText();
      if (data.raw === 0) {
        expect(math.length).toBeGreaterThan(0);
      } else {
        for (const value of [
          data.raw,
          data.expected,
          data.shield,
          data.hull,
        ]) {
          expect(math, `${String(seed)} · ${kind ?? '?'}`).toContain(
            String(value),
          );
        }
      }
      await app.testId('enemy-detail-close').click();
    }
  });

  test('a status on the enemy is named and explained, not just lettered', async ({
    app,
  }) => {
    await openBattle(app, { enemyIds: ['slagGolem'] });
    await app.tapEnemy();
    await expect(app.page.locator('[data-enemy-detail]')).toBeVisible();
    const subs = app.page.locator('[data-sub-aura]');
    if ((await subs.count()) > 0) {
      await expect(subs.first()).not.toBeEmpty();
    }
  });

  test('the engines and sensors slots carry their formula', async ({ app }) => {
    await openBattle(app);
    await app.testId('slot-why-engines').click();
    const bubble = app.page.locator('[data-tap-popover="slot-why-engines"]');
    await expect(bubble).toBeVisible();
    await expect(bubble).toContainText('6');
    await expect(bubble).toContainText('3');

    await app.page.keyboard.press('Escape');
    await app.testId('slot-why-sensors').click();
    await expect(
      app.page.locator('[data-tap-popover="slot-why-sensors"]'),
    ).toBeVisible();
  });

  test('the charge pill prints the spend table', async ({ app }) => {
    await openBattle(app, { startCharge: 6 });
    await app.testId('charge-why').click();
    const bubble = app.page.locator('[data-tap-popover="charge-why"]');
    await expect(bubble).toBeVisible();
    for (const cost of ['3', '5', '10']) {
      await expect(bubble).toContainText(cost);
    }
  });

  test('the map header carries hull, scrap and a tide explainer', async ({
    app,
  }) => {
    await app.seedRun({ seed: 7 });
    await app.expectScreen('map');

    const state = await app.state();
    await expect(app.page.locator('[data-map-hull]')).toContainText(
      String(state.run.hull),
    );
    await expect(app.page.locator('[data-map-scrap]')).toContainText(
      String(state.run.scrap),
    );

    await app.testId('map-tide').click();
    await expect(app.page.locator('[data-tap-popover="map-tide"]')).toBeVisible();
  });

  test('the codex legend names every status and every die badge', async ({
    app,
  }) => {
    await app.goTo('codex');
    for (const key of ['burn', 'mark', 'jam', 'charge']) {
      await expect(
        app.page.locator(`[data-legend-status="${key}"]`),
      ).toBeVisible();
    }
    for (const badge of ['fate', 'active', 'engraved', 'faces', 'growth', 'prismatic']) {
      await expect(
        app.page.locator(`[data-legend-badge="${badge}"]`),
      ).toBeVisible();
    }
  });

  test('the build sheet keeps the system formulas within reach', async ({
    app,
  }) => {
    await app.seedRun({ seed: 7 });
    await app.expectScreen('map');
    await app.page.locator('[data-open-build]').first().click();
    await expect(app.testId('build-sheet')).toBeVisible();
    for (const id of ['manoeuvre', 'targeting', 'charge', 'mk']) {
      await expect(
        app.page.locator(`[data-system-note="${id}"]`),
      ).toBeVisible();
    }
  });
});
