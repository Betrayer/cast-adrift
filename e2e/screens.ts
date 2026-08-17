import { expect, type Locator, type Page } from '@playwright/test';
import type { SeedRunConfig, TestState } from '@/services/testApi';
import type { SlotId } from '@/types/battle';

export const FROZEN_NOW = 1_760_000_000_000;

const READY_TIMEOUT = 30_000;
const BATTLE_TIMEOUT = 30_000;

export class Screens {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async boot(): Promise<void> {
    await this.page.goto('/');
    await this.page.waitForFunction(() => window.caTest !== undefined, null, {
      timeout: READY_TIMEOUT,
    });
    await this.page.evaluate((at) => {
      window.caTest?.now(at);
      window.caTest?.grantMeta({ tutorialSeen: 'all', prologueDone: true });
    }, FROZEN_NOW);
    await this.expectScreen('menu');
  }

  async reboot(): Promise<void> {
    await this.page.reload();
    await this.page.waitForFunction(() => window.caTest !== undefined, null, {
      timeout: READY_TIMEOUT,
    });
    await this.page.evaluate((at) => {
      window.caTest?.now(at);
    }, FROZEN_NOW);
  }

  screen(id: string): Locator {
    return this.page.locator(`[data-screen="${id}"]`);
  }

  testId(id: string): Locator {
    return this.page.getByTestId(id);
  }

  async expectScreen(id: string, timeout = READY_TIMEOUT): Promise<void> {
    await expect(this.screen(id)).toBeVisible({ timeout });
  }

  state(): Promise<TestState> {
    return this.page.evaluate(() => {
      const api = window.caTest;
      if (api === undefined) throw new Error('caTest is not mounted');
      return api.state();
    });
  }

  async seedRun(config: SeedRunConfig): Promise<void> {
    await this.page.evaluate((cfg) => {
      window.caTest?.seedRun(cfg);
    }, config);
  }

  async grantRun(scrap: number): Promise<void> {
    await this.page.evaluate((n) => {
      window.caTest?.grantRun({ scrap: n });
    }, scrap);
  }

  async seedRunWithNode(
    nodeType: string,
    seeds: readonly number[],
  ): Promise<{ seed: number; nodeId: string }> {
    const found = await this.page.evaluate(
      ({ type, candidates }) => {
        const api = window.caTest;
        if (api === undefined) throw new Error('caTest is not mounted');
        for (const seed of candidates) {
          api.seedRun({ seed });
          const node = api
            .mapNodes()
            .find((entry) => entry.reachable && entry.type === type);
          if (node !== undefined) return { seed, nodeId: node.id };
        }
        return null;
      },
      { type: nodeType, candidates: [...seeds] },
    );
    if (found === null) {
      throw new Error(`no seed in the candidate list reaches a ${nodeType} node`);
    }
    return found;
  }

  async jumpToNodeInUi(nodeId: string): Promise<void> {
    await this.page.locator(`[data-node="${nodeId}"]`).click();
    await this.testId('map-jump').click();
  }

  async waitForPlacement(): Promise<void> {
    await this.expectScreen('battle');
    await this.page.waitForFunction(
      () => {
        const api = window.caTest;
        if (api === undefined) return false;
        return (
          api.state().battle.phase === 'placement' &&
          api.anchors() !== null &&
          (api.anchors()?.dice.length ?? 0) > 0
        );
      },
      null,
      { timeout: BATTLE_TIMEOUT },
    );
  }

  async tapDie(uid: string): Promise<void> {
    const point = await this.diePoint(uid);
    await this.page.mouse.click(point.x, point.y);
  }

