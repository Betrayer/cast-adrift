import type { Page } from "@playwright/test";
import type { InsetProfile } from "../../src/services/testApi";

export const READY_MS = 30_000;

export interface Viewport {
  id: string;
  width: number;
  height: number;
  touch: boolean;
  tma: InsetProfile | null;
}

export const VIEWPORTS: readonly Viewport[] = [
  { id: "360x640", width: 360, height: 640, touch: true, tma: { top: 24, bottom: 0, contentTop: 52 } },
  { id: "390x844", width: 390, height: 844, touch: true, tma: { top: 47, bottom: 34, contentTop: 52 } },
  { id: "768x1024", width: 768, height: 1024, touch: true, tma: { top: 24, bottom: 20, contentTop: 52 } },
  { id: "1280x800", width: 1280, height: 800, touch: false, tma: null },
];

const BATTLE_DECK = ["red-d6", "red-d6", "blue-d6", "grey-d4", "green-d4", "yellow-d6", "black-d6"];

export interface Recipe {
  id: string;
  screen: string;
  prepare: (page: Page) => Promise<void>;
  overlay?: Overlay;
}

interface Overlay {
  open: (page: Page) => Promise<void>;
  shown: string;
  settleMs?: number;
}

export const PHONES: ReadonlySet<string> = new Set(["360x640", "390x844"]);

const go = (screen: string, params?: Record<string, string>) => async (page: Page): Promise<void> => {
  await page.evaluate(
    ([id, p]) => {
      window.caTest?.go(id as never, p ?? undefined);
    },
    [screen, params ?? null] as const,
  );
};

const seed = async (page: Page, config: Record<string, unknown> = {}): Promise<void> => {
  await page.evaluate((cfg) => {
    window.caTest?.seedRun({ seed: 7, ...cfg } as never);
  }, config);
};

const richMeta = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    window.caTest?.grantMeta({ level: 30, shards: 4000 } as never);
  });
};

const metaThen = (screen: string) => async (page: Page): Promise<void> => {
  await richMeta(page);
  await go(screen)(page);
};

const seedThen = (screen: string, params?: Record<string, string>) => async (page: Page): Promise<void> => {
  await seed(page);
  await go(screen, params)(page);
};

const scrapThen = (screen: string) => async (page: Page): Promise<void> => {
  await seed(page);
  await page.evaluate(() => window.caTest?.grantRun({ scrap: 400 } as never));
  await go(screen)(page);
};

const bridgePrep = async (page: Page): Promise<void> => {
  await seed(page);
  await page.evaluate(() => window.caTest?.grantRun({ scrap: 300, modules: ["heatsink", "autoloader"] } as never));
  await go("bridge")(page);
};

const placement = async (page: Page): Promise<void> => {
  await page.waitForFunction(
    () => {
      const api = window.caTest;
      return api !== undefined && api.state().battle.phase === "placement" && (api.anchors()?.dice.length ?? 0) > 0;
    },
    null,
    { timeout: READY_MS },
  );
};

const battle = (layout: string): Recipe => ({
  id: `battle-${layout}`,
  screen: "battle",
  prepare: async (page) => {
    await page.evaluate((id) => window.caTest?.layout(id as never), layout);
    await seed(page);
    await page.evaluate((deck) => {
      window.caTest?.setBattle({ enemyIds: ["raider", "raider"], deck, seed: 42, startCharge: 6 } as never);
    }, BATTLE_DECK);
    await placement(page);
  },
});

const fight = async (page: Page, patch: Record<string, unknown>, config: Record<string, unknown> = {}): Promise<void> => {
  await page.evaluate(() => window.caTest?.layout("console" as never));
  await seed(page, config);
  await page.evaluate((cfg) => window.caTest?.setBattle(cfg as never), patch);
  await placement(page);
};

const tap = (css: string) => async (page: Page): Promise<void> => {
  await page.locator(css).first().click();
};

const EXPLAIN_DECK = ["ember", "frostplate", "sprout", "grey-d4", "ashen"];

