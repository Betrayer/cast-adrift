import { expect, test } from '../fixtures';

const BATTLE_SEEDS = [7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59];

test.describe('smoke', () => {
  test('boot renders the menu with its entry points', async ({ app }) => {
    await expect(app.testId('menu-newRun')).toBeVisible();
    await expect(app.testId('menu-settings')).toBeVisible();
    await expect(app.testId('menu-starChart')).toBeVisible();
    const state = await app.state();
    expect(state.screen).toBe('menu');
    expect(state.run.active).toBe(false);
  });

  test('a seeded campaign runs map to battle to rewards and back', async ({
    app,
  }) => {
    const { nodeId } = await app.seedRunWithNode('battle', BATTLE_SEEDS);
    await app.expectScreen('map');

    await app.jumpToNodeInUi(nodeId);
    await app.waitForPlacement();

    const before = await app.state();
    const first = before.battle.dice.find((die) => die.state === 'tray');
    expect(first).toBeDefined();
    if (first === undefined) return;

    await app.tapDie(first.uid);
    await expect
      .poll(async () => (await app.state()).battle.selectedDieUid)
      .toBe(first.uid);

    await app.tapDie(first.uid);
    await expect
      .poll(async () => (await app.state()).battle.selectedDieUid)
      .toBeNull();

    const slot = await app.page.evaluate(
      (uid) => window.caTest?.slotsFor(uid)[0] ?? null,
      first.uid,
    );
    expect(slot).not.toBeNull();
    if (slot === null) return;
    await app.dragDieToSlot(first.uid, slot);

    const placed = await app.state();
    expect(
      placed.battle.dice.find((die) => die.uid === first.uid)?.slot,
    ).toBe(slot);

    const outcome = await app.playUntilBattleEnds();
    expect(outcome).toBe('victory');

    if ((await app.state()).screen === 'rewards') {
      await app.clearRewards();
    }
    await app.expectScreen('map');
    expect((await app.state()).run.visited.length).toBeGreaterThan(1);
  });

  test('the shop sells a die and hands the run back to the map', async ({
    app,
  }) => {
    await app.seedRun({ seed: 7 });
    await app.grantRun(400);
    await app.page.evaluate(() => {
      window.caTest?.go('shop');
    });
    await app.expectScreen('shop');

    const before = await app.state();
    await app.testId('shop-buy-0').click();
    await expect(app.testId('shop-item-0')).toHaveAttribute('data-sold', '1');

    const after = await app.state();
    expect(after.run.deck.length).toBe(before.run.deck.length + 1);
    expect(after.run.scrap).toBeLessThan(before.run.scrap);

    await app.testId('shop-leave').click();
    await app.expectScreen('map');
  });

  test('settings switch the language and return to the menu', async ({
    app,
  }) => {
    await app.testId('menu-settings').click();
    await app.expectScreen('settings');

    await app.testId('settings-locale').click();
    await app.page.getByRole('option', { name: 'Русский' }).click();
    await expect
      .poll(async () => (await app.state()).screen)
      .toBe('settings');
    await expect(app.testId('settings-back')).toHaveText('Назад');

    await app.testId('settings-back').click();
    await app.expectScreen('menu');
    await expect(app.testId('menu-settings')).toHaveText('Настройки');
  });

  test('a run survives a reload and resumes from the menu card', async ({
    app,
  }) => {
    const { nodeId } = await app.seedRunWithNode('battle', BATTLE_SEEDS);
    const before = await app.state();

    await app.reboot();
    await app.expectScreen('menu');
    await expect(app.testId('resume-continue')).toBeVisible();

    await app.testId('resume-continue').click();
    await app.expectScreen('map');
    const after = await app.state();
    expect(after.run.seed).toBe(before.run.seed);
    expect(after.run.position).toBe(before.run.position);
    expect(after.run.deck).toEqual(before.run.deck);
    expect(
      (await app.page.locator(`[data-node="${nodeId}"]`).count()) > 0,
    ).toBe(true);
  });
});
