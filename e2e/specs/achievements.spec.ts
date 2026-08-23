import { expect, test } from '../fixtures';
import type { Screens } from '../screens';

const HOLE_SECTORS = [4, 6, 2];
const HOLE_SEEDS = [1, 2, 3, 5, 7, 11, 13, 17];

interface SeatedHole {
  seed: number;
  sector: number;
  record: { from: string; hole: string; bypass: string };
}

const seatHole = async (app: Screens): Promise<SeatedHole> => {
  const found = await app.page.evaluate(
    ({ sectors, seeds }) => {
      const api = window.caTest;
      if (api === undefined) throw new Error('caTest is not mounted');
      for (const sector of sectors) {
        for (const seed of seeds) {
          api.seedRun({ seed, sector });
          const record = api.holes()[0];
          if (record !== undefined) return { seed, sector, record };
        }
      }
      return null;
    },
    { sectors: HOLE_SECTORS, seeds: HOLE_SEEDS },
  );
  if (found === null) throw new Error('no seed in the probe range holds a hole');
  await app.page.evaluate((cfg: SeatedHole) => {
    window.caTest?.standAt(cfg.record.from);
  }, found);
  await app.expectScreen('map');
  return found;
};

const openAchievements = async (app: Screens): Promise<void> => {
  await app.goTo('achievements');
  await expect(app.page.locator('[data-achievement-group="combat"]')).toBeVisible();
};

test.describe('achievement families', () => {
  test('a tier-up mid-run toasts and lands in the journal', async ({ app }) => {
    await app.grantStats({ wormholeRides: 9 });
    const at = await seatHole(app);
    await app.page.evaluate((holeId: string) => {
      window.caTest?.mockChaos({ ints: [1, 0], picks: [0] });
      window.caTest?.ride(holeId);
    }, at.record.hole);

    const toast = app.page.locator('[data-toast="achievement"]');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('II');

    const earned = (await app.achievements()).earned;
    expect(earned).toContain('voidRider-1');
    expect(earned).toContain('voidRider-2');

    await app.goTo('journal');
    await expect(
      app.page.locator('[data-journal-entry="achievement"]').first(),
    ).toBeVisible();
  });

  test('the screen groups every family and tracks progress live', async ({
    app,
  }) => {
    await openAchievements(app);
    for (const group of [
      'combat',
      'economy',
      'puzzles',
      'story',
      'collection',
      'modes',
    ]) {
      await expect(
        app.page.locator(`[data-achievement-group="${group}"]`),
      ).toBeVisible();
    }

    const row = app.page.locator('[data-achievement="bounty"]');
    await expect(row).toHaveAttribute('data-achievement-state', 'locked');
    await expect(row.locator('[data-pip="bounty-1"]')).toHaveAttribute(
      'data-pip-state',
      'open',
    );

    await app.grantStats({ kills: 6 });
    await app.settleAchievements();

    await expect(row.locator('[data-pip="bounty-1"]')).toHaveAttribute(
      'data-pip-state',
      'done',
    );
    await expect(row.locator('[data-pip="bounty-2"]')).toHaveAttribute(
      'data-pip-state',
      'open',
    );
    await expect(app.page.locator('[data-achievement-count]')).toContainText('1');
  });

  test('the menu badge counts unseen achievements and clears on the way out', async ({
    app,
  }) => {
    await app.grantStats({ kills: 6 });
    await app.settleAchievements();
    expect((await app.achievements()).unseen).toBe(1);
    await expect(app.page.locator('[data-unseen-achievements]')).toHaveText('1');

    await openAchievements(app);
    await app.hardwareBack();
    await app.expectScreen('menu');
    expect((await app.achievements()).unseen).toBe(0);
    await expect(app.page.locator('[data-unseen-achievements]')).toHaveCount(0);
  });

  test('the profile summary links to the screen', async ({ app }) => {
    await app.goTo('profile');
    await expect(app.page.locator('[data-achievement-closest]')).toBeVisible();
    await app.testId('profile-achievements').click();
    await app.expectScreen('achievements');
  });
});

