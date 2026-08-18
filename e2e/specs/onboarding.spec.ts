import { expect, test } from '../fixtures';
import type { SlotId } from '@/types/battle';

const GREEN = 'die-0';
const BLUE = 'die-1';
const RED = 'die-2';
const GREY = 'die-3';
const BLACK = 'die-4';

const SCRIPT: readonly (readonly (readonly [string, SlotId])[])[] = [
  [[GREEN, 'engines']],
  [[BLUE, 'shields']],
  [[RED, 'weaponA']],
  [
    [GREY, 'sensors'],
    [RED, 'weaponA'],
  ],
  [[BLACK, 'reactor']],
];

const FUNNEL_BUDGET_MS = 180_000;

test.describe('onboarding', () => {
  test('smoke — a fresh profile reaches a real battle inside the funnel budget', async ({
    fresh,
  }) => {
    test.setTimeout(240_000);
    const started = Date.now();

    await test.step('menu to prologue', async () => {
      await fresh.testId('menu-newRun').click();
      await fresh.walkPrologue();
    });

    await test.step('systems check', async () => {
      for (let step = 1; step <= 5; step += 1) {
        await fresh.waitForCheckStep(step);
        await fresh.playCheckStep(SCRIPT[step - 1] ?? []);
      }
      await fresh.waitForCheckStep(6);
    });

    await test.step('free turn to the map', async () => {
      await fresh.playUntilBattleEnds();
      await fresh.clearRewards();
      await fresh.expectScreen('map');
    });

    await test.step('first real battle', async () => {
      await fresh.dismissCoachMarks();
      const node = (await fresh.state()).run.position;
      expect(node).not.toBeNull();
      const target = await fresh.page.evaluate(
        () => window.caTest?.mapNodes().find((n) => n.reachable)?.id ?? null,
      );
      expect(target).not.toBeNull();
      if (target === null) return;
      await fresh.jumpToNodeInUi(target);
    });

    expect(Date.now() - started).toBeLessThan(FUNNEL_BUDGET_MS);

    const names = (
      await fresh.page.evaluate(() => window.caTest?.events() ?? [])
    ).map((e) => e.name);
    expect(names.filter((n) => n === 'onboard_step')).toHaveLength(6);
    expect(names).toContain('onboard_done');
  });

  test('the systems check plays through by tap and hands the run to the map', async ({
    fresh,
  }) => {
    await fresh.testId('menu-newRun').click();
    await fresh.walkPrologue();

    await fresh.waitForCheckStep(1);
    expect((await fresh.state()).battle.check?.stepCount).toBe(6);
    expect((await fresh.state()).battle.dice.map((d) => d.value)).toEqual([
      3, 4, 5, 3, 4,
    ]);
    await expect(fresh.slotCard('engines')).toHaveAttribute('data-goal', '1');
    await fresh.selectDie(GREEN);
    await expect(fresh.projection('engines')).toHaveText(/30%/);

    await fresh.playCheckStep(SCRIPT[0] ?? []);
    await fresh.waitForCheckStep(2);
    const afterEngines = await fresh.state();
    const attack = afterEngines.battle.attackBeats[0];
    expect(attack?.dodged).toBe(1);
    expect(attack?.glanced).toBe(1);
    expect(afterEngines.battle.hull).toBe(25);

    await fresh.playCheckStep(SCRIPT[1] ?? []);
    await fresh.waitForCheckStep(3);
    expect((await fresh.state()).battle.hull).toBe(25);

    await fresh.playCheckStep(SCRIPT[2] ?? []);
    await fresh.waitForCheckStep(4);
    expect((await fresh.state()).battle.enemies[0]?.hp).toBe(15);

    await fresh.placeByTap(GREY, 'sensors');
    await fresh.selectDie(RED);
    await expect(fresh.projection('weaponA')).toHaveText('9 = 7+2');
    await fresh.placeByTap(RED, 'weaponA');
    await fresh.endTurn();
    await fresh.waitForCheckStep(5);
    expect((await fresh.state()).battle.enemies[0]?.hp).toBe(6);

    const atReactor = await fresh.state();
    expect(atReactor.battle.charge).toBe(6);
    expect(atReactor.battle.freeNudges).toBe(1);
    await fresh.selectDie(BLACK);
    await expect(fresh.projection('reactor')).toContainText('−2♥');
    await fresh.console('nudgeMinus').click();
    await expect(fresh.projection('reactor')).not.toContainText('−2♥');
    await fresh.playCheckStep(SCRIPT[4] ?? []);

    await fresh.waitForCheckStep(6);
    const free = await fresh.state();
    expect(free.battle.charge).toBe(10);
    expect(free.battle.check?.moves).toBeNull();
    await expect(fresh.slotCard('shields')).not.toHaveAttribute('data-goal', '1');

    await fresh.playUntilBattleEnds();
    await fresh.clearRewards();
    await fresh.expectScreen('map');
    expect((await fresh.state()).meta.systemsCheckDone).toBe(true);
  });

  test('a wrong drop bounces and the console reads the step reason', async ({
    fresh,
  }) => {
    await fresh.testId('menu-newRun').click();
    await fresh.walkPrologue();
    await fresh.waitForCheckStep(1);

    await fresh.selectDie(GREEN);
    await fresh.tapSlot('shields');
    await expect(fresh.reason()).toHaveText(/affinity/i);
    const state = await fresh.state();
    expect(
      state.battle.slots.find((s) => s.id === 'shields')?.dieUid,
    ).toBeNull();
    expect(state.battle.check?.stepIndex).toBe(0);
  });

  test('end turn stays shut until the step is satisfied', async ({ fresh }) => {
    await fresh.testId('menu-newRun').click();
    await fresh.walkPrologue();
    await fresh.waitForCheckStep(1);

    await expect(fresh.testId('battle-end-turn')).toBeDisabled();
    await fresh.placeByTap(GREEN, 'engines');
    await expect(fresh.testId('battle-end-turn')).toBeEnabled();
  });

  test('the check is skippable from step two onward', async ({ fresh }) => {
    await fresh.testId('menu-newRun').click();
    await fresh.walkPrologue();
    await fresh.waitForCheckStep(1);
    await expect(fresh.testId('check-skip')).toHaveCount(0);

    await fresh.playCheckStep(SCRIPT[0] ?? []);
    await fresh.waitForCheckStep(2);
    await fresh.testId('check-skip').click();

    await expect(fresh.checkBanner()).toHaveCount(0);
    const state = await fresh.state();
    expect(state.battle.check).toBeNull();
    expect(state.meta.systemsCheckDone).toBe(true);

    await fresh.playUntilBattleEnds();
    await fresh.clearRewards();
    await fresh.expectScreen('map');
  });

  test('a reload resumes the check on the same step', async ({ fresh }) => {
    await fresh.testId('menu-newRun').click();
    await fresh.walkPrologue();
    await fresh.waitForCheckStep(1);
    await fresh.playCheckStep(SCRIPT[0] ?? []);
    await fresh.waitForCheckStep(2);
    await fresh.playCheckStep(SCRIPT[1] ?? []);
    await fresh.waitForCheckStep(3);

    const before = await fresh.state();
    await fresh.reboot();
    await fresh.testId('resume-continue').click();
    await fresh.waitForCheckStep(3);

    const after = await fresh.state();
    expect(after.battle.dice.map((d) => d.value)).toEqual(
      before.battle.dice.map((d) => d.value),
    );
    expect(after.battle.hull).toBe(before.battle.hull);
  });

  test('the Codex replay runs the check without touching the run', async ({
    app,
  }) => {
    await app.seedRun({ seed: 11 });
    const before = await app.state();
    const checkDoneBefore = before.meta.systemsCheckDone;

    await app.page.evaluate(() => {
      window.caTest?.go('codex');
    });
    await app.expectScreen('codex');
    await app.page.locator('[data-replay-prologue]').click();
    await app.walkPrologue();
    await app.waitForCheckStep(1);
    expect((await app.state()).battle.check?.sandbox).toBe(true);

    await app.playCheckStep(SCRIPT[0] ?? []);
    await app.waitForCheckStep(2);
    await app.testId('check-skip').click();
    await app.expectScreen('codex');

    const after = await app.state();
    expect(after.run.seed).toBe(before.run.seed);
    expect(after.run.position).toBe(before.run.position);
    expect(after.run.scrap).toBe(before.run.scrap);
    expect(after.run.hull).toBe(before.run.hull);
    expect(after.meta.systemsCheckDone).toBe(checkDoneBefore);
  });
});
