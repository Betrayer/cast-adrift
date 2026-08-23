import { expect, test } from '../fixtures';
import type { Screens } from '../screens';
import type { SlotId } from '@/types/battle';

const SEED = 7;
const TALLY_SEEDS = [7, 11, 13, 17, 19, 23, 29, 31, 37, 41];

const HIDE_TOASTS = '[data-toast-host]{display:none !important}';

const quiet = (app: Screens): Promise<unknown> =>
  app.page.addStyleTag({ content: HIDE_TOASTS });

const shot = async (app: Screens, name: string): Promise<void> => {
  await quiet(app);
  await expect(app.page).toHaveScreenshot(name);
};

const CHECK_SCRIPT: readonly (readonly (readonly [string, SlotId])[])[] = [
  [['die-0', 'engines']],
  [['die-1', 'shields']],
  [['die-2', 'weaponA']],
  [
    ['die-3', 'sensors'],
    ['die-2', 'weaponA'],
  ],
];

const openCheck = async (fresh: Screens, step: number): Promise<void> => {
  await fresh.testId('menu-newRun').click();
  await fresh.walkPrologue();
  for (let i = 1; i < step; i += 1) {
    await fresh.waitForCheckStep(i);
    await fresh.playCheckStep(CHECK_SCRIPT[i - 1] ?? []);
  }
  await fresh.waitForCheckStep(step);
  await fresh.waitForStableAnchors();
};


interface SeatedHole {
  seed: number;
  sector: number;
  record: { from: string; hole: string; bypass: string };
}

const seatHole = async (app: Screens): Promise<SeatedHole> => {
  const found = await app.page.evaluate(() => {
    const api = window.caTest;
    if (api === undefined) throw new Error('caTest is not mounted');
    for (const sector of [4, 6, 2]) {
      for (const seed of [1, 2, 3, 5, 7, 11, 13, 17]) {
        api.seedRun({ seed, sector });
        const record = api.holes()[0];
        if (record !== undefined) return { seed, sector, record };
      }
    }
    return null;
  });
  if (found === null) throw new Error('no seed in the probe range holds a hole');
  await app.page.evaluate((cfg: SeatedHole) => {
    window.caTest?.standAt(cfg.record.from);
  }, found);
  await app.expectScreen('map');
  await app.page
    .locator(`[data-node="${found.record.hole}"]`)
    .scrollIntoViewIfNeeded();
  return found;
};