  async waitForStableAnchors(): Promise<void> {
    await this.page.waitForFunction(
      () =>
        new Promise<boolean>((resolve) => {
          const read = (): string =>
            JSON.stringify(window.caTest?.anchors() ?? null);
          const first = read();
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              resolve(first !== 'null' && read() === first);
            });
          });
        }),
      null,
      { timeout: BATTLE_TIMEOUT },
    );
  }

  async dragDieToSlot(uid: string, slotId: SlotId): Promise<void> {
    await this.waitForStableAnchors();
    const from = await this.diePoint(uid);
    await this.page.mouse.move(from.x, from.y);
    await this.page.mouse.down();
    await this.page.mouse.move(from.x + 12, from.y - 12, { steps: 4 });
    const to = await this.slotPoint(slotId);
    await this.page.mouse.move(to.x, to.y, { steps: 12 });
    await this.page.mouse.up();
    await this.page.waitForFunction(
      (target) =>
        window.caTest
          ?.state()
          .battle.slots.some(
            (slot) => slot.id === target.slotId && slot.dieUid === target.uid,
          ) === true,
      { uid, slotId },
      { timeout: BATTLE_TIMEOUT },
    );
  }

  async clearRewards(maxSteps = 6): Promise<void> {
    const controls = [
      'reward-package-die-0',
      'reward-package-module-0',
      'reward-die-keep',
      'reward-die-sell',
      'reward-perk-pick-0',
      'reward-perk-skip',
    ];
    for (let step = 0; step < maxSteps; step += 1) {
      if ((await this.state()).screen !== 'rewards') return;
      let clicked = false;
      for (const id of controls) {
        const control = this.testId(id);
        if ((await control.count()) === 0) continue;
        if (!(await control.isVisible())) continue;
        if (!(await control.isEnabled())) continue;
        await control.click();
        await control
          .waitFor({ state: 'hidden', timeout: BATTLE_TIMEOUT })
          .catch(() => undefined);
        clicked = true;
        break;
      }
      if (!clicked) return;
    }
  }

  async playTurn(): Promise<void> {
    const plan = await this.page.evaluate(() => {
      const api = window.caTest;
      if (api === undefined) throw new Error('caTest is not mounted');
      const taken = new Set(
        api
          .state()
          .battle.slots.filter((slot) => slot.dieUid !== null)
          .map((slot) => slot.id),
      );
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
    for (const move of plan) {
      await this.dragDieToSlot(move.uid, move.slotId);
    }
    await this.testId('battle-end-turn').click();
  }

  async playUntilBattleEnds(maxTurns = 12): Promise<'victory' | 'defeat'> {
    for (let turn = 0; turn < maxTurns; turn += 1) {
      const state = await this.state();
      if (state.screen !== 'battle') {
        return state.screen === 'ending' ? 'defeat' : 'victory';
      }
      if (state.battle.phase !== 'placement') {
        await this.page.waitForFunction(
          () => {
            const current = window.caTest?.state();
            if (current === undefined) return false;
            return (
              current.screen !== 'battle' ||
              current.battle.phase === 'placement'
            );
          },
          null,
          { timeout: BATTLE_TIMEOUT },
        );
        continue;
      }
      await this.playTurn();
      await this.page.waitForFunction(
        (before) => {
          const current = window.caTest?.state();
          if (current === undefined) return false;
          if (current.screen !== 'battle') return true;
          return (
            current.battle.phase === 'placement' && current.battle.turn > before
          );
        },
        state.battle.turn,
        { timeout: BATTLE_TIMEOUT },
      );
    }
    throw new Error('battle did not resolve within the turn budget');
  }

  private async diePoint(uid: string): Promise<{ x: number; y: number }> {
    const die = await this.page.evaluate(
      (target) => window.caTest?.anchors()?.dice.find((d) => d.uid === target),
      uid,
    );
    if (die === undefined || die === null) {
      throw new Error(`no anchor for die ${uid}`);
    }
    return { x: die.x, y: die.y };
  }

  private async slotPoint(
    slotId: SlotId,
  ): Promise<{ x: number; y: number }> {
    const rect = await this.page.evaluate(
      (target) => window.caTest?.anchors()?.slots.find((s) => s.id === target),
      slotId,
    );
    if (rect === undefined || rect === null) {
      throw new Error(`no anchor for slot ${slotId}`);
    }
    return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
  }
}
