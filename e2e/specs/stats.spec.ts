import { expect, test } from '../fixtures';

const BATTLE_SEEDS = [7, 11, 13, 17, 19, 23, 29, 31, 37, 41];

test.describe('battle tally', () => {
  test('the tally lands after a battle and matches the recorded stats', async ({
    app,
  }) => {
    const { nodeId } = await app.seedRunWithNode('battle', BATTLE_SEEDS);
    await app.expectScreen('map');
    await app.jumpToNodeInUi(nodeId);
    await app.waitForPlacement();

    const outcome = await app.playUntilBattleEnds();
    expect(outcome).toBe('victory');
    await app.expectScreen('rewards');

    const panel = app.page.locator('[data-battle-tally]');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveAttribute('data-battle-tally', 'win');

    const data = await app.tally();
    expect(data).not.toBeNull();
    if (data === null) return;

    await expect(
      panel.locator('[data-tally-value="turns"]'),
    ).toHaveText(String(data.turns));
    if (data.damageDealt > 0) {
      await expect(
        panel.locator('[data-tally-value="dealt"]'),
      ).toHaveText(String(data.damageDealt));
    }
    if (data.dicePlaced > 0) {
      await expect(
        panel.locator('[data-tally-value="placed"]'),
      ).toHaveText(String(data.dicePlaced));
    }

    await app.clearRewards();
    await app.expectScreen('map');
    expect(await app.tally()).toBeNull();
  });

  test('the skip setting sends the run straight back to the map', async ({
    app,
  }) => {
    await app.page.evaluate(() => {
      window.caTest?.settings({ skipTally: true });
    });
    const { nodeId } = await app.seedRunWithNode('battle', BATTLE_SEEDS);
    await app.expectScreen('map');
    await app.jumpToNodeInUi(nodeId);
    await app.waitForPlacement();
    await app.playUntilBattleEnds();

    if ((await app.state()).screen === 'rewards') {
      await expect(app.page.locator('[data-battle-tally]')).toHaveCount(0);
      await app.clearRewards();
    }
    await app.expectScreen('map');
  });
});

test.describe('expanded stats', () => {
  test('the summary opens a detail block over the run stats', async ({
    app,
  }) => {
    await app.seedRun({ seed: 7 });
    await app.goTo('summary');

    await expect(app.page.locator('[data-summary-detail]')).toHaveCount(0);
    await app.testId('summary-more').click();
    const detail = app.page.locator('[data-summary-detail]');
    await expect(detail).toBeVisible();
    for (const id of [
      'elites',
      'minibosses',
      'bosses',
      'scrapSpent',
      'hullPctMin',
      'dicePlaced',
    ]) {
      await expect(detail.locator(`[data-summary-row="${id}"]`)).toBeVisible();
    }
  });

  test('the profile opens a detail block over the lifetime stats', async ({
    app,
  }) => {
    await app.page.evaluate(() => {
      window.caTest?.grantMeta({
        level: 20,
        stats: { shardsEarned: 400, beacons: 3, t5Solved: 2, driftRuns: 5 },
      });
    });
    await app.goTo('profile');

    await expect(app.page.locator('[data-profile-detail]')).toHaveCount(0);
    await app.testId('profile-more').click();
    const detail = app.page.locator('[data-profile-detail]');
    await expect(detail).toBeVisible();
    for (const id of [
      'shardsEarned',
      't5Solved',
      'beacons',
      'streak',
      'bestStreak',
      'driftRuns',
      'dailyRuns',
      'contractRuns',
    ]) {
      await expect(detail.locator(`[data-profile-row="${id}"]`)).toBeVisible();
    }
    await expect(
      detail.locator('[data-profile-row="shardsEarned"]'),
    ).toContainText('400');
  });
});

test.describe('tag glossary', () => {
  test('the codex lists every tag in the registry', async ({ app }) => {
    await app.goTo('codex');
    const glossary = app.page.locator('[data-tag-glossary]');
    await expect(glossary).toBeVisible();
    for (const tag of ['red', 'weapons', 'swarm', 'overcap', 'precision']) {
      await expect(
        glossary.locator(`[data-glossary-tag="${tag}"]`),
      ).toBeVisible();
    }
    expect(await glossary.locator('[data-glossary-tag]').count()).toBe(31);
  });

  test('a tag chip explains itself on tap', async ({ app }) => {
    await app.seedRun({ seed: 7 });
    await app.expectScreen('map');
    await app.page.locator('[data-open-build]').first().click();
    await expect(app.testId('build-sheet')).toBeVisible();

    const chip = app.page.locator('[data-tag-chip]').first();
    await expect(chip).toBeVisible();
    const tag = await chip.getAttribute('data-tag-chip');
    expect(tag).not.toBeNull();
    await chip.click();
    const bubble = app.page.locator(`[data-tap-popover="tag-${tag ?? ''}"]`);
    await expect(bubble).toBeVisible();
    expect((await bubble.innerText()).length).toBeGreaterThan(12);
  });
});
