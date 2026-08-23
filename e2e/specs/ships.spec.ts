import { expect, test } from '../fixtures';
import type { Screens } from '../screens';
import type { BattleLayoutId } from '@/types';
import type { ShipId } from '@/data/ships';

const SEED = 42;
const ENGINE_DECK = ['sprout', 'sprout', 'green-d4', 'green-d4', 'coil'];
const FORGE_DECK = ['red-d6', 'red-d6', 'red-d6', 'ember', 'frostplate'];
const PRISM_DECK = ['blue-d6', 'blue-d6', 'red-d6', 'ember', 'frostplate'];

const NEW_SHIPS: readonly ShipId[] = ['corsair', 'foundry', 'prism'];

const openBattle = async (
  app: Screens,
  shipId: ShipId,
  deck: readonly string[],
  layout: BattleLayoutId = 'console',
): Promise<void> => {
  await app.setLayout(layout);
  await app.seedRun({ seed: 7, ship: shipId });
  await app.startBattle({
    enemyIds: ['raider'],
    deck: [...deck],
    shipId,
    seed: SEED,
    hull: 40,
    hullMax: 40,
    chargeCap: 60,
    startCharge: 60,
  });
  await app.waitForPlacement();
  await app.waitForStableAnchors();
};

const trayDice = async (app: Screens) =>
  (await app.state()).battle.dice.filter((die) => die.state === 'tray');

const nudgeTo = async (
  app: Screens,
  uid: string,
  target: number,
): Promise<void> => {
  for (let step = 0; step < 12; step += 1) {
    const die = (await app.state()).battle.dice.find((d) => d.uid === uid);
    if (die === undefined || die.value === target) return;
    await app.selectDie(uid);
    await app.console(die.value < target ? 'nudgePlus' : 'nudgeMinus').click();
    await expect
      .poll(
        async () =>
          (await app.state()).battle.dice.find((d) => d.uid === uid)?.value,
      )
      .not.toBe(die.value);
  }
};

const dodgeOf = async (app: Screens, slot: string): Promise<number> => {
  const text = (await app.page.locator(`[data-proj="${slot}"]`).innerText())
    .replace(/\s+/g, ' ');
  const first = /(\d+)/.exec(text);
  return first === null ? 0 : Number(first[1]);
};

test.describe('hangar roster', () => {
  test('six ships render as cards and the new three are gated', async ({
    app,
  }) => {
    await app.goTo('hangar');

    await expect(app.page.locator('[data-ship-card]')).toHaveCount(6);
    for (const ship of NEW_SHIPS) {
      await expect(
        app.page.locator(`[data-ship-locked="${ship}"]`),
      ).toBeVisible();
    }
  });

  test('each new ship can be bought and equipped', async ({ app }) => {
    await app.page.evaluate(() => {
      window.caTest?.grantMeta({
        level: 40,
        shards: 20000,
        achievements: ['spectrumClear'],
      });
    });
    await app.goTo('hangar');

    for (const ship of NEW_SHIPS) {
      await expect(
        app.page.locator(`[data-ship-locked="${ship}"]`),
      ).toHaveCount(0);
      await app.testId(`hangar-ship-${ship}`).click();
      await expect
        .poll(async () => (await app.state()).meta.selectedShip)
        .toBe(ship);
      await expect(app.testId(`hangar-ship-${ship}`)).toBeDisabled();
    }
  });

  test('run setup shows the board of the equipped ship', async ({ app }) => {
    await app.page.evaluate(() => {
      window.caTest?.grantMeta({
        level: 40,
        shards: 20000,
        ships: ['wanderer', 'corsair'],
        selectedShip: 'corsair',
      });
    });
    await app.goTo('runSetup');
    const card = app.page.locator('[data-ship-card="corsair"]');
    await expect(card).toBeVisible();
    await expect(card).toHaveAttribute('data-ship-hull', '30');
    await expect(card).toHaveAttribute(
      'data-ship-slots',
      'weaponA,weaponB,engines,enginesB,sensors,reactor',
    );
  });
});

