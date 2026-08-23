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
          const holes = api.holes();
          const record = holes[0];
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
    api.standAt(cfg.record.from);
  }, at);
  await app.expectScreen('map');
};

const openCard = async (app: Screens, at: Seated): Promise<void> => {
  await app.page.locator(`[data-node="${at.record.hole}"]`).click();
  await app.testId('map-jump').click();
  await expect(app.testId('wormhole-card')).toBeVisible();
};

const wormhole = (app: Screens) =>
  app.page.evaluate(() => {
    const api = window.caTest;
    if (api === undefined) throw new Error('caTest is not mounted');
    return api.wormhole();
  });

const mapNodes = (app: Screens) =>
  app.page.evaluate(() => {
    const api = window.caTest;
    if (api === undefined) throw new Error('caTest is not mounted');
    return api.mapNodes();
  });

test.describe('black holes', () => {
  test('the map draws the hole as an unenterable vortex on a wormhole edge', async ({
    app,
  }) => {
    const at = await findHole(app);
    await seat(app, at);
    const hole = app.page.locator(`[data-node="${at.record.hole}"]`);
    await expect(hole).toHaveAttribute('data-node-hole', '1');
    await expect(hole).toHaveAttribute('data-node-type', 'hole');
    const nodes = await mapNodes(app);
    const view = nodes.find((n) => n.id === at.record.hole);
    expect(view?.hole).toBe(true);
    expect(view?.wormhole).toBe(true);
    expect(view?.bypass).toBe(at.record.bypass);
  });

  test('the choice card names both costs and the gentle window', async ({
    app,
  }) => {
    const at = await findHole(app);
    await seat(app, at);
    await openCard(app, at);
    const before = await wormhole(app);
    await expect(app.testId('wormhole-toll')).toHaveAttribute(
      'data-toll',
      String(before.toll),
    );
    await expect(app.testId('wormhole-gentle')).toBeVisible();
    await expect(app.testId('wormhole-bypass')).toBeEnabled();
    await expect(app.testId('wormhole-ride')).toBeEnabled();
    expect(before.gentle).toBe(true);
    expect(before.budgetCap).toBe(2);
  });

  test('going around charges the toll and reroutes to the alternate', async ({
    app,
  }) => {
    const at = await findHole(app);
    await seat(app, at);
    await openCard(app, at);
    const hullBefore = (await app.state()).run.hull;
    const toll = (await wormhole(app)).toll;
    expect(toll).toBeGreaterThan(0);
    await app.testId('wormhole-bypass').click();
    await expect
      .poll(async () => (await app.state()).run.position)
      .toBe(at.record.bypass);
    const after = await app.state();
    expect(after.run.hull).toBe(hullBefore - toll);
    expect((await wormhole(app)).bypassed).toBe(1);
  });

  test('the ride lands inside the rolled budget, half-lane steps included', async ({
    app,
  }) => {
    const at = await findHole(app);
    await seat(app, at);
    const plan = await app.page.evaluate((cfg: Seated) => {
      const api = window.caTest;
      if (api === undefined) throw new Error('caTest is not mounted');
      const origin = api.mapNodes().find((n) => n.id === cfg.record.from);
      const budget = 5;
      const ids = api.landings(budget, 'forward');
      const nodes = api.mapNodes();
      const index = ids.findIndex(
        (id) => nodes.find((n) => n.id === id)?.lane !== origin?.lane,
      );
      return { budget, index, ids, originLane: origin?.lane ?? 0 };
    }, at);
    expect(plan.index).toBeGreaterThanOrEqual(0);

    const roll = await app.page.evaluate(
      ({ cfg, pick, budget }) => {
        const api = window.caTest;
        if (api === undefined) throw new Error('caTest is not mounted');
        api.grantRun({ wormholeRides: 4 });
        api.mockChaos({ ints: [budget, 0], picks: [pick] });
        const value = api.ride(cfg.record.hole);
        api.mockChaos(null);
        return value;
      },
      { cfg: at, pick: plan.index, budget: plan.budget },
    );
    expect(roll).not.toBeNull();
    expect(roll?.budget).toBe(plan.budget);
    expect(roll?.direction).toBe('forward');
    expect(roll?.fallback).toBe('none');
    expect(roll?.cost).toBeLessThanOrEqual(plan.budget);

    const nodes = await mapNodes(app);
    const landed = nodes.find((n) => n.id === roll?.landing);
    expect(landed).toBeDefined();
    expect(landed?.lane).not.toBe(plan.originLane);
    const expected =
      Math.abs(roll?.rows ?? 0) +
      0.5 * Math.abs((landed?.lane ?? 0) - plan.originLane);
    expect(roll?.cost).toBe(expected);
    expect(Number.isInteger(expected * 2)).toBe(true);
  });

  test('past the gentle window a ride can throw the ship backward', async ({
    app,
  }) => {
    const at = await findHole(app);
    await seat(app, at);
    const roll = await app.page.evaluate((cfg: Seated) => {
      const api = window.caTest;
      if (api === undefined) throw new Error('caTest is not mounted');
      api.grantRun({ wormholeRides: 3 });
      api.mockChaos({ ints: [4, 1], picks: [0] });
      const value = api.ride(cfg.record.hole);
      api.mockChaos(null);
      return value;
    }, at);
    expect(roll?.gentle).toBe(false);
    expect(roll?.direction).toBe('backward');
    expect(roll?.rows).toBeLessThan(0);
    const state = await app.state();
    expect(state.run.position).toBe(roll?.landing);
    expect(state.run.visited).not.toContain(roll?.landing);
  });

  test('the gentle window keeps the first two rides short and forward', async ({
    app,
  }) => {
    const at = await findHole(app);
    await seat(app, at);
    const roll = await app.page.evaluate((cfg: Seated) => {
      const api = window.caTest;
      if (api === undefined) throw new Error('caTest is not mounted');
      api.mockChaos({ ints: [5, 1], picks: [0] });
      const value = api.ride(cfg.record.hole);
      api.mockChaos(null);
      return value;
    }, at);
    expect(roll?.gentle).toBe(true);
    expect(roll?.direction).toBe('forward');
    expect(roll?.budget).toBeLessThanOrEqual(2);
    expect(roll?.rows).toBeGreaterThan(0);
  });

  test('an empty candidate set turns the throw around instead of stalling', async ({
    app,
  }) => {
    const at = await findHole(app);
    await seat(app, at);
    const roll = await app.page.evaluate((cfg: Seated) => {
      const api = window.caTest;
      if (api === undefined) throw new Error('caTest is not mounted');
      const origin = api.mapNodes().find((n) => n.id === cfg.record.from);
      const ahead = api
        .mapNodes()
        .filter((n) => n.row > (origin?.row ?? 0))
        .map((n) => n.id);
      api.grantRun({ wormholeRides: 3, visited: ['r0l1', ...ahead] });
      api.mockChaos({ ints: [3, 0], picks: [0] });
      const value = api.ride(cfg.record.hole);
      api.mockChaos(null);
      return value;
    }, at);
    expect(roll?.direction).toBe('forward');
    expect(roll?.fallback).not.toBe('none');
    expect(roll?.fallback).not.toBe('stalled');
    expect(roll?.landing).not.toBeNull();
    expect(roll?.rows).toBeLessThan(0);
  });

  test('a ride never lands on a node the run already cleared', async ({
    app,
  }) => {
    const at = await findHole(app);
    await seat(app, at);
    const result = await app.page.evaluate((cfg: Seated) => {
      const api = window.caTest;
      if (api === undefined) throw new Error('caTest is not mounted');
      const cleared = api
        .landings(5, 'forward')
        .slice(0, 3);
      api.grantRun({ wormholeRides: 3, visited: ['r0l1', ...cleared] });
      api.mockChaos({ ints: [5, 0], picks: [0] });
      const value = api.ride(cfg.record.hole);
      api.mockChaos(null);
      return { cleared, value };
    }, at);
    expect(result.cleared.length).toBeGreaterThan(0);
    expect(result.cleared).not.toContain(result.value?.landing);
  });

  test('a reload in front of the rim reopens the same choice', async ({
    app,
  }) => {
    const at = await findHole(app);
    await seat(app, at);
    await openCard(app, at);
    await app.reboot();
    await expect(app.testId('resume-continue')).toBeVisible();
    await app.testId('resume-continue').click();
    await app.expectScreen('map');
    await expect(app.testId('wormhole-card')).toBeVisible();
    expect((await wormhole(app)).pending).toBe(at.record.hole);
    expect((await app.state()).run.position).toBe(at.record.from);
  });

  test('landing autosaves before the node is entered', async ({ app }) => {
    const at = await findHole(app);
    await seat(app, at);
    const roll = await app.page.evaluate((cfg: Seated) => {
      const api = window.caTest;
      if (api === undefined) throw new Error('caTest is not mounted');
      api.mockChaos({ ints: [2, 0], picks: [0] });
      const value = api.ride(cfg.record.hole);
      api.mockChaos(null);
      return value;
    }, at);
    await app.reboot();
    await app.testId('resume-continue').click();
    await expect
      .poll(async () => (await app.state()).run.position)
      .toBe(roll?.landing);
  });
});
