import { expect, test } from '../fixtures';

const DEFENSE_SEED = 3;
const SWARM = 'riftWasp';

const enginesDeck = ['green-d4', 'green-d4', 'green-d4', 'green-d4', 'green-d4'];
const sensorsDeck = ['grey-d4', 'grey-d4', 'ember', 'ember', 'grey-d4'];

test.describe('combat mechanics', () => {
  test('evasion rolls once per incoming hit and never exceeds them', async ({
    app,
  }) => {
    await app.seedRun({ seed: DEFENSE_SEED });
    await app.startBattle({
      enemyIds: [SWARM],
      deck: enginesDeck,
      seed: DEFENSE_SEED,
      hull: 40,
      hullMax: 40,
    });
    await app.waitForPlacement();

    const hits = 4;
    let evaded = 0;
    for (let turn = 0; turn < 4; turn += 1) {
      const tray = (await app.state()).battle.dice.find(
        (d) => d.state === 'tray',
      );
      expect(tray).toBeDefined();
      if (tray === undefined) return;
      await app.dragDieToSlot(tray.uid, 'engines');

      const placed = await app.state();
      expect(placed.battle.evasion).toBeNull();

      await app.testId('battle-end-turn').click();
      await app.waitForPlacement();

      const after = await app.state();
      for (const attack of after.battle.attackBeats) {
        expect(attack.dodged + attack.glanced).toBeLessThanOrEqual(hits);
        evaded += attack.dodged + attack.glanced;
      }
    }
    expect(evaded).toBeGreaterThan(0);
  });

  test('an empty engines slot takes every hit whole', async ({ app }) => {
    await app.seedRun({ seed: DEFENSE_SEED });
    await app.startBattle({
      enemyIds: [SWARM],
      deck: enginesDeck,
      seed: DEFENSE_SEED,
      hull: 40,
      hullMax: 40,
    });
    await app.waitForPlacement();
    await app.testId('battle-end-turn').click();
    await app.waitForPlacement();

    const after = await app.state();
    const attack = after.battle.attackBeats[0];
    expect(attack).toBeDefined();
    if (attack === undefined) return;
    expect(attack.dodged).toBe(0);
    expect(attack.glanced).toBe(0);
    expect(after.battle.evasion).toBeNull();
  });

  test('a marked target keeps its vulnerability for the whole turn', async ({
    app,
  }) => {
    await app.seedRun({ seed: DEFENSE_SEED });
    await app.startBattle({
      enemyIds: ['anchorHulk'],
      deck: sensorsDeck,
      seed: DEFENSE_SEED,
      hull: 40,
      hullMax: 40,
    });
    await app.waitForPlacement();

    const state = await app.state();
    const sensorDie = state.battle.dice.find(
      (d) => d.state === 'tray' && d.tier <= 6,
    );
    const weapons = state.battle.dice.filter(
      (d) => d.state === 'tray' && d.uid !== sensorDie?.uid,
    );
    expect(sensorDie).toBeDefined();
    if (sensorDie === undefined) return;
    await app.dragDieToSlot(sensorDie.uid, 'sensors');

    const first = weapons[0];
    const second = weapons[1];
    if (first !== undefined) await app.dragDieToSlot(first.uid, 'weaponA');
    if (second !== undefined) await app.dragDieToSlot(second.uid, 'weaponB');

    const before = (await app.state()).battle.enemies[0]?.hp ?? 0;
    await app.testId('battle-end-turn').click();

    await expect
      .poll(async () => (await app.state()).battle.sensorBeats[0]?.vulnerable)
      .toBeGreaterThan(0);

    await app.waitForPlacement();
    const after = await app.state();
    const enemy = after.battle.enemies[0];
    expect(enemy).toBeDefined();
    if (enemy === undefined) return;
    expect(enemy.hp).toBeLessThan(before);
    expect(enemy.vulnerable).toBe(0);
  });
});