test.describe('Afterburner (Hound)', () => {
  test('a second engine slot deepens the same manoeuvre', async ({ app }) => {
    await openBattle(app, 'corsair', ENGINE_DECK);
    const dice = await trayDice(app);
    const [first, second] = dice;
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    if (first === undefined || second === undefined) return;

    await app.placeByTap(first.uid, 'engines');
    const alone = await dodgeOf(app, 'engines');
    expect(alone).toBeGreaterThan(0);

    await app.placeByTap(second.uid, 'enginesB');
    const together = await dodgeOf(app, 'enginesB');
    expect(together).toBeGreaterThan(alone);
  });

  test('a dodge pays the next turn in weapons', async ({ app }) => {
    await openBattle(app, 'corsair', ENGINE_DECK);
    const dice = await trayDice(app);
    const [first, second] = dice;
    if (first === undefined || second === undefined) return;
    await nudgeTo(app, first.uid, first.tier);
    await nudgeTo(app, second.uid, second.tier);
    await app.placeByTap(first.uid, 'engines');
    await app.placeByTap(second.uid, 'enginesB');

    await app.testId('battle-end-turn').click();
    await app.waitForPlacement();

    const after = await app.state();
    const evaded = after.battle.attackBeats.reduce(
      (sum, beat) => sum + beat.dodged + beat.glanced,
      0,
    );
    if (evaded === 0) return;
    expect(after.battle.nextWeapons).toBeGreaterThan(0);
    expect(after.battle.nextWeapons).toBeLessThanOrEqual(3);
  });
});

for (const layout of ['console', 'tablet'] as const) {
  test.describe(`Anneal (Forge) — ${layout}`, () => {
    test('two equal tray dice become one bigger die, once', async ({ app }) => {
      await openBattle(app, 'foundry', FORGE_DECK, layout);
      const dice = await trayDice(app);
      const [first, second, third] = dice;
      if (first === undefined || second === undefined) return;
      await nudgeTo(app, second.uid, first.value);

      await app.selectDie(first.uid);
      await app.console('fuse').click();
      await app.tapDie(second.uid);

      await expect
        .poll(async () => (await app.state()).battle.passiveUsed)
        .toBe(true);
      const after = await app.state();
      const fused = after.battle.dice.find((d) => d.temp && d.state === 'tray');
      expect(fused).toBeDefined();
      if (fused === undefined) return;
      expect(fused.tier).toBeGreaterThan(first.tier);
      expect(fused.value).toBe(Math.min(fused.tier, first.value * 2));
      expect(
        after.battle.dice.filter((d) => d.state === 'burned'),
      ).toHaveLength(2);

      if (third !== undefined) {
        await app.selectDie(third.uid);
        await expect(app.console('fuse')).toHaveAttribute(
          'aria-disabled',
          'true',
        );
      }
    });
  });
}

test.describe('Refractor (Prism)', () => {
  test('one die turns prismatic for the turn, once a battle', async ({ app }) => {
    await openBattle(app, 'prism', PRISM_DECK);
    const dice = await trayDice(app);
    const [first, second] = dice;
    if (first === undefined || second === undefined) return;

    await app.selectDie(first.uid);
    await app.console('reschool').click();

    await expect
      .poll(
        async () =>
          (await app.state()).battle.dice.find((d) => d.uid === first.uid)
            ?.school,
      )
      .toBe('prismatic');
    expect((await app.state()).battle.passiveUsed).toBe(true);

    await app.selectDie(second.uid);
    await expect(app.console('reschool')).toHaveAttribute(
      'aria-disabled',
      'true',
    );

    await app.placeByTap(first.uid, 'weaponA');
    await app.testId('battle-end-turn').click();
    await app.waitForPlacement();
    await expect
      .poll(
        async () =>
          (await app.state()).battle.dice.find((d) => d.uid === first.uid)
            ?.school,
      )
      .toBe('blue');
  });
});
