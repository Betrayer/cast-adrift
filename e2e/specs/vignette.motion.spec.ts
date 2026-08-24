import { expect, test } from '../fixtures';
import type { VignetteFlashKind } from '@/services/vignette';

const KINDS: readonly VignetteFlashKind[] = [
  'shieldGain',
  'shieldBreak',
  'hullHit',
  'dodge',
  'glancing',
  'surge',
  'toll',
];

const HEAVY = 'raider';

const PIN_COMPOSITE = `
[data-vignette-pool]{animation:none !important;opacity:0.3 !important}
[data-vignette-rim][data-on='1']{animation:none !important;opacity:0.2 !important}
[data-toast-host]{display:none !important}
`;

test.describe('edge vignette', () => {
  test('every state paints the edge layer', async ({ app }) => {
    await app.goTo('settings');
    const layer = app.page.locator('[data-screen="settings"] [data-vignette]');
    await expect(layer).toBeVisible();
    for (const kind of KINDS) {
      await app.fireVignette(kind);
      await expect(layer).toHaveAttribute('data-vignette-last', kind);
      await expect(
        app.page.locator(
          `[data-screen="settings"] [data-vignette-flash="${kind}"]`,
        ),
      ).toHaveCount(1);
    }
    const view = await app.vignette();
    expect(view.last).toBe('toll');
    expect(view.seq).toBeGreaterThanOrEqual(KINDS.length);
  });

  test('each intensity scales the layer it paints with', async ({ app }) => {
    await app.goTo('settings');
    const layer = app.page.locator('[data-screen="settings"] [data-vignette]');
    const scale = (): Promise<string> =>
      app.page.evaluate(() => {
        const node = document.querySelector(
          '[data-screen="settings"] [data-vignette]',
        );
        if (node === null) return '';
        return getComputedStyle(node).getPropertyValue('--vg-scale').trim();
      });
    await expect(layer).toHaveAttribute('data-vignette-intensity', 'full');
    expect(await scale()).toBe('1');
    await app.setSettings({ vignette: 'subtle' });
    await expect(layer).toHaveAttribute('data-vignette-intensity', 'subtle');
    expect(await scale()).toBe('0.5');
    await app.setSettings({ vignette: 'full' });
  });

  test('the off intensity hides the layer entirely', async ({ app }) => {
    await app.goTo('settings');
    await app.setSettings({ vignette: 'off' });
    const layer = app.page.locator('[data-screen="settings"] [data-vignette]');
    await expect(layer).toHaveAttribute('data-vignette-intensity', 'off');
    await expect(layer).toBeHidden();
    await app.fireVignette('hullHit');
    await expect(layer).not.toHaveAttribute('data-vignette-last', 'hullHit');
    await app.setSettings({ vignette: 'full' });
    await expect(layer).toBeVisible();
  });

  test('visual baselines — vignette composite', async ({ app }) => {
    await app.goTo('settings');
    await app.waitForAuthSettled();
    await app.fireVignette('hullHit', 'left');
    await app.fireVignette('dodge', 'right');
    await app.fireVignette('surge', 'top');
    await app.fireVignette('shieldGain', 'all');
    await app.vignetteRim('shield', true);
    await app.vignetteRim('lowHull', true);
    await app.page.addStyleTag({ content: PIN_COMPOSITE });
    await expect(app.page).toHaveScreenshot('vignette-composite.png');
    await app.vignetteRim('shield', false);
    await app.vignetteRim('lowHull', false);
  });

  test('a hull hit blooms red on the attacker side', async ({ app }) => {
    await app.seedRun({ seed: 3 });
    await app.startBattle({
      enemyIds: [HEAVY],
      seed: 3,
      hull: 40,
      hullMax: 40,
    });
    await app.waitForPlacement();
    const layer = app.page.locator('[data-screen="battle"] [data-vignette]');
    await app.endTurn();
    await expect
      .poll(async () => (await app.vignette()).last, { timeout: 30_000 })
      .toBe('hullHit');
    await expect(layer).toHaveAttribute('data-vignette-last', 'hullHit');
  });

  test('shields raise a rim and losing them shatters it', async ({ app }) => {
    await app.seedRun({ seed: 3 });
    await app.startBattle({
      enemyIds: [HEAVY],
      deck: ['blue-d6', 'blue-d6', 'blue-d6', 'blue-d6', 'blue-d6'],
      seed: 3,
      hull: 40,
      hullMax: 40,
    });
    await app.waitForPlacement();
    const layer = app.page.locator('[data-screen="battle"] [data-vignette]');
    const tray = (await app.state()).battle.dice.find((d) => d.state === 'tray');
    expect(tray).toBeDefined();
    if (tray === undefined) return;
    await app.dragDieToSlot(tray.uid, 'shields');
    await app.endTurn();
    await expect
      .poll(async () => (await app.vignette()).rims.shield, { timeout: 30_000 })
      .toBe(true);
    await expect(layer).toHaveAttribute('data-vignette-shield', '1');
  });

  test('a rim raised while motion is reduced is on screen once it is not', async ({
    app,
  }) => {
    await app.goTo('settings');
    await app.setSettings({ reducedMotion: 'on' });
    await app.vignetteRim('lowHull', true);
    const layer = app.page.locator('[data-screen="settings"] [data-vignette]');
    await expect(layer).toBeHidden();
    await app.setSettings({ reducedMotion: 'off' });
    await expect(layer).toBeVisible();
    await expect(layer).toHaveAttribute('data-vignette-low', '1');
    await app.vignetteRim('lowHull', false);
    await expect(layer).toHaveAttribute('data-vignette-low', '0');
    await app.setSettings({ reducedMotion: 'auto' });
  });

  test('a hull under thirty percent breathes a red rim', async ({ app }) => {
    await app.seedRun({ seed: 3 });
    await app.startBattle({
      enemyIds: [HEAVY],
      seed: 3,
      hull: 40,
      hullMax: 40,
    });
    await app.waitForPlacement();
    expect((await app.vignette()).rims.lowHull).toBe(false);
    await app.startBattle({
      enemyIds: [HEAVY],
      seed: 3,
      hull: 6,
      hullMax: 40,
    });
    await app.waitForPlacement();
    await expect
      .poll(async () => (await app.vignette()).rims.lowHull, { timeout: 30_000 })
      .toBe(true);
    await expect(
      app.page.locator('[data-screen="battle"] [data-vignette]'),
    ).toHaveAttribute('data-vignette-low', '1');
  });
});