test.describe('visual baselines', () => {
  test('map with a black hole', async ({ app }) => {
    const at = await seatHole(app);
    await shot(app, 'map-black-hole.png');
    expect(at.record.hole).not.toBe('');
  });

  test('wormhole choice card', async ({ app }) => {
    const at = await seatHole(app);
    await app.page.locator(`[data-node="${at.record.hole}"]`).click();
    await app.testId('map-jump').click();
    await expect(app.testId('wormhole-card')).toBeVisible();
    await shot(app, 'wormhole-card.png');
  });

  test('map after a wormhole throw', async ({ app }) => {
    const at = await seatHole(app);
    await app.page.evaluate((holeId: string) => {
      const api = window.caTest;
      if (api === undefined) throw new Error('caTest is not mounted');
      api.mockChaos({ ints: [3, 0], picks: [0] });
      api.ride(holeId);
      api.mockChaos(null);
    }, at.record.hole);
    await app.expectScreen('map');
    await app.page.locator('[data-node-legal="1"]').first().scrollIntoViewIfNeeded();
    await shot(app, 'wormhole-landing.png');
  });

  test('systems check step 1', async ({ fresh }) => {
    await openCheck(fresh, 1);
    await fresh.selectDie('die-0');
    await shot(fresh, 'check-step-1.png');
  });

  test('systems check step 4', async ({ fresh }) => {
    await openCheck(fresh, 4);
    await fresh.selectDie('die-3');
    await shot(fresh, 'check-step-4.png');
  });

  test('systems check step 5', async ({ fresh }) => {
    await openCheck(fresh, 5);
    await fresh.selectDie('die-4');
    await shot(fresh, 'check-step-5.png');
  });

  test('menu', async ({ app }) => {
    await shot(app, 'menu.png');
  });

  test('map', async ({ app }) => {
    await app.seedRun({ seed: SEED });
    await app.expectScreen('map');
    await shot(app, 'map.png');
  });

  test('battle placement', async ({ app }) => {
    await app.seedRun({ seed: SEED });
    await app.page.evaluate(() => {
      window.caTest?.setBattle({ enemyIds: ['raider'], seed: 42 });
    });
    await app.waitForPlacement();
    await app.waitForStableAnchors();
    await shot(app, 'battle-placement.png');
  });

  test('battle loaded board', async ({ app }) => {
    await app.seedRun({ seed: SEED });
    await app.page.evaluate(() => {
      window.caTest?.setBattle({
        enemyIds: ['raider'],
        deck: ['ember', 'frostplate', 'sprout', 'grey-d4', 'ashen'],
        seed: 42,
        startCharge: 6,
      });
    });
    await app.waitForPlacement();
    await app.waitForStableAnchors();
    const plan = await app.page.evaluate(() => {
      const api = window.caTest;
      if (api === undefined) return [];
      const taken = new Set<string>();
      const moves: { uid: string; slotId: SlotId }[] = [];
      for (const die of api.state().battle.dice) {
        if (die.state !== 'tray') continue;
        const slot = api.slotsFor(die.uid).find((id) => !taken.has(id));
        if (slot === undefined) continue;
        taken.add(slot);
        moves.push({ uid: die.uid, slotId: slot });
      }
      return moves;
    });
    for (const move of plan) await app.placeByTap(move.uid, move.slotId);
    await app.waitForStableAnchors();
    await shot(app, 'battle-loaded.png');
  });

  test('battle boss fight', async ({ app }) => {
    await app.seedRun({ seed: SEED });
    await app.page.evaluate(() => {
      window.caTest?.setBattle({
        enemyIds: ['quarantineWarden'],
        seed: 42,
        hull: 24,
        hullMax: 30,
      });
    });
    await app.waitForPlacement();
    await app.testId('boss-intro-begin').click();
    await app.waitForStableAnchors();
    await shot(app, 'battle-boss.png');
  });

  test('battle prismatic selection', async ({ app }) => {
    await app.seedRun({ seed: SEED });
    await app.page.evaluate(() => {
      window.caTest?.setBattle({
        enemyIds: ['raider'],
        deck: ['coreshard', 'fate-d100', 'obsidian', 'taproot', 'ember'],
        seed: 11,
      });
    });
    await app.waitForPlacement();
    await app.waitForStableAnchors();
    const prism = await app.page.evaluate(
      () =>
        window.caTest
          ?.state()
          .battle.dice.find((die) => die.school === 'prismatic')?.uid ?? null,
    );
    if (prism !== null) await app.selectDie(prism);
    await shot(app, 'battle-prismatic.png');
  });

  test('battle orbit', async ({ app }) => {
    await app.setLayout('orbit');
    await app.seedRun({ seed: SEED });
    await app.page.evaluate(() => {
      window.caTest?.setBattle({
        enemyIds: ['raider'],
        deck: ['ember', 'frostplate', 'sprout', 'grey-d4', 'ashen', 'coreshard'],
        seed: 42,
        startCharge: 6,
      });
    });
    await app.waitForPlacement();
    await app.waitForStableAnchors();
    await shot(app, 'battle-orbit.png');
  });

  test('battle orbit narrow fallback', async ({ app }) => {
    await app.page.setViewportSize({ width: 330, height: 720 });
    await app.setLayout('orbit');
    await app.seedRun({ seed: SEED });
    await app.page.evaluate(() => {
      window.caTest?.setBattle({
        enemyIds: ['raider'],
        deck: ['ember', 'frostplate', 'sprout', 'grey-d4', 'ashen'],
        seed: 42,
      });
    });
    await app.waitForPlacement();
    await app.waitForStableAnchors();
    await shot(app, 'battle-orbit-narrow.png');
  });

  test('battle tablet', async ({ app }) => {
    await app.setLayout('tablet');
    await app.seedRun({ seed: SEED });
    await app.page.evaluate(() => {
      window.caTest?.setBattle({
        enemyIds: ['raider'],
        deck: ['ember', 'frostplate', 'sprout', 'grey-d4', 'ashen', 'coreshard'],
        seed: 42,
        startCharge: 6,
      });
    });
    await app.waitForPlacement();
    await app.waitForStableAnchors();
    await shot(app, 'battle-tablet.png');
  });

  test('battle tablet forecast — taking damage', async ({ app }) => {
    await app.setLayout('tablet');
    await app.seedRun({ seed: SEED });
    await app.page.evaluate(() => {
      window.caTest?.setBattle({
        enemyIds: ['raider'],
        deck: ['ember', 'frostplate', 'sprout', 'grey-d4', 'ashen'],
        seed: 42,
        hull: 6,
        hullMax: 30,
      });
    });
    await app.waitForPlacement();
    await app.waitForStableAnchors();
    await expect(
      app.page.locator('[data-forecast-strip]'),
    ).toHaveAttribute('data-forecast-state', 'lethal');
    await shot(app, 'battle-tablet-lethal.png');
  });

  test('battle tablet forecast — clearing the field', async ({ app }) => {
    await app.setLayout('tablet');
    await app.seedRun({ seed: SEED });
    await app.page.evaluate(() => {
      window.caTest?.setBattle({
        enemyIds: ['sparkMote'],
        deck: ['ember', 'frostplate', 'sprout', 'grey-d4', 'ashen'],
        seed: 42,
      });
    });
    await app.waitForPlacement();
    await app.waitForStableAnchors();
    await app.placeTurn();
    await app.waitForStableAnchors();
    await expect(
      app.page.locator('[data-forecast-strip]'),
    ).toHaveAttribute('data-forecast-state', 'clear');
    await shot(app, 'battle-tablet-clear.png');
  });

  test('shop', async ({ app }) => {
    await app.seedRun({ seed: SEED });
    await app.grantRun(400);
    await app.page.evaluate(() => {
      window.caTest?.go('shop');
    });
    await app.expectScreen('shop');
    await shot(app, 'shop.png');
  });

  test('star chart', async ({ app }) => {
    await app.page.evaluate(() => {
      window.caTest?.grantMeta({ level: 8, shards: 250 });
    });
    await app.testId('menu-starChart').click();
    await app.expectScreen('chart');
    await shot(app, 'chart.png');
  });

  test('settings', async ({ app }) => {
    await app.testId('menu-settings').click();
    await app.expectScreen('settings');
    await app.waitForAuthSettled();
    await shot(app, 'settings.png');
  });

  test('header — hangar', async ({ app }) => {
    await app.testId('menu-hangar').click();
    await app.expectScreen('hangar');
    await shot(app, 'header-hangar.png');
  });

  test('header — collection', async ({ app }) => {
    await app.testId('menu-collection').click();
    await app.expectScreen('collection');
    await shot(app, 'header-collection.png');
  });

  test('header — codex', async ({ app }) => {
    await app.testId('menu-codex').click();
    await app.expectScreen('codex');
    await shot(app, 'header-codex.png');
  });

  test('header — profile', async ({ app }) => {
    await app.page.evaluate(() => {
      window.caTest?.grantMeta({ level: 8, shards: 250 });
    });
    await app.testId('menu-profile').click();
    await app.expectScreen('profile');
    await shot(app, 'header-profile.png');
  });

  test('header — achievements', async ({ app }) => {
    await app.testId('menu-achievements').click();
    await app.expectScreen('achievements');
    await shot(app, 'header-achievements.png');
  });

  test('header — leaderboard', async ({ app }) => {
    await app.page.evaluate(() => {
      window.caTest?.go('leaderboard', { tab: 'drift' });
    });
    await app.expectScreen('leaderboard');
    await expect(app.testId('board-tabs')).toBeVisible();
    await shot(app, 'header-leaderboard.png');
  });

  test('system menu', async ({ app }) => {
    await app.seedRun({ seed: SEED });
    await app.expectScreen('map');
    await app.testId('map-system-menu').click();
    await expect(app.testId('system-menu')).toBeVisible();
    await shot(app, 'system-menu.png');
  });

  test('memory ceremony', async ({ app }) => {
    await app.page.evaluate(() => {
      window.caTest?.showMemory(1);
    });
    await expect(app.testId('memory-ceremony')).toBeVisible();
    await shot(app, 'memory-ceremony.png');
  });

  test('die card', async ({ app }) => {
    await app.page.evaluate(() => {
      window.caTest?.grantMeta({
        level: 30,
        collection: [{ defId: 'flare', count: 2 }],
      });
    });
    await app.goTo('hangar');
    await app.testId('hangar-card-flare').click();
    await expect(app.testId('die-card-modal')).toBeVisible();
    await quiet(app);
    await expect(app.testId('die-card-modal')).toHaveScreenshot('die-card.png');
  });

  test('ship card', async ({ app }) => {
    await app.page.evaluate(() => {
      window.caTest?.grantMeta({ level: 30, shards: 4000 });
    });
    await app.goTo('runSetup');
    await expect(app.page.locator('[data-ship-card="wanderer"]')).toBeVisible();
    await quiet(app);
    await expect(
      app.page.locator('[data-ship-card="wanderer"]'),
    ).toHaveScreenshot('ship-card.png');
  });

  test('enemy detail', async ({ app }) => {
    await app.seedRun({ seed: SEED });
    await app.page.evaluate(() => {
      window.caTest?.setBattle({ enemyIds: ['slagGolem'], seed: 42 });
    });
    await app.waitForPlacement();
    await app.waitForStableAnchors();
    await app.tapEnemy();
    await expect(app.page.locator('[data-enemy-detail]')).toBeVisible();
    await quiet(app);
    await expect(app.page.locator('[data-enemy-detail]')).toHaveScreenshot(
      'enemy-detail.png',
    );
  });

  test('battle tally', async ({ app }) => {
    const { nodeId } = await app.seedRunWithNode('battle', TALLY_SEEDS);
    await app.expectScreen('map');
    await app.jumpToNodeInUi(nodeId);
    await app.waitForPlacement();
    await app.playUntilBattleEnds();
    await app.expectScreen('rewards');
    await expect(app.page.locator('[data-battle-tally]')).toBeVisible();
    await quiet(app);
    await expect(app.page.locator('[data-battle-tally]')).toHaveScreenshot(
      'battle-tally.png',
    );
  });

  test('summary expanded', async ({ app }) => {
    await app.seedRun({ seed: SEED });
    await app.goTo('summary');
    await app.testId('summary-more').click();
    await expect(app.page.locator('[data-summary-detail]')).toBeVisible();
    await shot(app, 'summary-expanded.png');
  });

  test('account section', async ({ app }) => {
    await app.testId('menu-settings').click();
    await app.expectScreen('settings');
    await app.waitForAuthSettled();
    await quiet(app);
    await expect(app.testId('account-section')).toHaveScreenshot('account.png');
  });
});
