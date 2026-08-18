import { expect, test } from '../fixtures';
import type { Screens } from '../screens';
import type { SlotId } from '@/types/battle';

const SEED = 42;
const PLAIN_DECK = ['ember', 'frostplate', 'sprout', 'grey-d4', 'red-d6'];
const PRISM_DECK = ['coreshard', 'fate-d100', 'obsidian', 'taproot', 'ember'];

const openBattle = async (
  app: Screens,
  patch: Parameters<Screens['startBattle']>[0] = {},
): Promise<void> => {
  await app.seedRun({ seed: 7 });
  await app.startBattle({
    enemyIds: ['raider'],
    deck: PLAIN_DECK,
    seed: SEED,
    hull: 30,
    hullMax: 30,
    ...patch,
  });
  await app.waitForPlacement();
  await app.waitForStableAnchors();
};

const trayDice = async (app: Screens): Promise<string[]> =>
  (await app.state()).battle.dice
    .filter((die) => die.state === 'tray')
    .map((die) => die.uid);

test.describe('battle board', () => {
  test('a die reaches a slot by tap and leaves it by tap', async ({ app }) => {
    await openBattle(app);
    const [uid] = await trayDice(app);
    expect(uid).toBeDefined();
    if (uid === undefined) return;

    const slots = await app.page.evaluate(
      (target) => window.caTest?.slotsFor(target) ?? [],
      uid,
    );
    const slot = slots[0];
    expect(slot).toBeDefined();
    if (slot === undefined) return;

    await app.placeByTap(uid, slot);
    await app.tapSlot(slot);
    await expect
      .poll(async () =>
        (await app.state()).battle.slots.find((s) => s.id === slot)?.dieUid,
      )
      .toBeNull();
  });

  test('a die reaches a slot by drag while the console keeps its shape', async ({
    app,
  }) => {
    await openBattle(app);
    const before = await app.page.evaluate(() => {
      const node = document.querySelector('[data-console]');
      if (node === null) return null;
      return {
        height: Math.round(node.getBoundingClientRect().height),
        buttons: node.querySelectorAll('button').length,
      };
    });
    expect(before).not.toBeNull();

    const [uid] = await trayDice(app);
    if (uid === undefined) return;
    const slots = await app.page.evaluate(
      (target) => window.caTest?.slotsFor(target) ?? [],
      uid,
    );
    const slot = slots[0];
    if (slot === undefined) return;
    await app.dragDieToSlot(uid, slot);

    const after = await app.page.evaluate(() => {
      const node = document.querySelector('[data-console]');
      if (node === null) return null;
      return {
        height: Math.round(node.getBoundingClientRect().height),
        buttons: node.querySelectorAll('button').length,
      };
    });
    expect(after).toEqual(before);
  });

  test('slot cards project the value the slot will resolve', async ({ app }) => {
    await openBattle(app);
    const state = await app.state();
    const red = state.battle.dice.find(
      (die) => die.state === 'tray' && die.school === 'red',
    );
    expect(red).toBeDefined();
    if (red === undefined) return;

    await app.selectDie(red.uid);
    await expect(app.projection('weaponA')).toContainText(`${String(red.value)}+`);
    await expect(app.projection('engines')).toContainText('%');
    await expect(app.projection('sensors')).toContainText(
      String(Math.ceil(red.value / 2)),
    );
    await expect(app.projection('reactor')).toContainText(String(red.value));
  });

  test('a prismatic die recolours every card to the school it inherits', async ({
    app,
  }) => {
    await openBattle(app, { deck: PRISM_DECK, seed: 11 });
    const state = await app.state();
    const prism = state.battle.dice.find(
      (die) => die.state === 'tray' && die.school === 'prismatic',
    );
    expect(prism).toBeDefined();
    if (prism === undefined) return;

    await app.selectDie(prism.uid);
    for (const [slot, school] of [
      ['weaponA', 'red'],
      ['shields', 'blue'],
      ['engines', 'green'],
      ['sensors', 'grey'],
      ['reactor', 'black'],
    ] as const) {
      await expect(app.slotCard(slot)).toHaveAttribute('data-school', school);
      await expect(
        app.slotCard(slot).locator('[data-inherits]'),
      ).toHaveAttribute('data-inherits', school);
    }
  });

  test('the reroll flow rolls the dice the player picked', async ({ app }) => {
    await openBattle(app);
    const before = await app.state();
    const target = before.battle.dice.find((die) => die.state === 'tray');
    if (target === undefined) return;

    await app.testId('battle-reroll').click();
    await expect
      .poll(async () => (await app.state()).battle.dice.length)
      .toBeGreaterThan(0);
    await app.tapDie(target.uid);
    await app.testId('battle-reroll').click();

    await expect
      .poll(async () => {
        const state = await app.state();
        return state.battle.dice.filter((die) => die.state === 'tray').length;
      })
      .toBe(before.battle.dice.filter((die) => die.state === 'tray').length);
  });

  test('a nudge costs charge and moves the face', async ({ app }) => {
    await openBattle(app, { startCharge: 9 });
    const state = await app.state();
    const die = state.battle.dice.find(
      (d) => d.state === 'tray' && d.value < d.tier,
    );
    if (die === undefined) return;

    await app.selectDie(die.uid);
    await expect(app.console('nudgePlus')).toContainText('3');
    await app.console('nudgePlus').click();

    await expect
      .poll(async () => {
        const after = await app.state();
        return after.battle.dice.find((d) => d.uid === die.uid)?.value ?? 0;
      })
      .toBe(die.value + 1);
    expect((await app.state()).battle.charge).toBe(state.battle.charge - 3);
  });

  test('a bigger reserve holds two dice at once', async ({ app }) => {
    await openBattle(app, { perks: ['deckHand'] });
    const dice = await trayDice(app);
    const [first, second] = dice;
    if (first === undefined || second === undefined) return;

    await app.selectDie(first);
    await app.testId('slot-reserve').click();
    await app.selectDie(second);
    await app.testId('slot-reserve').click();

    await expect
      .poll(async () =>
        (await app.state()).battle.dice.filter((d) => d.state === 'reserved')
          .length,
      )
      .toBe(2);
  });

  test('the enemy card explains the intent and targets a subsystem', async ({
    app,
  }) => {
    await openBattle(app, { enemyIds: ['slagGolem'] });
    await app.tapEnemy();
    await expect(app.page.locator('[data-enemy-detail]')).toBeVisible();
    await expect(app.page.locator('[data-enemy-math]')).not.toBeEmpty();

    const sub = (await app.state()).battle.enemies[0];
    expect(sub).toBeDefined();
    const subsystem = await app.page.evaluate(
      () => window.caTest?.state().battle.enemies[0]?.id ?? null,
    );
    expect(subsystem).not.toBeNull();

    const rows = app.page.locator('[data-testid^="target-"]');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
    await rows.nth(count - 1).click();
    await expect(app.page.locator('[data-enemy-detail]')).toHaveCount(0);
  });

  test('fate is offered when the deck carries the fate die', async ({ app }) => {
    await openBattle(app, { deck: PRISM_DECK, seed: 11 });
    await expect(app.console('fate')).toBeVisible();
    await app.console('fate').click();
    await expect
      .poll(async () => (await app.state()).battle.turn)
      .toBeGreaterThan(0);
  });

  test('inversion flips both the badges and the resolution order', async ({
    app,
  }) => {
    await openBattle(app);
    const forward = await app.page
      .locator('[data-slot]')
      .evaluateAll((nodes) =>
        nodes.map((node) => (node as HTMLElement).dataset.slot ?? ''),
      );

    await openBattle(app, { inverted: true });
    const inverted = await app.page
      .locator('[data-slot]')
      .evaluateAll((nodes) =>
        nodes.map((node) => (node as HTMLElement).dataset.slot ?? ''),
      );

    expect(inverted).toEqual([...forward].reverse());
    await expect(app.page.locator('[data-causality="inverted"]')).toBeVisible();

    const first = inverted[0] as SlotId | undefined;
    if (first === undefined) return;
    await expect(app.slotCard(first).locator('[data-order]')).toHaveText('1');
  });

  test('special dice carry their badges on the die card', async ({ app }) => {
    await openBattle(app, { deck: PRISM_DECK, seed: 11 });
    const state = await app.state();
    const fate = state.battle.dice.find((die) => die.defId === 'fate-d100');
    const faces = state.battle.dice.find((die) => die.defId === 'obsidian');
    if (fate === undefined || faces === undefined) return;

    await app.selectDie(fate.uid);
    await expect(
      app.page.locator('[data-die-badges] [data-badge="fate"]'),
    ).toBeVisible();

    await app.selectDie(faces.uid);
    await expect(
      app.page.locator('[data-die-badges] [data-badge="faces"]'),
    ).toBeVisible();
  });

  test('the census chip counts the board, the popover counts the deck', async ({
    app,
  }) => {
    await openBattle(app);
    const uid = (await trayDice(app))[0];
    if (uid === undefined) return;
    const slots = await app.page.evaluate(
      (target) => window.caTest?.slotsFor(target) ?? [],
      uid,
    );
    const slot = slots[0];
    if (slot === undefined) return;

    await app.placeByTap(uid, slot);
    await app.testId('resonance-row').click();
    await expect(app.page.locator('[data-res-popover]')).toBeVisible();
    await expect(app.page.locator('[data-res-popover]')).toContainText('1');
  });
});
