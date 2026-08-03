import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { chromium, type Page } from "@playwright/test";

// Phase 12 acceptance driver: platform chrome, the navigation stack, safe-area
// insets, lazy chunk loading, locale switching and the diagnostics panel — plus
// the three device screenshots the landing page ships.
//
//   npm run dev                 (app, DEV globals live)
//   npx vite preview            (optional: the assembled site, for the landing)
//   E2E_SITE_URL=http://localhost:4173 tsx scripts/e2e/phase12.mts

const URL = process.env.E2E_URL ?? "http://localhost:5173";
const SITE_URL = process.env.E2E_SITE_URL ?? null;
const OUT = join(process.cwd(), "sim-out", "phase12");
const SHOTS = join(process.cwd(), "landing", "shots");
mkdirSync(OUT, { recursive: true });
mkdirSync(SHOTS, { recursive: true });

const shot = async (page: Page, name: string): Promise<string> => {
  const path = join(OUT, `${name}.png`);
  await page.screenshot({ path });
  console.log(`  shot: ${name}.png`);
  return path;
};

const screen = (page: Page): Promise<string> =>
  page.evaluate(() => window.__app?.getState().screen ?? "?") as Promise<string>;

const stack = (page: Page): Promise<string[]> =>
  page.evaluate(() => window.__app?.getState().stack ?? []) as Promise<string[]>;

const enterBattle = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    window.__flow?.startRunMode({ mode: "campaign", seed: 424242 });
  });
  await page.waitForTimeout(800);
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
  await page.waitForTimeout(1700);
  await page.evaluate(() => {
    window.__battle?.getState().dismissIntro();
  });
  await page.waitForTimeout(1000);
};