const HAND_DECK = ["lancehead", "midas", "voidmaw", "red-d6", "blue-d6"];

const FATE_DECK = ["coreshard", "fate-d100", "obsidian", "taproot", "ember"];

const FORGE_DECK = ["ember", "cinder", "stillwater", "grey-d4", "sprout"];

export const OVERLAYS: readonly Recipe[] = [
  {
    id: "overlay-system-menu",
    screen: "map",
    prepare: async (page) => { await seed(page); },
    overlay: { open: tap('[data-testid="map-system-menu"]'), shown: '[data-testid="system-menu"]' },
  },
  {
    id: "overlay-build-sheet",
    screen: "battle",
    prepare: (page) => fight(page, { enemyIds: ["raider"], deck: EXPLAIN_DECK, seed: 42, hull: 30, hullMax: 30 }),
    overlay: {
      open: async (page) => {
        await tap('[data-testid="battle-system-menu"]')(page);
        await tap('[data-testid="system-build"]')(page);
      },
      shown: '[data-testid="build-sheet"]',
    },
  },
  {
    id: "overlay-echo-core",
    screen: "runSetup",
    prepare: async (page) => {
      await richMeta(page);
      await page.evaluate(() => {
        const memories = Array.from({ length: 15 }, (_, i) => `memory-${String(i + 1)}`);
        window.caTest?.grantMeta({ codex: [...memories, "memory-16-seal"], echo: "calculus" } as never);
      });
      await go("runSetup")(page);
    },
    overlay: { open: tap('[data-testid="setup-echo-open"]'), shown: '[data-testid="echo-core"]' },
  },
  {
    id: "overlay-replace-card",
    screen: "map",
    prepare: async (page) => {
      await seed(page, { deck: Array.from({ length: 9 }, () => "green-d4") });
      await page.evaluate(() => window.caTest?.grantRun({ dice: Array.from({ length: 6 }, () => "green-d4") } as never));
    },
    overlay: {
      open: async (page) => {
        await page.evaluate(() => window.caTest?.grantRun({ dice: ["voidmaw"] } as never));
      },
      shown: '[data-testid="replace-card"]',
    },
  },
  {
    id: "overlay-hand-sheet",
    screen: "battle",
    prepare: (page) => fight(page, { enemyIds: ["raider"], deck: HAND_DECK, seed: 42, hull: 40, hullMax: 40 }, { deck: HAND_DECK }),
    overlay: { open: tap('[data-testid="bag-chip"]'), shown: '[data-testid="hand-sheet"]' },
  },
  {
    id: "overlay-forge-sheet",
    screen: "shipyard",
    prepare: async (page) => {
      await seed(page, { deck: FORGE_DECK });
      await page.evaluate(() => window.caTest?.grantRun({ scrap: 400 } as never));
      await go("shipyard")(page);
    },
    overlay: { open: tap('[data-testid="forge-open"]'), shown: '[data-testid="forge-sheet"]' },
  },
  {
    id: "overlay-slot-sheet",
    screen: "bridge",
    prepare: bridgePrep,
    overlay: { open: tap('[data-testid="bridge-pin-weaponA"]'), shown: '[data-testid="bridge-slot-sheet"]' },
  },
  {
    id: "overlay-check-modal",
    screen: "event",
    prepare: seedThen("event", { eventId: "driftSalvageCrew" }),
    overlay: { open: tap('[data-event-option="tow"]'), shown: '[data-testid="check-roll"]' },
  },
  {
    id: "overlay-fate",
    screen: "battle",
    prepare: (page) => fight(page, { enemyIds: ["raider"], deck: FATE_DECK, seed: 11, hull: 40, hullMax: 40 }),
    overlay: { open: tap('[data-testid="console-fate"]'), shown: '[data-testid="fate-invocation"]', settleMs: 0 },
  },
  {
    id: "overlay-coach",
    screen: "battle",
    prepare: async (page) => {
      await page.evaluate(() => window.caTest?.resetTutorial());
      await page.evaluate(() => window.caTest?.layout("console" as never));
      await seed(page, { seed: 21 });
      await page.evaluate(() => window.caTest?.setBattle({ enemyIds: ["raider"], seed: 21 } as never));
      await placement(page);
    },
    overlay: {
      open: async (page) => {
        await page.waitForFunction(() => window.caTest?.coach().active !== null, null, { timeout: READY_MS });
      },
      shown: "[data-coach-mark]",
    },
  },
  {
    id: "overlay-tap-popover",
    screen: "battle",
    prepare: (page) => fight(page, { enemyIds: ["raider"], deck: EXPLAIN_DECK, seed: 42, hull: 30, hullMax: 30 }),
    overlay: { open: tap('[data-testid="slot-why-engines"]'), shown: '[data-tap-popover="slot-why-engines"]' },
  },
];

