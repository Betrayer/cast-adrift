import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const URL = process.env.E2E_URL ?? "http://localhost:5173";
const OUT = join(process.cwd(), "sim-out", "phase10");
mkdirSync(OUT, { recursive: true });

const shot = async (
  page: import("@playwright/test").Page,
  name: string,
): Promise<void> => {
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
  await page.waitForFunction(() => window.__meta !== undefined, {
    timeout: 20000,
  });

  // A level-30 profile with a broad collection: the engraving station is live
  // and there is something to engrave.
  await page.evaluate(() => {
    window.__meta?.setState({
      level: 32,
      xp: 4000,
      shards: 4000,
      chartPicks: ["hub-i0", "hub-o0", "hub-o1"],
      collection: [
        { defId: "red-d6", count: 4 },
        { defId: "blue-d6", count: 3 },
        { defId: "ember", count: 2 },
        { defId: "magma", count: 1 },
        { defId: "coreshard", count: 1 },
        { defId: "fate-d100", count: 1 },
        { defId: "eclipse", count: 1 },
      ],
      ships: ["wanderer", "ram", "ark"],
      selectedShip: "wanderer",
      hangar: {
        deck: ["red-d6", "red-d6", "ember", "magma", "fate-d100", "blue-d6"],
      },
      engravings: {},
      badges: [],
    });
    window.__app?.getState().go("hangar");
  });
  await page.waitForTimeout(500);
  await shot(page, "01-hangar-engraving-link");

  // ── engraving station ──────────────────────────────────────────────────────
  await page.evaluate(() => window.__app?.getState().go("engraving"));
  await page.waitForTimeout(500);
  await shot(page, "02-engraving-station");

  // Fit the first engraving onto the first die and re-shoot the sockets.
  await page.evaluate(() => {
    window.__meta?.getState().engrave("magma", "sting", 60);
  });
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const badges = [...document.querySelectorAll(".mantine-Badge-root")];
    const magma = badges.find((b) => (b.textContent ?? "").includes("Magma"));
    (magma as HTMLElement | undefined)?.click();
  });
  await page.waitForTimeout(400);
  await shot(page, "03-engraving-fitted");

  // ── a run: map chip, shop modules, battle Fate button ─────────────────────
  await page.evaluate(() => {
    window.__flow?.startRunMode({ mode: "campaign", seed: 424242 });
  });
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    const run = window.__run?.getState();
    run?.addModule("magnetScoop");
    run?.addModule("solenoid");
    run?.addScrap(400);
  });
  await page.waitForTimeout(300);
  await shot(page, "04-map-module-chip");

  await page.evaluate(() => window.__app?.getState().go("shop"));
  await page.waitForTimeout(700);
  await shot(page, "05-shop-modules");

  // Battle with the Fate die in the deck: entered through the real run flow so
  // the seeded streams are the ones the game would use.
  await page.evaluate(() => {
    const run = window.__run?.getState();
    const map = run?.map;
    const pos = run?.position;
    if (map == null || pos == null) return;
    const target = map.nodes.find(
      (n) =>
        n.row > 0 &&
        (n.type === "battle" || n.type === "elite") &&
        map.edges.some(([a, b]) => (a === pos && b === n.id) || (b === pos && a === n.id)),
    );
    if (target !== undefined) window.__flow?.jumpTo(target.id);
  });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    window.__battle?.getState().dismissIntro();
  });
  await page.waitForTimeout(800);
  await shot(page, "06-battle-fate-button");

  // Roll Fate and read the verdict line.
  const rolled = await page.evaluate(() => {
    window.__battle?.getState().rollFate();
    return window.__battle?.getState().fateRoll ?? null;
  });
  console.log(`  fate roll: ${String(rolled)}`);
  await page.waitForTimeout(600);
  await shot(page, "07-battle-fate-result");

  // ── codex dossiers ────────────────────────────────────────────────────────
  await page.evaluate(() => {
    const meta = window.__meta?.getState();
    for (const id of [
      "dossier-scavDrone",
      "dossier-raider",
      "dossier-hookTug",
      "dossier-choirCantor",
      "dossier-coreHeart",
    ]) {
      meta?.unlockCodex(id);
    }
    window.__app?.getState().go("codex");
  });
  await page.waitForTimeout(500);
  await shot(page, "08-codex-dossiers");

  // ── contracts (14) ────────────────────────────────────────────────────────
  await page.evaluate(() => window.__app?.getState().go("contracts"));
  await page.waitForTimeout(500);
  await shot(page, "09-contracts");

  // ── star chart at 220 nodes ───────────────────────────────────────────────
  await page.evaluate(() => window.__app?.getState().go("chart"));
  await page.waitForSelector("svg", { timeout: 5000 });
  await page.waitForTimeout(700);
  await shot(page, "10-chart-220");

  await browser.close();
  if (errors.length > 0) {
    console.error(`e2e: ${String(errors.length)} console error(s):`);
    for (const e of errors.slice(0, 10)) console.error(`  ${e}`);
    process.exit(1);
  }
  console.log("e2e phase10: no console errors");
};

void main();