test.describe('legendary vouchers', () => {
  test('the ceremony banks the voucher when the player takes it', async ({
    app,
  }) => {
    await app.grantStats({ kills: 500 });
    await app.settleAchievements();

    const ceremony = app.testId('voucher-ceremony');
    await expect(ceremony).toBeVisible();
    await expect(
      app.page.locator('[data-voucher-offer="bounty-6"]'),
    ).toBeVisible();

    await app.testId('voucher-take').click();
    await expect(ceremony).toBeHidden();
    const view = await app.achievements();
    expect(view.vouchers).toBe(1);
    expect(view.offers).toEqual([]);
  });

  test('the ceremony pays the shard pile when the player refuses', async ({
    app,
  }) => {
    await app.grantStats({ kills: 500 });
    await app.settleAchievements();
    const before = (await app.state()).meta.shards;

    await expect(app.testId('voucher-ceremony')).toBeVisible();
    await app.testId('voucher-shards').click();
    await expect(app.testId('voucher-ceremony')).toBeHidden();

    const view = await app.achievements();
    expect(view.vouchers).toBe(0);
    expect((await app.state()).meta.shards).toBeGreaterThan(before);
  });

  test('a banked voucher buys a perk draft before the first jump', async ({
    app,
  }) => {
    await app.grantStats({ kills: 500 });
    await app.settleAchievements();
    await app.testId('voucher-take').click();
    expect((await app.achievements()).vouchers).toBe(1);

    await app.goTo('runSetup');
    await expect(app.testId('setup-voucher')).toBeVisible();
    await app.testId('setup-voucher-toggle').click();
    await app.testId('setup-launch').click();

    await app.expectScreen('interstitial');
    expect((await app.achievements()).vouchers).toBe(0);
    await app.testId('interstitial-enter').click();

    await app.expectScreen('rewards');
    const card = app.page.locator('[data-perk]').first();
    await expect(card).toBeVisible();
    const perkId = await card.getAttribute('data-perk');
    await app.testId('reward-perk-pick-0').click();
    await app.expectScreen('map');

    await app.page.locator('[data-open-build]').click();
    await expect(app.testId('build-sheet')).toBeVisible();
    await expect(
      app.page.locator(`[data-build-perk="${perkId ?? ''}"]`),
    ).toBeVisible();
  });

  test('the launch button leaves the voucher alone when the toggle is off', async ({
    app,
  }) => {
    await app.grantStats({ kills: 500 });
    await app.settleAchievements();
    await app.testId('voucher-take').click();

    await app.goTo('runSetup');
    await app.testId('setup-launch').click();
    await app.expectScreen('interstitial');
    expect((await app.achievements()).vouchers).toBe(1);
    await app.testId('interstitial-enter').click();
    await app.expectScreen('map');
  });
});

test.describe('achievement migration', () => {
  test('a pre-P10 profile keeps every earned achievement as a family tier', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'ca.meta',
        JSON.stringify({
          version: 13,
          state: {
            shards: 500,
            achievements: [
              'firstBlood',
              'hunter',
              'eliteHunter',
              'ironStreak',
              'scrapper',
              'tycoon',
              'cryptographer',
              'tierFive',
              'outfitter',
              'puzzleBreadth',
              'fiftyFound',
              'archivist',
              'contractor',
              'flawless',
            ],
            achievementsSeen: ['firstBlood'],
            stats: { kills: 700, prologueDone: true, systemsCheckDone: true },
          },
        }),
      );
    });
    await page.goto('/');
    await page.waitForFunction(() => window.caTest !== undefined, null, {
      timeout: 30_000,
    });

    const view = await page.evaluate(() => {
      const api = window.caTest;
      if (api === undefined) throw new Error('caTest is not mounted');
      return api.achievements();
    });
    for (const id of [
      'bounty-3',
      'bounty-6',
      'eliteHunt-2',
      'deathless-2',
      'scrapBaron-1',
      'scrapBaron-2',
      'tierFive-3',
      'tierFive-1',
      'outfitter-1',
      'puzzleBreadth-2',
      'fiftyFound-2',
      'archivist-2',
      'contractor-2',
      'flawless',
    ]) {
      expect(view.earned, id).toContain(id);
    }
    expect(view.earned).toHaveLength(14);
    expect(view.vouchers).toBe(0);
  });
});