export const RECIPES: readonly Recipe[] = [
  { id: "menu", screen: "menu", prepare: async () => undefined },
  { id: "settings", screen: "settings", prepare: go("settings") },
  { id: "hangar", screen: "hangar", prepare: metaThen("hangar") },
  { id: "chart", screen: "chart", prepare: metaThen("chart") },
  { id: "collection", screen: "collection", prepare: metaThen("collection") },
  { id: "engraving", screen: "engraving", prepare: metaThen("engraving") },
  { id: "codex", screen: "codex", prepare: go("codex") },
  { id: "modes", screen: "modes", prepare: metaThen("modes") },
  { id: "profile", screen: "profile", prepare: go("profile") },
  { id: "achievements", screen: "achievements", prepare: go("achievements") },
  { id: "contracts", screen: "contracts", prepare: metaThen("contracts") },
  { id: "leaderboard", screen: "leaderboard", prepare: go("leaderboard", { tab: "drift" }) },
  { id: "runSetup", screen: "runSetup", prepare: metaThen("runSetup") },
  { id: "map", screen: "map", prepare: async (page) => { await seed(page); } },
  { id: "map-band", screen: "map", prepare: async (page) => {
    await seed(page, { sector: 2 });
    await page.evaluate(() => {
      const api = window.caTest;
      const band = api?.band();
      const rim = band?.rim[0];
      if (api !== undefined && rim !== undefined) api.standAt(rim);
    });
  } },
  { id: "journal", screen: "journal", prepare: seedThen("journal") },
  { id: "bridge", screen: "bridge", prepare: bridgePrep },
  battle("console"),
  battle("orbit"),
  battle("tablet"),
  { id: "event", screen: "event", prepare: seedThen("event", { eventId: "wardenInspector" }) },
  { id: "puzzle", screen: "puzzle", prepare: seedThen("puzzle", { puzzleId: "emberCut" }) },
  { id: "shop", screen: "shop", prepare: scrapThen("shop") },
  { id: "shipyard", screen: "shipyard", prepare: scrapThen("shipyard") },
  { id: "rewards", screen: "rewards", prepare: async (page) => {
    await seed(page);
    await page.evaluate(() => {
      window.caTest?.rewards({ dieDrop: null, perkChoices: ["kindling", "hammerhead", "openingVolley"], entrance: "slide" } as never, {
        tally: null,
      });
    });
  } },
  { id: "summary", screen: "summary", prepare: async (page) => {
    await seed(page);
    await page.evaluate(() => {
      window.caTest?.summary({ result: { xpGain: 240, shardGain: 55, win: false, fromLevel: 3, toLevel: 3 }, run: { sectorIndex: 3 }, stats: { nodesCleared: 41, kills: 60, scrapEarned: 900 } } as never);
    });
    await go("summary")(page);
  } },
  { id: "driftSummary", screen: "driftSummary", prepare: async (page) => { await seed(page, { mode: "drift" }); await go("driftSummary")(page); } },
  { id: "prologue", screen: "prologue", prepare: go("prologue") },
  { id: "interstitial", screen: "interstitial", prepare: async (page) => { await seed(page, { land: "interstitial" }); } },
  { id: "finale", screen: "finale", prepare: seedThen("finale") },
  { id: "ending", screen: "ending", prepare: seedThen("ending", { death: "1" }) },
];
