import { expect, test } from '../fixtures';
import type { Screens } from '../screens';

const CARD_DECK = ['flare', 'red-d6', 'red-d6', 'crucible', 'sprout'];
const COLLECTION = [
  { defId: 'flare', count: 2 },
  { defId: 'red-d6', count: 2 },
  { defId: 'crucible', count: 1 },
  { defId: 'sprout', count: 1 },
  { defId: 'glimmer', count: 1 },
];

const seedCollection = async (app: Screens): Promise<void> => {
  await app.page.evaluate((collection) => {
    window.caTest?.grantMeta({
      level: 30,
      shards: 4000,
      collection,
      tutorialSeen: 'all',
    });
  }, COLLECTION);
};

test.describe('ship cards', () => {
  test('the hangar prints the whole board of every playable ship', async ({
    app,
  }) => {
    await seedCollection(app);
    await app.goTo('hangar');

    for (const shipId of ['wanderer', 'ram', 'ark']) {
      const data = await app.shipCard(shipId);
      expect(data).not.toBeNull();
      if (data === null) continue;
      const card = app.page.locator(`[data-ship-card="${shipId}"]`);
      await expect(card).toBeVisible();
      await expect(card).toHaveAttribute('data-ship-hull', String(data.hull));
      await expect(card).toHaveAttribute(
        'data-ship-slots',
        data.slots.join(','),
      );
      await expect(card.locator('[data-ship-slot]')).toHaveCount(
        data.slots.length,
      );
      expect(data.hasPassiveText).toBe(true);
      await expect(card.locator(`[data-ship-passive="${data.passive ?? ''}"]`)).toBeVisible();
    }
  });

  test('launch shows the equipped ship and can send you back to change it', async ({
    app,
  }) => {
    await seedCollection(app);
    await app.goTo('runSetup');

    const data = await app.shipCard('wanderer');
    const card = app.page.locator('[data-ship-card="wanderer"]');
    await expect(card).toBeVisible();
    await expect(card).toHaveAttribute(
      'data-ship-hull',
      String(data?.hull ?? 0),
    );

    await app.testId('setup-change-ship').click();
    await app.expectScreen('hangar');
  });
});

test.describe('die cards', () => {
  test('the shop stocks cards with faces and averages from the data', async ({
    app,
  }) => {
    await app.seedRun({ seed: 7 });
    await app.grantRun(400);
    await app.goTo('shop');

    const cards = app.page.locator('[data-testid^="shop-item-"] [data-die-card]');
    await expect(cards.first()).toBeVisible();
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    for (let index = 0; index < count; index += 1) {
      const card = cards.nth(index);
      const defId = await card.getAttribute('data-die-card');
      expect(defId).not.toBeNull();
      if (defId === null) continue;
      const data = await app.expectDieCard(card, defId);
      await expect(card).toContainText(`avg ${data.ev}`);
    }
  });

  test('a hangar row opens the full card', async ({ app }) => {
    await seedCollection(app);
    await app.goTo('hangar');

    await app.testId('hangar-card-flare').click();
    const card = app.page.locator('[data-testid="die-card-modal"] [data-die-card="flare"]');
    await expect(card).toBeVisible();
    const data = await app.expectDieCard(card, 'flare');
    expect(data.custom).toBe(true);

    await expect(card.locator('[data-die-face]')).toHaveCount(data.faces.split('·').length);
    await expect(card.locator('[data-die-desc]')).toBeVisible();
    await expect(card.locator('[data-die-features]')).toBeVisible();
    for (const feature of data.features) {
      await expect(card.locator(`[data-die-feature="${feature}"]`)).toBeVisible();
    }

    await app.testId('die-card-close').click();
    await expect(app.testId('die-card-modal')).toBeHidden();
  });

  test('a collection entry opens the same card the hangar shows', async ({
    app,
  }) => {
    await seedCollection(app);
    await app.goTo('collection');

    await app.testId('collection-card-crucible').click();
    const card = app.page.locator('[data-testid="die-card-modal"] [data-die-card="crucible"]');
    await expect(card).toBeVisible();
    await app.expectDieCard(card, 'crucible');
    await expect(card.locator('[data-die-feature="active"]')).toBeVisible();
  });

  test('the collection filters down to one badge family', async ({ app }) => {
    await seedCollection(app);
    await app.goTo('collection');

    const entries = app.page.locator('[data-collection-entry]');
    const before = await entries.count();
    await app.page.locator('[data-die-filter="faces"]').click();
    await expect
      .poll(async () => entries.count())
      .toBeLessThan(before);

    for (const id of await entries.evaluateAll((nodes) =>
      nodes.map((node) => (node as HTMLElement).dataset.collectionEntry ?? ''),
    )) {
      const data = await app.dieCard(id);
      expect(data?.features).toContain('faces');
    }

    expect((await app.state()).params?.feature).toBe('faces');
  });

  test('the engraving station shows the card of the die being fitted', async ({
    app,
  }) => {
    await seedCollection(app);
    await app.goTo('engraving');

    const card = app.page.locator('[data-die-card][data-die-card-size="full"]').first();
    await expect(card).toBeVisible();
    const defId = await card.getAttribute('data-die-card');
    expect(defId).not.toBeNull();
    if (defId === null) return;
    await app.expectDieCard(card, defId);
  });

  test('the shipyard pairs the fusion source with its target', async ({
    app,
  }) => {
    await app.seedRun({ seed: 7, deck: CARD_DECK });
    await app.grantRun(400);
    await app.goTo('shipyard');

    const pair = app.page.locator('[data-fusion-pair="red-d6"]');
    await expect(pair).toBeVisible();
    await app.expectDieCard(pair.locator('[data-die-card="red-d6"]'), 'red-d6');
    await app.expectDieCard(
      pair.locator('[data-die-card="fused-emberforge"]'),
      'fused-emberforge',
    );
  });

  test('the battle card matches the shop card for the same die', async ({
    app,
  }) => {
    await app.seedRun({ seed: 7, deck: CARD_DECK });
    await app.grantRun(400);
    await app.goTo('shop');
    await app.page.locator('[data-testid^="shop-sell-card-"]').first().click();
    const shopCard = app.page.locator('[data-testid="die-card-modal"] [data-die-card]');
    await expect(shopCard).toBeVisible();
    const defId = await shopCard.getAttribute('data-die-card');
    expect(defId).not.toBeNull();
    if (defId === null) return;
    const fromShop = {
      faces: await shopCard.getAttribute('data-die-faces'),
      ev: await shopCard.getAttribute('data-die-ev'),
      tier: await shopCard.getAttribute('data-die-tier'),
    };
    await app.testId('die-card-close').click();

    await app.startBattle({ enemyIds: ['raider'], deck: CARD_DECK, seed: 42 });
    await app.waitForPlacement();
    const die = (await app.state()).battle.dice.find(
      (entry) => entry.defId === defId && entry.state === 'tray',
    );
    expect(die).toBeDefined();
    if (die === undefined) return;
    await app.selectDie(die.uid);

    const battleCard = app.page.locator(`[data-die-card="${defId}"][data-die-card-size="mini"]`);
    await expect(battleCard).toBeVisible();
    await expect(battleCard).toHaveAttribute('data-die-faces', fromShop.faces ?? '');
    await expect(battleCard).toHaveAttribute('data-die-ev', fromShop.ev ?? '');
    await expect(battleCard).toHaveAttribute('data-die-tier', fromShop.tier ?? '');
  });
});