const main = async (): Promise<void> => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 780 } });
  const errors: string[] = [];
  const requests: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("request", (r) => {
    if (r.resourceType() === "script" || r.url().endsWith(".json")) {
      requests.push(r.url());
    }
  });

  await page.goto(URL, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__meta !== undefined, {
    timeout: 20000,
  });
  const report: Record<string, unknown> = {};

  await page.evaluate(() => {
    window.__meta?.setState({
      level: 24,
      xp: 3000,
      shards: 4000,
      themes: ["deepSpace", "terminal", "blueprint", "aurora"],
      tutorialSeen: ["place", "endTurn", "reroll", "nudge", "jump"],
    });
  });
  await page.waitForTimeout(500);

  // ── navigation stack: deep in, back out, no dead ends ──────────────────────
  await page.evaluate(() => {
    window.__app?.getState().go("hangar");
  });
  await page.waitForTimeout(250);
  await page.evaluate(() => {
    window.__app?.getState().go("engraving");
  });
  await page.waitForTimeout(250);
  const deepStack = await stack(page);
  await page.evaluate(() => {
    window.__app?.getState().back();
  });
  await page.waitForTimeout(250);
  const afterOneBack = await screen(page);
  await page.evaluate(() => {
    window.__app?.getState().back();
  });
  await page.waitForTimeout(250);
  const afterTwoBacks = await screen(page);
  report.navigation = {
    deepStack,
    afterOneBack,
    afterTwoBacks,
    rootHasNoBack: (await stack(page)).length === 0,
  };

  // ── start-param routing: the /daily deep link target ───────────────────────
  await page.evaluate(() => {
    window.__app?.getState().go("modes", { focus: "daily" });
  });
  await page.waitForTimeout(600);
  await shot(page, "modes-daily-focus");
  report.startParamScreen = await screen(page);

  // ── safe-area insets: a simulated notch must shrink the content box ────────
  const insetProbe = await page.evaluate(() => {
    const root = document.documentElement;
    const before = getComputedStyle(root).getPropertyValue("--ca-vh").trim();
    root.style.setProperty("--tg-viewport-safe-area-inset-top", "44px");
    root.style.setProperty("--tg-viewport-safe-area-inset-bottom", "34px");
    const probe = document.createElement("div");
    probe.style.height = "var(--ca-vh)";
    document.body.appendChild(probe);
    const height = probe.getBoundingClientRect().height;
    probe.remove();
    const scrolls = document.documentElement.scrollWidth > window.innerWidth;
    return { before, height, viewport: window.innerHeight, scrolls };
  });
  await page.waitForTimeout(300);
  await shot(page, "safe-area-insets");
  report.safeArea = insetProbe;
  await page.evaluate(() => {
    document.documentElement.style.removeProperty(
      "--tg-viewport-safe-area-inset-top",
    );
    document.documentElement.style.removeProperty(
      "--tg-viewport-safe-area-inset-bottom",
    );
  });

  // ── locales: uk and ru arrive as lazy chunks, not with the main bundle ─────
  const localeSamples: Record<string, string> = {};
  for (const locale of ["en", "uk", "ru"] as const) {
    await page.evaluate((id) => {
      window.__settings?.getState().setLocale(id as never);
    }, locale);
    await page.waitForTimeout(700);
    await page.evaluate(() => {
      window.__app?.getState().go("settings");
    });
    await page.waitForTimeout(400);
    localeSamples[locale] = await page
      .locator("h2")
      .first()
      .innerText()
      .catch(() => "?");
    if (locale === "uk") await shot(page, "settings-uk");
  }
  await page.evaluate(() => {
    window.__settings?.getState().setLocale("en" as never);
  });
  await page.waitForTimeout(500);
  report.localeSamples = localeSamples;

  // ── diagnostics panel: version + this session's errors, self-serve ─────────
  await page.evaluate(() => {
    window.__app?.getState().go("settings");
  });
  await page.waitForTimeout(400);
  const diagnostics = page.getByRole("button", { name: /Diagnostics/i });
  if ((await diagnostics.count()) > 0) {
    await diagnostics.first().click();
    await page.waitForTimeout(300);
  }
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
  });
  await page.waitForTimeout(300);
  await shot(page, "settings-diagnostics");
  report.diagnosticsVisible = (await diagnostics.count()) > 0;

  await page.evaluate(() => {
    window.__app?.getState().go("menu");
  });
  await page.waitForTimeout(900);
  const menuShot = await shot(page, "menu");

  // ── the run: map (battle chunk prefetch) then the battle itself ────────────
  await enterBattle(page);
  const battleShot = await shot(page, "battle");
  report.perfBattle = await page.evaluate(() => window.__perf?.() ?? {});

  await page.evaluate(() => {
    window.__app?.getState().go("map");
  });
  await page.waitForTimeout(1200);
  const mapShot = await shot(page, "map");

  report.chunks = {
    battleRequested: requests.some((url) => url.includes("BattleScreen")),
    localeChunks: requests.filter((url) => /content-.*\.js/.test(url)).length,
  };

  // The landing ships these three; regenerating them here keeps the marketing
  // page honest about what the build actually looks like.
  copyFileSync(menuShot, join(SHOTS, "menu.png"));
  copyFileSync(battleShot, join(SHOTS, "battle.png"));
  copyFileSync(mapShot, join(SHOTS, "map.png"));
  console.log("  landing shots written to landing/shots/");

  // ── the assembled site, if a preview server is running ─────────────────────
  if (SITE_URL !== null) {
    const site = await browser.newPage({
      viewport: { width: 1280, height: 900 },
    });
    await site.goto(SITE_URL, { waitUntil: "networkidle" });
    await site.screenshot({ path: join(OUT, "landing-desktop.png") });
    const mobile = await browser.newPage({
      viewport: { width: 390, height: 780 },
    });
    await mobile.goto(SITE_URL, { waitUntil: "networkidle" });
    await mobile.screenshot({
      path: join(OUT, "landing-mobile.png"),
      fullPage: true,
    });
    report.landing = {
      title: await site.title(),
      ogImage: await site
        .locator('meta[property="og:image"]')
        .getAttribute("content"),
      horizontalScroll: await mobile.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      ),
      playHref: await site.locator("#play-web").getAttribute("href"),
      telegramHref: await site.locator("#play-tg").getAttribute("href"),
    };
    await site.close();
    await mobile.close();
    console.log("  shot: landing-desktop.png, landing-mobile.png");
  }

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
  console.log("e2e phase12: no console errors");
};

void main();
