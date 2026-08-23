import { expect, test } from '../fixtures';
import type { Screens } from '../screens';

const SEED = 7;
const DECK = ['ember', 'frostplate', 'sprout', 'grey-d4', 'ashen'];

const focusInside = async (app: Screens, testId: string): Promise<boolean> => {
  for (let step = 0; step < 12; step += 1) {
    await app.page.keyboard.press('Tab');
  }
  return app.page.evaluate((id) => {
    const dialog = document.querySelector(`[data-testid="${id}"]`);
    const active = document.activeElement;
    return dialog !== null && active !== null && dialog.contains(active);
  }, testId);
};

const openBattle = async (app: Screens): Promise<void> => {
  await app.seedRun({ seed: SEED });
  await app.startBattle({ enemyIds: ['raider'], deck: DECK, seed: 42 });
  await app.waitForPlacement();
};

test.describe('system menu', () => {
  test('opens from the map header and resumes where it left off', async ({
    app,
  }) => {
    await app.seedRun({ seed: SEED });
    await app.expectScreen('map');

    await app.testId('map-system-menu').click();
    await expect(app.testId('system-menu')).toBeVisible();

    await app.testId('system-resume').click();
    await expect(app.testId('system-menu')).toBeHidden();
    await app.expectScreen('map');
  });

  test('hardware back on the map opens the system menu instead of leaving', async ({
    app,
  }) => {
    await app.seedRun({ seed: SEED });
    await app.expectScreen('map');

    await app.hardwareBack();
    await expect(app.testId('system-menu')).toBeVisible();
    await app.expectScreen('map');
    expect((await app.state()).run.active).toBe(true);
  });

  test('reaches the codex from a run and comes back to the map', async ({
    app,
  }) => {
    await app.seedRun({ seed: SEED });
    await app.testId('map-system-menu').click();
    await app.testId('system-codex').click();
    await app.expectScreen('codex');

    await app.testId('app-back').click();
    await app.expectScreen('map');
  });

  test('changes settings mid-battle and returns to the same battle', async ({
    app,
  }) => {
    await openBattle(app);
    const before = await app.state();

    await app.testId('battle-system-menu').click();
    await expect(app.testId('system-menu')).toBeVisible();
    await app.testId('system-settings').click();
    await app.expectScreen('settings');

    await app.testId('settings-sfx').getByRole('slider').press('ArrowLeft');
    await expect
      .poll(() => app.page.evaluate(() => window.caTest?.state().layout))
      .toBe('console');
    await app.testId('layout-tablet').click();
    await expect
      .poll(() => app.page.evaluate(() => window.caTest?.state().layout))
      .toBe('tablet');

    await app.testId('app-back').click();
    await app.waitForPlacement();

    const after = await app.state();
    expect(after.battle.turn).toBe(before.battle.turn);
    expect(after.battle.dice.map((die) => die.value)).toEqual(
      before.battle.dice.map((die) => die.value),
    );
    expect(after.layout).toBe('tablet');
  });

  test('opens the build sheet from the menu and closes it with Escape', async ({
    app,
  }) => {
    await app.seedRun({ seed: SEED });
    await app.testId('map-system-menu').click();
    await app.testId('system-build').click();

    await expect(app.testId('build-sheet')).toBeVisible();
    await expect(app.testId('system-menu')).toBeHidden();

    await app.page.keyboard.press('Escape');
    await expect(app.testId('build-sheet')).toBeHidden();
  });

  test('suspending a run leaves it resumable from the menu', async ({ app }) => {
    await app.seedRun({ seed: SEED });
    const before = await app.state();

    await app.testId('map-system-menu').click();
    await app.testId('system-suspend').click();
    await app.expectScreen('menu');
    await expect(app.testId('resume-continue')).toBeVisible();

    await app.testId('resume-continue').click();
    await app.expectScreen('map');
    expect((await app.state()).run.position).toBe(before.run.position);
  });

  test('abandoning a run from the map footer asks first', async ({ app }) => {
    await app.seedRun({ seed: SEED });
    await app.expectScreen('map');

    await app.testId('map-abandon').click();
    await expect(app.testId('map-abandon-confirm')).toBeVisible();

    await app.testId('map-abandon-cancel').click();
    await expect(app.testId('map-abandon-confirm')).toBeHidden();
    expect((await app.state()).run.active).toBe(true);

    await app.testId('map-abandon').click();
    await app.page.keyboard.press('Escape');
    await expect(app.testId('map-abandon-confirm')).toBeHidden();
    expect((await app.state()).run.active).toBe(true);

    await app.testId('map-abandon').click();
    await app.testId('map-abandon-yes').click();
    await app.expectScreen('menu');
    expect((await app.state()).run.active).toBe(false);
  });

  test('abandoning a run from the menu asks first', async ({ app }) => {
    await app.seedRun({ seed: SEED });
    await app.testId('map-system-menu').click();
    await app.testId('system-abandon').click();
    await expect(app.testId('system-abandon-confirm')).toBeVisible();

    await app.testId('system-abandon-cancel').click();
    await expect(app.testId('system-abandon-confirm')).toBeHidden();
    expect((await app.state()).run.active).toBe(true);

    await app.testId('system-abandon').click();
    await app.testId('system-abandon-yes').click();
    await app.expectScreen('menu');
    expect((await app.state()).run.active).toBe(false);
  });
});

