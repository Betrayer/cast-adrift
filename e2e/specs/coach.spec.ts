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

const coach = (app: { page: import('@playwright/test').Page }) =>
  app.page.evaluate(
    () => window.caTest?.coach() ?? { active: null, seen: [] as string[] },
  );

test.describe('coach marks', () => {
  test('stay silent through the check and wake on the free turn', async ({
    fresh,
  }) => {
    await fresh.testId('menu-newRun').click();
    await fresh.walkPrologue();

    for (let step = 1; step <= 5; step += 1) {
      await fresh.waitForCheckStep(step);
      expect((await coach(fresh)).active).toBeNull();
      await fresh.playCheckStep(SCRIPT[step - 1] ?? []);
    }

    await fresh.waitForCheckStep(6);
    await expect
      .poll(async () => (await coach(fresh)).active, { timeout: 10_000 })
      .not.toBeNull();
  });

  test('every mark fires at most once across two battles', async ({ app }) => {
    await app.page.evaluate(() => {
      window.caTest?.resetTutorial();
    });
    await app.seedRun({ seed: 21 });

    const fired: string[] = [];
    for (let battle = 0; battle < 2; battle += 1) {
      await app.startBattle({ enemyIds: ['raider'], seed: 21 + battle });
      await app.waitForPlacement();
      for (let step = 0; step < 12; step += 1) {
        const state = await coach(app);
        if (state.active === null) break;
        fired.push(state.active);
        await app.page.evaluate((id) => {
          window.caTest?.grantMeta({ tutorialSeen: [id] });
        }, state.active);
      }
    }

    expect(fired.length).toBeGreaterThan(0);
    expect(new Set(fired).size).toBe(fired.length);
    const seen = (await coach(app)).seen;
    for (const id of fired) expect(seen).toContain(id);
  });

  test('resetting the tutorial re-arms the marks and the check', async ({
    app,
  }) => {
    const before = await app.state();
    expect(before.meta.tutorialSeen.length).toBeGreaterThan(0);
    expect(before.meta.systemsCheckDone).toBe(true);

    await app.page.evaluate(() => {
      window.caTest?.resetTutorial();
    });

    const after = await app.state();
    expect(after.meta.tutorialSeen).toEqual([]);
    expect(after.meta.systemsCheckDone).toBe(false);
  });
});
