import { expect, type Locator, type Page } from '@playwright/test';
import type {
  AccountView,
  AchievementsView,
  BattlePatch,
  CloudMetaView,
  DieCardView,
  SeedRunConfig,
  ShipCardView,
  TestState,
  VignetteView,
} from '@/services/testApi';
import type {
  VignetteFlashKind,
  VignetteRimKind,
  VignetteSide,
} from '@/services/vignette';
import type { MetaStats } from '@/stores/metaStore';
import type { Mitigation, TurnForecast } from '@/game/battle/view';
import type { BattleTally } from '@/stores/runStore';
import type { SettingsValues } from '@/stores/settingsStore';
import type { BattleLayoutId, ScreenId } from '@/types';
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
      window.caTest?.grantMeta({
        tutorialSeen: 'all',
        prologueDone: true,
        systemsCheckDone: true,
      });
    }, FROZEN_NOW);
    await this.expectScreen('menu');
  }

  async bootFresh(): Promise<void> {
    await this.page.goto('/');
    await this.page.waitForFunction(() => window.caTest !== undefined, null, {
      timeout: READY_TIMEOUT,
    });
    await this.page.evaluate((at) => {
      window.caTest?.now(at);
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
    await expect(this.page.locator('[data-screen-loading]')).toHaveCount(0, {
      timeout,
    });
  }

  state(): Promise<TestState> {
    return this.page.evaluate(() => {
      const api = window.caTest;
      if (api === undefined) throw new Error('caTest is not mounted');
      return api.state();
    });
  }

  account(): Promise<AccountView> {
    return this.page.evaluate(() => {
      const api = window.caTest;
      if (api === undefined) throw new Error('caTest is not mounted');
      return api.account();
    });
  }

  async waitForUid(): Promise<string> {
    await expect
      .poll(async () => (await this.account()).uid, { timeout: READY_TIMEOUT })
      .not.toBeNull();
    const uid = (await this.account()).uid;
    if (uid === null) throw new Error('uid never resolved');
    return uid;
  }

  cloudMeta(): Promise<CloudMetaView | null> {
    return this.page.evaluate(() => {
      const api = window.caTest;
      if (api === undefined) throw new Error('caTest is not mounted');
      return api.cloudMeta();
    });
  }

  async waitForCloudMeta(shards: number): Promise<void> {
    await expect
      .poll(async () => (await this.cloudMeta())?.shards ?? null, {
        timeout: READY_TIMEOUT,
      })
      .toBe(shards);
  }

  async waitForAuthSettled(): Promise<void> {
    await expect
      .poll(
        async () => {
          const account = await this.account();
          return account.uid !== null || account.authError !== null;
        },
        { timeout: READY_TIMEOUT },
      )
      .toBe(true);
  }

  async hardwareBack(): Promise<void> {
    await this.page.evaluate(() => {
      window.caTest?.back();
    });
  }

  async deepLink(param: string): Promise<boolean> {
    return this.page.evaluate(
      (value) => window.caTest?.deepLink(value) ?? false,
      param,
    );
  }

  async nav(): Promise<TestState['nav']> {
    return (await this.state()).nav;
  }

  async openAccount(): Promise<void> {
    await this.page.evaluate(() => {
      window.caTest?.go('settings');
    });
    await this.expectScreen('settings');
    await expect(this.testId('account-section')).toBeVisible();
  }

  async submitEmailForm(email: string, password: string): Promise<void> {
    await this.testId('email-input').fill(email);
    await this.testId('password-input').fill(password);
    await this.testId('email-submit').click();
  }

  async registerEmail(email: string, password: string): Promise<void> {
    await this.testId('account-email').click();
    await expect(this.testId('email-modal')).toBeVisible();
    await this.submitEmailForm(email, password);
  }

  async signInEmail(email: string, password: string): Promise<void> {
    await this.testId('account-email').click();
    await expect(this.testId('email-modal')).toBeVisible();
    await this.testId('email-mode-signin').click();
    await this.submitEmailForm(email, password);
  }

  async signOut(): Promise<void> {
    await this.testId('account-signout').click();
    await this.testId('account-signout-confirm').click();
    await this.expectScreen('menu');
  }

  async wipeDevice(): Promise<void> {
    await this.page.evaluate(async () => {
      localStorage.clear();
      await new Promise<void>((resolve) => {
        const request = indexedDB.deleteDatabase('firebaseLocalStorageDb');
        request.onsuccess = () => {
          resolve();
        };
        request.onerror = () => {
          resolve();
        };
        request.onblocked = () => {
          resolve();
        };
      });
    });
  }

  async seedRun(config: SeedRunConfig): Promise<void> {
    await this.page.evaluate((cfg) => {
      window.caTest?.seedRun(cfg);
    }, config);
  }

  achievements(): Promise<AchievementsView> {
    return this.page.evaluate(() => {
      const api = window.caTest;
      if (api === undefined) throw new Error('caTest is not mounted');
      return api.achievements();
    });
  }

  async grantStats(stats: Partial<MetaStats>): Promise<void> {
    await this.page.evaluate((patch) => {
      window.caTest?.grantMeta({ stats: patch });
    }, stats);
  }

  async settleAchievements(): Promise<string[]> {
    return this.page.evaluate(() => {
      const api = window.caTest;
      if (api === undefined) throw new Error('caTest is not mounted');
      return api.settleAchievements();
    });
  }

  async setSettings(patch: Partial<SettingsValues>): Promise<void> {
    await this.page.evaluate((values) => {
      window.caTest?.settings(values);
    }, patch);
  }

  vignette(): Promise<VignetteView> {
    return this.page.evaluate(() => {
      const api = window.caTest;
      if (api === undefined) throw new Error('caTest is not mounted');
      return api.vignette();
    });
  }

  async fireVignette(
    kind: VignetteFlashKind,
    side?: VignetteSide,
  ): Promise<void> {
    await this.page.evaluate(
      (value) => {
        window.caTest?.fireVignette(value.kind, value.side);
      },
      { kind, side },
    );
  }

  async summaryFinds(defIds: readonly string[], shards: number): Promise<void> {
    await this.page.evaluate(
      (value) => {
        window.caTest?.summaryFinds(value.defIds, value.shards);
      },
      { defIds: [...defIds], shards },
    );
  }

  async vignetteRim(kind: VignetteRimKind, on: boolean): Promise<void> {
    await this.page.evaluate(
      (value) => {
        window.caTest?.vignetteRim(value.kind, value.on);
      },
      { kind, on },
    );
  }

  async setLayout(id: BattleLayoutId): Promise<void> {
    await this.page.evaluate((layout) => {
      window.caTest?.layout(layout);
    }, id);
  }

  forecast(): Promise<TurnForecast | null> {
    return this.page.evaluate(() => window.caTest?.forecast() ?? null);
  }

  async startBattle(patch: BattlePatch): Promise<void> {
    await this.page.evaluate((cfg) => {
      window.caTest?.setBattle(cfg);
    }, patch);
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

  dieCard(defId: string): Promise<DieCardView | null> {
    return this.page.evaluate(
      (id) => window.caTest?.dieCard(id) ?? null,
      defId,
    );
  }

  async expectDieCard(card: Locator, defId: string): Promise<DieCardView> {
    const data = await this.dieCard(defId);
    if (data === null) throw new Error(`unknown die ${defId}`);
    await expect(card).toHaveAttribute('data-die-faces', data.faces);
    await expect(card).toHaveAttribute('data-die-ev', data.ev);
    await expect(card).toHaveAttribute('data-die-tier', String(data.tier));
    return data;
  }

  shipCard(shipId: string): Promise<ShipCardView | null> {
    return this.page.evaluate(
      (id) => window.caTest?.shipCard(id as never) ?? null,
      shipId,
    );
  }

  mitigation(enemyId: string): Promise<Mitigation | null> {
    return this.page.evaluate(
      (id) => window.caTest?.mitigation(id) ?? null,
      enemyId,
    );
  }

  tally(): Promise<BattleTally | null> {
    return this.page.evaluate(() => window.caTest?.tally() ?? null);
  }

  async goTo(screen: ScreenId): Promise<void> {
    await this.page.evaluate((id) => {
      window.caTest?.go(id);
    }, screen);
    await this.expectScreen(screen);
  }

  async jumpToNodeInUi(nodeId: string): Promise<void> {
    await this.page.locator(`[data-node="${nodeId}"]`).click();
    await this.testId('map-jump').click();
  }

  async expectBoardFits(): Promise<void> {
    await expect
      .poll(
        () =>
          this.page.evaluate(() => {
            const body = document.querySelector('[data-screen-body]');
            if (body === null) return null;
            const box = body.getBoundingClientRect();
            const cut: string[] = [];
            for (const el of document.querySelectorAll('[data-slot]')) {
              const rect = el.getBoundingClientRect();
              if (rect.height === 0) continue;
              if (rect.bottom > box.bottom + 1 || rect.top < box.top - 1) {
                cut.push(el.getAttribute('data-slot') ?? '?');
              }
            }
            return { scrolled: body.scrollTop, cut };
          }),
        { timeout: BATTLE_TIMEOUT },
      )
      .toEqual({ scrolled: 0, cut: [] });
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
    await this.expectBoardFits();
  }

  async tapDie(uid: string): Promise<void> {
    const point = await this.diePoint(uid);
    await this.page.mouse.click(point.x, point.y);
  }

  async selectDie(uid: string): Promise<void> {
    await this.waitForStableAnchors();
    await expect
      .poll(
        async () => {
          const current = (await this.state()).battle.selectedDieUid;
          if (current === uid) return current;
          await this.tapDie(uid);
          return (await this.state()).battle.selectedDieUid;
        },
        { timeout: BATTLE_TIMEOUT },
      )
      .toBe(uid);
  }

  slotCard(slotId: SlotId): Locator {
    return this.testId(`slot-${slotId}`);
  }

  projection(slotId: SlotId): Locator {
    return this.page.locator(`[data-proj="${slotId}"]`);
  }

  console(id: string): Locator {
    return this.testId(`console-${id}`);
  }

  async tapSlot(slotId: SlotId): Promise<void> {
    await this.slotCard(slotId).click();
  }

  async placeByTap(uid: string, slotId: SlotId): Promise<void> {
    await this.selectDie(uid);
    await this.tapSlot(slotId);
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

  async tapEnemy(): Promise<void> {
    const box = await this.page
      .locator('[data-band="enemies"]')
      .boundingBox();
    if (box === null) throw new Error('no enemy band');
    await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
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
      'tally-continue',
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

  async endTurn(): Promise<void> {
    await this.testId('battle-end-turn').click();
  }

  checkBanner(): Locator {
    return this.testId('check-banner');
  }

  reason(): Locator {
    return this.page.locator('[data-console-reason]');
  }

  async waitForCheckStep(step: number): Promise<void> {
    await this.waitForPlacement();
    await this.page.waitForFunction(
      (target) => window.caTest?.state().battle.check?.stepIndex === target - 1,
      step,
      { timeout: BATTLE_TIMEOUT },
    );
    const restricted = await this.page.evaluate(
      () => window.caTest?.state().battle.check?.moves !== null,
    );
    if (restricted) {
      await expect(this.checkBanner()).toHaveAttribute(
        'data-check-step',
        String(step),
      );
    } else {
      await expect(this.checkBanner()).toHaveCount(0);
    }
  }

  async playCheckStep(
    placements: readonly (readonly [string, SlotId])[],
  ): Promise<void> {
    for (const [uid, slotId] of placements) {
      await this.placeByTap(uid, slotId);
    }
    await this.endTurn();
  }

  async dismissCoachMarks(max = 12): Promise<void> {
    for (let i = 0; i < max; i += 1) {
      const next = this.testId('coach-next');
      if ((await next.count()) === 0) return;
      await next.click();
    }
  }

  async walkPrologue(maxBeats = 8): Promise<void> {
    await this.expectScreen('prologue');
    for (let beat = 0; beat < maxBeats; beat += 1) {
      const next = this.testId('prologue-next');
      await expect(next).toBeVisible({ timeout: READY_TIMEOUT });
      await next.click();
      if ((await this.state()).screen !== 'prologue') return;
    }
    throw new Error('walkPrologue: the prologue never handed over');
  }

  async placeTurn(): Promise<void> {
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
  }

  async playTurn(): Promise<void> {
    await this.placeTurn();
    await this.endTurn();
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