test.describe('modal standard', () => {
  test('the system menu keeps focus inside itself', async ({ app }) => {
    await app.seedRun({ seed: SEED });
    await app.testId('map-system-menu').click();
    await expect(app.testId('system-menu')).toBeVisible();
    expect(await focusInside(app, 'system-menu')).toBe(true);
  });

  test('the build sheet keeps focus inside itself', async ({ app }) => {
    await app.seedRun({ seed: SEED });
    await app.testId('map-system-menu').click();
    await app.testId('system-build').click();
    await expect(app.testId('build-sheet')).toBeVisible();
    expect(await focusInside(app, 'build-sheet')).toBe(true);
  });

  test('the memory ceremony traps focus and takes Escape', async ({ app }) => {
    await app.page.evaluate(() => {
      window.caTest?.showMemory(1);
    });
    await expect(app.testId('memory-ceremony')).toBeVisible();
    expect(await focusInside(app, 'memory-ceremony')).toBe(true);

    await app.page.keyboard.press('Escape');
    await expect(app.testId('memory-ceremony')).toBeHidden();
  });

  test('the boss intro keeps focus inside itself and refuses Escape', async ({
    app,
  }) => {
    await app.seedRun({ seed: SEED });
    await app.startBattle({
      enemyIds: ['quarantineWarden'],
      deck: DECK,
      seed: 42,
    });
    await app.expectScreen('battle');
    await expect(app.testId('boss-intro')).toBeVisible();

    await app.page.keyboard.press('Escape');
    await expect(app.testId('boss-intro')).toBeVisible();
    expect(await focusInside(app, 'boss-intro')).toBe(true);

    await app.testId('boss-intro-begin').click();
    await expect(app.testId('boss-intro')).toBeHidden();
  });
});

test.describe('touch tooltips', () => {
  test('the map module chip answers a tap instead of a hover', async ({
    app,
  }) => {
    await app.seedRun({ seed: SEED });
    await app.page.evaluate(() => {
      window.caTest?.grantRun({ modules: ['solenoid'] });
    });
    await app.expectScreen('map');

    await app.testId('map-modules').click();
    await expect(app.page.locator('[data-tap-popover]')).toBeVisible();

    await app.page.keyboard.press('Escape');
    await expect(app.page.locator('[data-tap-popover]')).toBeHidden();
  });

  test('the axis meter explains itself on a tap', async ({ app }) => {
    await app.seedRun({ seed: SEED });
    await app.expectScreen('map');

    await app.testId('axis-explain').click();
    await expect(app.page.locator('[data-tap-popover]')).toBeVisible();
  });
});
