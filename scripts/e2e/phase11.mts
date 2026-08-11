import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Page } from "@playwright/test";

const URL = process.env.E2E_URL ?? "http://localhost:5173";
const OUT = join(process.cwd(), "sim-out", "phase11");
mkdirSync(OUT, { recursive: true });

const THEMES = ["deepSpace", "terminal", "blueprint", "aurora"] as const;

const shot = async (page: Page, name: string): Promise<void> => {
  await page.screenshot({ path: join(OUT, `${name}.png`) });
  console.log(`  shot: ${name}.png`);
};

// Measured to the frame that actually paints the new skin, not just to the
// end of the store write.
const setTheme = async (page: Page, theme: string): Promise<number> =>
  page.evaluate(
    (id) =>
      new Promise<number>((resolve) => {
        const start = performance.now();
        window.__settings?.getState().setTheme(id as never);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve(performance.now() - start);
          });
        });
      }),
    theme,
  );

const perf = async (page: Page): Promise<Record<string, number>> =>
  page.evaluate(() => window.__perf?.() ?? {}) as Promise<
    Record<string, number>
  >;

const enterBattle = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    window.__flow?.startRunMode({ mode: "campaign", seed: 909090 });
  });
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    const run = window.__run?.getState();
    const map = run?.map;
    const pos = run?.position;
    if (map == null || pos == null) return;
    const target = map.nodes.find(
      (n) =>
        n.row > 0 &&
        (n.type === "battle" || n.type === "elite") &&
        map.edges.some(
          ([a, b]) => (a === pos && b === n.id) || (b === pos && a === n.id),
        ),
    );
    if (target !== undefined) window.__flow?.jumpTo(target.id);
  });
  await page.waitForTimeout(1600);
  await page.evaluate(() => {
    window.__battle?.getState().dismissIntro();
  });
  await page.waitForTimeout(900);
};

const main = async (): Promise<void> => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 780 } });
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto(URL, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__meta !== undefined, {
    timeout: 20000,
  });

  // A profile that owns every theme so the picker shows the "unlocked" path,
  // with the tutorial untouched so the coach marks are live.
  await page.evaluate(() => {
    window.__meta?.setState({
      level: 24,
      xp: 3000,
      shards: 4000,
      themes: ["deepSpace", "terminal", "blueprint", "aurora"],
      tutorialSeen: [],
    });
  });
  await page.waitForTimeout(400);

  const report: Record<string, unknown> = {};

  // ── menu across the four themes ───────────────────────────────────────────
  for (const theme of THEMES) {
    await setTheme(page, theme);
    await page.waitForTimeout(450);
    await shot(page, `menu-${theme}`);
  }
  await setTheme(page, "deepSpace");
  await page.waitForTimeout(300);

  // ── settings: theme picker, font size, battle speed ───────────────────────
  await page.evaluate(() => window.__app?.getState().go("settings"));
  await page.waitForTimeout(400);
  await shot(page, "settings-themes");

  await page.evaluate(() => window.__settings?.getState().setFontScale("l"));
  await page.waitForTimeout(300);
  await shot(page, "settings-font-large");
  await page.evaluate(() => window.__settings?.getState().setFontScale("m"));
  await page.waitForTimeout(200);

  // ── codex glyph legend ────────────────────────────────────────────────────
  await page.evaluate(() => window.__app?.getState().go("codex"));
  await page.waitForTimeout(400);
  await shot(page, "codex-glyph-legend");

  // ── battle: coach marks, then a live theme switch mid-fight ───────────────
  await enterBattle(page);
  await page.waitForTimeout(700);
  await shot(page, "battle-coachmark-place");
  report.perfBattleBaseline = await perf(page);

  await page.evaluate(() => {
    const meta = window.__meta?.getState();
    for (const id of ["place", "endTurn", "reroll", "nudge"]) {
      meta?.markTutorialSeen(id);
    }
  });
  await page.waitForTimeout(500);

  const switchMs: Record<string, number> = {};
  for (const theme of THEMES) {
    switchMs[theme] = await setTheme(page, theme);
    await page.waitForTimeout(500);
    await shot(page, `battle-${theme}`);
  }
  report.themeSwitchMs = switchMs;
  report.perfBattleAfterThemes = await perf(page);

  // The Fate ceremony: the component watches `fateUses`, so bumping it is the
  // same trigger the real roll uses.
  await page.evaluate(() => {
    window.__battle?.setState({ fateUses: 1 });
  });
  await page.waitForTimeout(220);
  await shot(page, "battle-fate-invocation");
  await page.evaluate(() => {
    window.__battle?.setState({ fateUses: 0 });
  });

  await setTheme(page, "deepSpace");
  await page.waitForTimeout(400);

  // ── map across themes ─────────────────────────────────────────────────────
  await page.evaluate(() => window.__app?.getState().go("map"));
  await page.waitForTimeout(900);
  await shot(page, "map-coachmark-jump");
  await page.evaluate(() => {
    window.__meta?.getState().markTutorialSeen("jump");
  });
  await page.waitForTimeout(300);
  for (const theme of ["terminal", "blueprint"] as const) {
    await setTheme(page, theme);
    await page.waitForTimeout(400);
    await shot(page, `map-${theme}`);
  }
  await setTheme(page, "deepSpace");

  // ── level-up ceremony (particle rain) ─────────────────────────────────────
  await page.evaluate(() => {
    window.__summary?.getState().setResult({
      xpGain: 420,
      shardGain: 90,
      shards: {
        sectors: 0,
        beacons: 0,
        firstEnding: 0,
        hullClear: 0,
        streak: 0,
        ascension: 0,
        total: 0,
      },
      findShards: 0,
      firstFinds: [],
      achievements: [],
      achievementShards: 0,
      unlocks: [],
      unlockIds: [],
      fromLevel: 24,
      toLevel: 26,
      win: true,
      milestones: [],
      mode: "campaign",
      score: null,
      contractId: null,
      contractStars: 0,
      rotation: [],
    });
    window.__app?.getState().go("summary");
  });
  await page.waitForTimeout(900);
  await shot(page, "levelup-particle-rain");

  // Reduced motion: every ceremony must still render, just without the tween.
  await page.evaluate(() => {
    window.__settings?.getState().setReducedMotion("on");
    window.__app?.getState().go("summary");
  });
  await page.waitForTimeout(600);
  await shot(page, "levelup-reduced-motion");
  await page.evaluate(() => {
    window.__settings?.getState().setReducedMotion("auto");
  });

  report.perfFinal = await perf(page);
  writeFileSync(
    join(OUT, "report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  console.log(JSON.stringify(report, null, 2));

  await browser.close();
  if (errors.length > 0) {
    console.error(`e2e: ${String(errors.length)} console error(s):`);
    for (const e of errors.slice(0, 10)) console.error(`  ${e}`);
    process.exit(1);
  }
  console.log("e2e phase11: no console errors");
};

void main();
