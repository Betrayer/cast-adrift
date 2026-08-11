import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const URL = process.env.E2E_URL ?? "http://localhost:5173";
const OUT = join(process.cwd(), "sim-out", "phase7");
mkdirSync(OUT, { recursive: true });

const shot = async (page: import("@playwright/test").Page, name: string) => {
  await page.screenshot({ path: join(OUT, `${name}.png`) });
  console.log(`  shot: ${name}.png`);
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
  await page.waitForFunction(() => window.__meta !== undefined, { timeout: 20000 });

  // Seed a mid-game meta state
  await page.evaluate(() => {
    window.__meta?.setState({
      level: 8,
      xp: 377,
      shards: 900,
      chartPicks: ["red-gate", "red-s1", "red-s4"],
      collection: [
        { defId: "red-d6", count: 4 },
        { defId: "blue-d6", count: 3 },
        { defId: "green-d4", count: 2 },
        { defId: "black-d6", count: 2 },
        { defId: "vulture", count: 1 },
        { defId: "coreshard", count: 1 },
      ],
      ships: ["wanderer", "ram"],
      selectedShip: "wanderer",
      hangar: { deck: ["red-d6", "red-d6", "blue-d6", "grey-d4", "green-d4"] },
    });
    window.__app?.getState().go("menu");
  });
  await page.waitForTimeout(400);
  await shot(page, "01-menu-level-ring");

  // Star Chart
  await page.evaluate(() => window.__app?.getState().go("chart"));
  await page.waitForSelector("svg", { timeout: 5000 });
  await page.waitForTimeout(500);
  await shot(page, "02-chart");
  // tap a keystone node to open the side card
  await page.evaluate(() => {
    const el = document.querySelector('rect[transform*="rotate"]');
    (el as SVGElement | null)?.dispatchEvent(
      new PointerEvent("pointerup", { bubbles: true }),
    );
  });
  await page.waitForTimeout(300);
  await shot(page, "03-chart-node-card");

  // Hangar
  await page.evaluate(() => window.__app?.getState().go("hangar"));
  await page.waitForTimeout(500);
  await shot(page, "04-hangar");
  const shopTab = page.getByText("Meta Shop", { exact: false });
  if (await shopTab.count()) {
    await shopTab.first().click();
    await page.waitForTimeout(300);
    await shot(page, "05-hangar-shop");
  }

  // Collection
  await page.evaluate(() => window.__app?.getState().go("collection"));
  await page.waitForTimeout(400);
  await shot(page, "06-collection");

  // Summary + level-up ceremony
  await page.evaluate(() => {
    window.__summary?.getState().setResult({
      xpGain: 377,
      shardGain: 108,
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
      fromLevel: 1,
      toLevel: 8,
      win: true,
      milestones: ["meta:milestone.budget"],
      mode: "campaign",
      score: null,
      contractId: null,
      contractStars: 0,
      rotation: [],
    });
    window.__app?.getState().go("summary");
  });
  await page.waitForTimeout(300);
  await shot(page, "07-summary-countup");
  await page.waitForTimeout(1200);
  await shot(page, "08-levelup-ceremony");

  await browser.close();

  if (errors.length > 0) {
    console.log(`\nCONSOLE ERRORS (${String(errors.length)}):`);
    for (const e of errors.slice(0, 20)) console.log(`  ! ${e}`);
    process.exit(1);
  }
  console.log(`\nOK — 8 screenshots in ${OUT}, no console errors`);
};

void main().catch((e: unknown) => {
  console.error("e2e failed:", e);
  process.exit(1);
});
