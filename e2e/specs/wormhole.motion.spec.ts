import { expect, test } from '../fixtures';
import type { Screens } from '../screens';
import type { WormholeEdgeView } from '@/services/testApi';

interface Seated {
  seed: number;
  sector: number;
  record: WormholeEdgeView;
}

const SECTORS = [4, 6, 2] as const;
const SEEDS = [1, 2, 3, 5, 7, 11, 13, 17];

const findHole = async (app: Screens): Promise<Seated> => {
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
    { sectors: [...SECTORS], seeds: SEEDS },
  );
  if (found === null) throw new Error('no seed in the probe range holds a hole');
  return found;
};

const seat = async (app: Screens, at: Seated): Promise<void> => {
  await app.page.evaluate((cfg: Seated) => {
    const api = window.caTest;
    if (api === undefined) throw new Error('caTest is not mounted');
    api.seedRun({ seed: cfg.seed, sector: cfg.sector });
    api.mockChaos({ ints: [2, 0], picks: [0] });
    api.standAt(cfg.record.from);
  }, at);
  await app.expectScreen('map');
};

test.describe('wormhole motion', () => {
  test('the throw plays suck, burst and landing before the node opens', async ({
    app,
  }) => {
    const at = await findHole(app);
    await seat(app, at);
    await app.page.locator(`[data-node="${at.record.hole}"]`).click();
    await app.testId('map-jump').click();
    await expect(app.testId('wormhole-card')).toBeVisible();

    await app.testId('wormhole-ride').click();
    await expect(app.page.locator('[data-warp-phase="suck"]')).toBeVisible();
    await expect(app.page.locator('[data-warp]')).toBeVisible();
    await expect(app.page.locator('[data-warp-label]')).toBeVisible();
    await expect(app.testId('wormhole-card')).toHaveCount(0);
    await expect
      .poll(async () => (await app.state()).screen)
      .not.toBe('map');
    await app.page.evaluate(() => {
      window.caTest?.mockChaos(null);
    });
  });

  test('the vortex ring spins on the map', async ({ app }) => {
    const at = await findHole(app);
    await seat(app, at);
    const spinning = await app.page.evaluate((holeId: string) => {
      const group = document.querySelector(`[data-node="${holeId}"]`);
      if (group === null) return null;
      return [...group.querySelectorAll('circle')].some(
        (circle) =>
          getComputedStyle(circle).animationName !== 'none' &&
          getComputedStyle(circle).animationDuration !== '0s',
      );
    }, at.record.hole);
    expect(spinning).toBe(true);
  });
});
