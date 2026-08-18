import { expect, test } from '../fixtures';
import type { Screens } from '../screens';
import type { BattleLayoutId } from '@/types';
import type { SlotId } from '@/types/battle';

const SEED = 42;
const PLAIN_DECK = ['ember', 'frostplate', 'sprout', 'grey-d4', 'red-d6'];
const ACTIVE_DECK = ['pivot', 'mimic', 'chaff', 'ember', 'frostplate'];
const PRISM_DECK = ['coreshard', 'fate-d100', 'obsidian', 'taproot', 'ember'];

const LAYOUTS: readonly BattleLayoutId[] = ['console', 'orbit', 'tablet'];

const openBattle = async (
  app: Screens,
  layout: BattleLayoutId,
  patch: Parameters<Screens['startBattle']>[0] = {},
): Promise<void> => {
  await app.setLayout(layout);
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

const firstLegalSlot = async (
  app: Screens,
  uid: string,
): Promise<SlotId | undefined> => {
  const slots = await app.page.evaluate(
    (target) => window.caTest?.slotsFor(target) ?? [],
    uid,
  );
  return slots[0];
};

for (const layout of LAYOUTS) {
  test.describe(`battle parity — ${layout}`, () => {
    test('the layout it renders is the layout it was told to', async ({
      app,
    }) => {
      await openBattle(app, layout);
      expect((await app.state()).layout).toBe(layout);
      await expect(app.page.locator(`[data-layout="${layout}"]`)).toBeVisible();
    });

    test('a die reaches a slot by tap and leaves it by tap', async ({ app }) => {
      await openBattle(app, layout);
      const [uid] = await trayDice(app);
      if (uid === undefined) return;
      const slot = await firstLegalSlot(app, uid);
      if (slot === undefined) return;

      await app.placeByTap(uid, slot);
      await app.tapSlot(slot);
      await expect
        .poll(async () =>
          (await app.state()).battle.slots.find((s) => s.id === slot)?.dieUid,
        )
        .toBeNull();
    });

    test('a die reaches a slot by drag', async ({ app }) => {
      await openBattle(app, layout);
      const [uid] = await trayDice(app);
      if (uid === undefined) return;
      const slot = await firstLegalSlot(app, uid);
      if (slot === undefined) return;
      await app.dragDieToSlot(uid, slot);
      expect(
        (await app.state()).battle.slots.find((s) => s.id === slot)?.dieUid,
      ).toBe(uid);
    });

    test('every legal card carries a projection', async ({ app }) => {
      await openBattle(app, layout);
      const state = await app.state();
      const red = state.battle.dice.find(
        (die) => die.state === 'tray' && die.school === 'red',
      );
      if (red === undefined) return;
      await app.selectDie(red.uid);
      await expect(app.projection('weaponA')).not.toBeEmpty();
      await expect(app.projection('reactor')).not.toBeEmpty();
    });

    test('the reroll flow keeps the tray whole', async ({ app }) => {
      await openBattle(app, layout);
      const before = await app.state();
      const target = before.battle.dice.find((die) => die.state === 'tray');
      if (target === undefined) return;

      await app.testId('battle-reroll').click();
      await app.tapDie(target.uid);
      await app.testId('battle-reroll').click();

      await expect
        .poll(async () =>
          (await app.state()).battle.dice.filter((d) => d.state === 'tray')
            .length,
        )
        .toBe(before.battle.dice.filter((d) => d.state === 'tray').length);
    });

    test('a nudge costs charge and moves the face', async ({ app }) => {
      await openBattle(app, layout, { startCharge: 9 });
      const state = await app.state();
      const die = state.battle.dice.find(
        (d) => d.state === 'tray' && d.value < d.tier,
      );
      if (die === undefined) return;

      await app.selectDie(die.uid);
      await app.console('nudgePlus').click();
      await expect
        .poll(
          async () =>
            (await app.state()).battle.dice.find((d) => d.uid === die.uid)
              ?.value ?? 0,
        )
        .toBe(die.value + 1);
      expect((await app.state()).battle.charge).toBe(state.battle.charge - 3);
    });

    test('a bigger reserve holds two dice at once', async ({ app }) => {
      await openBattle(app, layout, { perks: ['deckHand'] });
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

    test('flip, swap and split all reach the board', async ({ app }) => {
      await openBattle(app, layout, { deck: ACTIVE_DECK, seed: 11 });
      const state = await app.state();
      const flip = state.battle.dice.find((d) => d.defId === 'pivot');
      const swap = state.battle.dice.find((d) => d.defId === 'mimic');
      const split = state.battle.dice.find((d) => d.defId === 'chaff');
      if (flip === undefined || swap === undefined || split === undefined) {
        return;
      }

      await app.selectDie(flip.uid);
      await app.console('flip').click();
      await expect
        .poll(
          async () =>
            (await app.state()).battle.dice.find((d) => d.uid === flip.uid)
              ?.value ?? 0,
        )
        .toBe(flip.tier + 1 - flip.value);

      await app.selectDie(swap.uid);
      await app.console('swap').click();
      await expect(app.console('swap')).toBeVisible();
      await app.console('swap').click();

      const before = (await app.state()).battle.dice.length;
      await app.selectDie(split.uid);
      await app.console('split').click();
      await expect
        .poll(async () => (await app.state()).battle.dice.length)
        .toBeGreaterThan(before);
    });

    test('a special die still explains itself on the die card', async ({
      app,
    }) => {
      await openBattle(app, layout, { deck: PRISM_DECK, seed: 11 });
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

    test('the enemy card explains the intent and targets a subsystem', async ({
      app,
    }) => {
      await openBattle(app, layout, { enemyIds: ['slagGolem'] });
      await app.tapEnemy();
      await expect(app.page.locator('[data-enemy-detail]')).toBeVisible();
      await expect(app.page.locator('[data-enemy-math]')).not.toBeEmpty();
      const rows = app.page.locator('[data-testid^="target-"]');
      const count = await rows.count();
      expect(count).toBeGreaterThan(0);
      await rows.nth(count - 1).click();
      await expect(app.page.locator('[data-enemy-detail]')).toHaveCount(0);
    });

    test('fate is offered when the deck carries the fate die', async ({
      app,
    }) => {
      await openBattle(app, layout, { deck: PRISM_DECK, seed: 11 });
      await expect(app.console('fate')).toBeVisible();
      await app.console('fate').click();
      await expect
        .poll(async () => (await app.state()).battle.turn)
        .toBeGreaterThan(0);
    });

    test('inversion flips the badges and the order', async ({ app }) => {
      await openBattle(app, layout);
      const forward = await app.page
        .locator('[data-slot]')
        .evaluateAll((nodes) =>
          nodes.map((node) => (node as HTMLElement).dataset.slot ?? ''),
        );

      await openBattle(app, layout, { inverted: true });
      const inverted = await app.page
        .locator('[data-slot]')
        .evaluateAll((nodes) =>
          nodes.map((node) => (node as HTMLElement).dataset.slot ?? ''),
        );

      expect(inverted).toEqual([...forward].reverse());
      await expect(
        app.page.locator('[data-causality="inverted"]'),
      ).toBeVisible();
      const first = inverted[0] as SlotId | undefined;
      if (first === undefined) return;
      await expect(app.slotCard(first).locator('[data-order]')).toHaveText('1');
    });

    test('a whole turn resolves and the beats land', async ({ app }) => {
      await openBattle(app, layout);
      const before = await app.state();
      await app.playTurn();
      await app.page.waitForFunction(
        (turn) => (window.caTest?.state().battle.turn ?? 0) > turn,
        before.battle.turn,
        { timeout: 30_000 },
      );
      const after = await app.state();
      expect(after.battle.turn).toBeGreaterThan(before.battle.turn);
      expect(after.battle.attackBeats.length).toBeGreaterThan(0);
      await expect(
        app.page.locator(`[data-layout="${layout}"]`),
      ).toBeVisible();
    });

    test('a boss opens with its intro over the board', async ({ app }) => {
      await openBattle(app, layout, { enemyIds: ['quarantineWarden'] });
      await expect(app.testId('boss-intro-begin')).toBeVisible();
      await app.testId('boss-intro-begin').click();
      await expect(app.testId('boss-intro-begin')).toHaveCount(0);
      await app.waitForStableAnchors();
      await expect(app.page.locator(`[data-layout="${layout}"]`)).toBeVisible();
    });
  });
}

test.describe('layout switching', () => {
  test('a mid-battle switch keeps the whole battle state', async ({ app }) => {
    await openBattle(app, 'console', { startCharge: 7 });
    const [uid] = await trayDice(app);
    if (uid === undefined) return;
    const slot = await firstLegalSlot(app, uid);
    if (slot === undefined) return;
    await app.placeByTap(uid, slot);
    const before = await app.state();

    for (const next of ['orbit', 'tablet', 'console'] as const) {
      await app.setLayout(next);
      await expect(app.page.locator(`[data-layout="${next}"]`)).toBeVisible();
      await app.waitForStableAnchors();
      const after = await app.state();
      expect(after.layout).toBe(next);
      expect(after.battle.turn).toBe(before.battle.turn);
      expect(after.battle.hull).toBe(before.battle.hull);
      expect(after.battle.charge).toBe(before.battle.charge);
      expect(
        after.battle.slots.find((s) => s.id === slot)?.dieUid,
      ).toBe(uid);
      expect(after.battle.dice.map((d) => d.uid).sort()).toEqual(
        before.battle.dice.map((d) => d.uid).sort(),
      );
    }
  });

  test('the settings picker applies instantly and badges the current mode', async ({
    app,
  }) => {
    await app.page.evaluate(() => {
      window.caTest?.go('settings');
    });
    await app.expectScreen('settings');
    await expect(app.testId('layout-console')).toHaveAttribute(
      'data-active',
      '1',
    );
    await app.testId('layout-tablet').click();
    await expect(app.testId('layout-tablet')).toHaveAttribute(
      'data-active',
      '1',
    );
    expect((await app.state()).layout).toBe('tablet');

    await openBattle(app, 'tablet');
    await expect(app.page.locator('[data-layout="tablet"]')).toBeVisible();
  });

  test('the first battle after the update points at the setting', async ({
    app,
  }) => {
    await app.page.evaluate(() => {
      window.caTest?.go('settings');
    });
    await app.expectScreen('settings');
    await app.testId('settings-tutorial-reset').click();

    await openBattle(app, 'console');
    await expect(app.page.locator('[data-toast="hint"]')).toBeVisible();
    await expect(app.page.locator('[data-toast="hint"]')).toContainText(
      'Settings',
    );
  });

  test('every mode is previewed from real components', async ({ app }) => {
    await app.page.evaluate(() => {
      window.caTest?.go('settings');
    });
    await app.expectScreen('settings');
    for (const layout of LAYOUTS) {
      await expect(
        app.page.locator(`[data-layout-preview="${layout}"]`),
      ).toBeVisible();
    }
  });
});

test.describe('orbit specifics', () => {
  test('the silhouette takes the incoming hit', async ({ app }) => {
    await app.page.setViewportSize({ width: 420, height: 820 });
    await openBattle(app, 'orbit');
    await expect(app.page.locator('[data-ship]')).toBeVisible();
    const before = await app.state();
    await app.playTurn();
    await app.page.waitForFunction(
      (turn) => (window.caTest?.state().battle.turn ?? 0) > turn,
      before.battle.turn,
      { timeout: 30_000 },
    );
    const after = await app.state();
    expect(after.battle.attackBeats.length).toBeGreaterThan(0);
  });

  test('the radial menu opens at the die and never covers it', async ({
    app,
  }) => {
    await app.page.setViewportSize({ width: 420, height: 820 });
    await openBattle(app, 'orbit');
    await expect(app.page.locator('[data-radial] button')).toHaveCount(0);
    const [uid] = await trayDice(app);
    if (uid === undefined) return;
    await app.selectDie(uid);
    const buttons = app.page.locator('[data-radial] button');
    await expect(buttons).toHaveCount(4);

    const die = await app.page.evaluate(
      (target) =>
        window.caTest?.anchors()?.dice.find((d) => d.uid === target) ?? null,
      uid,
    );
    if (die === null) return;
    const boxes = await buttons.evaluateAll((nodes) =>
      nodes.map((node) => node.getBoundingClientRect()),
    );
    for (const box of boxes) {
      const overlapsDie =
        box.x < die.x + die.size / 2 &&
        box.x + box.width > die.x - die.size / 2 &&
        box.y < die.y + die.size / 2 &&
        box.y + box.height > die.y - die.size / 2;
      expect(overlapsDie).toBe(false);
    }
  });

  test('a narrow board degrades to the console dock', async ({ app }) => {
    await app.page.setViewportSize({ width: 330, height: 720 });
    await openBattle(app, 'orbit');
    await expect(app.page.locator('[data-arc-fallback="1"]')).toBeVisible();
    await expect(app.page.locator('[data-arc]')).toHaveCount(0);
    const [first] = await trayDice(app);
    if (first !== undefined) {
      await app.selectDie(first);
      await expect(app.page.locator('[data-radial] button')).toHaveCount(0);
    }
    const [uid] = await trayDice(app);
    if (uid === undefined) return;
    const slot = await firstLegalSlot(app, uid);
    if (slot === undefined) return;
    await app.placeByTap(uid, slot);
    expect(
      (await app.state()).battle.slots.find((s) => s.id === slot)?.dieUid,
    ).toBe(uid);
  });
});

test.describe('tablet specifics', () => {
  test('the forecast strip states what the turn costs', async ({ app }) => {
    await openBattle(app, 'tablet');
    const strip = app.page.locator('[data-forecast-strip]');
    await expect(strip).toBeVisible();
    const forecast = await app.forecast();
    expect(forecast).not.toBeNull();
    if (forecast === null) return;
    await expect(strip).toContainText(String(forecast.toHull));
    await expect(strip).toContainText(String(forecast.raw));
  });

  test('the strip tracks the board and matches the turn it predicts', async ({
    app,
  }) => {
    await openBattle(app, 'tablet');
    const strip = app.page.locator('[data-forecast-strip]');
    for (let turn = 0; turn < 4; turn += 1) {
      const state = await app.state();
      if (state.screen !== 'battle' || state.battle.phase !== 'placement') break;
      await app.placeTurn();
      const forecast = await app.forecast();
      if (forecast === null) break;
      await expect(strip).toContainText(String(forecast.outgoing));
      const hullBefore = (await app.state()).battle.hull;
      await app.endTurn();
      await app.page.waitForFunction(
        (before) => {
          const current = window.caTest?.state();
          if (current === undefined) return false;
          if (current.screen !== 'battle') return true;
          return current.battle.turn > before;
        },
        state.battle.turn,
        { timeout: 30_000 },
      );
      const after = await app.state();
      if (after.screen !== 'battle') break;
      if (forecast.evasion === null && forecast.ends === null) {
        expect(hullBefore - after.battle.hull).toBe(forecast.toHull);
      }
    }
  });

  test('the conveyor prints a live output per row', async ({ app }) => {
    await openBattle(app, 'tablet');
    const state = await app.state();
    const red = state.battle.dice.find(
      (die) => die.state === 'tray' && die.school === 'red',
    );
    if (red === undefined) return;
    await app.selectDie(red.uid);
    await expect(app.projection('weaponA')).toContainText('→');
    await expect(app.slotCard('reactor')).toContainText('×1.5');
  });
});
