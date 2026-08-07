import { mkdirSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { chromium, type Browser, type Page } from "@playwright/test";

// R7 acceptance driver: the axis meter, the run journal, the death epilogue, the
// memory ceremony, chain markers and the beacon ceremony — driven through the
// real flow hooks at phone and desktop widths.
//
//   npm run dev
//   tsx scripts/e2e/r7.mts

const URL = process.env.E2E_URL ?? "http://localhost:5173";
const OUT = join(process.cwd(), "sim-out", "r7");
mkdirSync(OUT, { recursive: true });

const PHONE = { width: 390, height: 780 };
const DESKTOP = { width: 1440, height: 900 };

const failures: string[] = [];

const check = (label: string, ok: boolean, detail = ""): void => {
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label}${detail === "" ? "" : ` — ${detail}`}`);
  if (!ok) failures.push(label);
};

const shot = async (page: Page, name: string): Promise<void> => {
  await page.screenshot({ path: join(OUT, `${name}.png`) });
};

const screen = (page: Page): Promise<string> =>
  page.evaluate(() => window.__app?.getState().screen ?? "?") as Promise<string>;

const openPage = async (
  browser: Browser,
  viewport: { width: number; height: number },
): Promise<Page> => {
  const page = await browser.newPage({ viewport });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto(URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  Object.assign(page, { __errors: errors });
  return page;
};

// A fresh run now opens on the sector-1 arrival interstitial, so the driver
// walks through it the way a player does.
const startRun = async (page: Page, seed = 909090): Promise<void> => {
  await page.evaluate((s) => {
    window.__flow?.startRunMode({ mode: "campaign", seed: s });
  }, seed);
  await page.waitForTimeout(700);
  const enter = page.locator("[data-interstitial-enter]");
  if ((await enter.count()) > 0) {
    await enter.click();
    await page.waitForTimeout(500);
  }
};

const jumpToType = async (page: Page, type: string): Promise<boolean> =>
  page.evaluate((t) => {
    const run = window.__run?.getState();
    const map = run?.map;
    const pos = run?.position;
    if (map == null || pos == null) return false;
    const target = map.nodes.find(
      (n) =>
        n.type === t &&
        map.edges.some(
          ([a, b]) => (a === pos && b === n.id) || (b === pos && a === n.id),
        ),
    );
    if (target === undefined) return false;
    return window.__flow?.jumpTo(target.id) ?? false;
  }, type);

const main = async (): Promise<void> => {
  const browser = await chromium.launch();

  console.log("R7 · axis meter");
  const phone = await openPage(browser, PHONE);
  await startRun(phone);
  check("map screen reached", (await screen(phone)) === "map");
  await shot(phone, "map-phone");
  const meterOnMap = await phone.locator("[data-axis-meter]").count();
  check("axis meter on map header", meterOnMap > 0, `${String(meterOnMap)} meters`);

  const desktop = await openPage(browser, DESKTOP);
  await startRun(desktop);
  await shot(desktop, "map-desktop");
  check(
    "axis meter on desktop map",
    (await desktop.locator("[data-axis-meter]").count()) > 0,
  );

  console.log("R7 · event screen");
  for (const [name, page] of [
    ["phone", phone],
    ["desktop", desktop],
  ] as const) {
    const jumped = await jumpToType(page, "event");
    if (!jumped) {
      check(`event node reachable (${name})`, false);
      continue;
    }
    await page.waitForTimeout(600);
    check(`event screen (${name})`, (await screen(page)) === "event");
    await shot(page, `event-${name}`);
    check(
      `axis meter on event (${name})`,
      (await page.locator("[data-axis-meter]").count()) > 0,
    );
    const option = page.locator("[data-event-option]:not([disabled])").first();
    if ((await option.count()) > 0) {
      await option.click();
      await page.waitForTimeout(500);
      const roll = page.locator("[data-check-roll]");
      if ((await roll.count()) > 0) {
        await roll.click();
        await page.waitForTimeout(400);
        await page.locator("[data-check-confirm]").click();
        await page.waitForTimeout(400);
      }
      await shot(page, `event-outcome-${name}`);
    } else {
      check(`event offers a playable option (${name})`, false);
    }
  }

  console.log("R7 · journal");
  for (const [name, page] of [
    ["phone", phone],
    ["desktop", desktop],
  ] as const) {
    await page.evaluate(() => {
      window.__app?.getState().go("journal");
    });
    await page.waitForTimeout(500);
    check(`journal screen (${name})`, (await screen(page)) === "journal");
    await shot(page, `journal-${name}`);
    const entries = await page.locator("[data-journal-entry]").count();
    check(`journal has entries (${name})`, entries > 0, `${String(entries)} rows`);
  }

  console.log("R7 · chains");
  await desktop.evaluate(() => {
    const run = window.__run?.getState();
    run?.setFlag("maraFriend");
    run?.setFlag("maraDebt");
  });
  await desktop.evaluate(() => {
    window.__app?.getState().go("journal");
  });
  await desktop.waitForTimeout(500);
  const chainRows = await desktop.locator("[data-journal-chain]").count();
  check("journal tracks all four chains", chainRows === 4, `${String(chainRows)} rows`);
  await shot(desktop, "journal-chains");
  // Mara's favour step lives in sectors 3–4, and a marker is only honest if the
  // seeded draw for that node really is the chain scene — so the driver walks a
  // few maps until one of them can host it.
  let markers = 0;
  let markerSeed = 0;
  for (const seed of [909090, 12345, 24680, 13579, 55555, 77777]) {
    await startRun(desktop, seed);
    await desktop.evaluate(() => {
      const run = window.__run?.getState();
      run?.setFlag("maraFriend");
      run?.setFlag("maraDebt");
      window.__flow?.advanceSector();
      window.__flow?.advanceSector();
      // A marker behind the fog is not rendered, which is correct — so the
      // driver buys the sensor range a deep scan would give it.
      window.__run?.getState().addBonusReveal(8);
      window.__app?.getState().go("map");
    });
    await desktop.waitForTimeout(700);
    markers = await desktop.locator("[data-chain-marker]").count();
    markerSeed = seed;
    if (markers > 0) break;
  }
  check(
    "map marks nodes that can host a live step",
    markers > 0,
    `seed ${String(markerSeed)}, ${String(markers)} markers`,
  );
  await shot(desktop, "map-chain-markers");

  console.log("R7 · beacon ceremony");
  await startRun(desktop);
  await desktop.evaluate(() => {
    window.__app?.getState().go("event", { eventId: "beaconKeeperIntro" });
  });
  await desktop.waitForTimeout(600);
  check(
    "beacon scene carries its counter",
    (await desktop.locator("[data-beacon-counter]").count()) > 0,
  );
  check(
    "beacon scene names its speaker",
    (await desktop.locator("[data-speaker]").count()) > 0,
  );
  await shot(desktop, "beacon-ceremony");

  console.log("R7 · death epilogue");
  await phone.evaluate(() => {
    window.__flow?.endRun(false);
  });
  await phone.waitForTimeout(700);
  check("death routes to the epilogue", (await screen(phone)) === "ending");
  await shot(phone, "death-epilogue");
  const deathLines = await phone.locator("[data-epilogue-line]").count();
  check("death epilogue carries tally lines", deathLines > 0, `${String(deathLines)} lines`);
  await phone.locator("[data-epilogue-continue]").click();
  await phone.waitForTimeout(600);
  check("epilogue hands over to the summary", (await screen(phone)) === "summary");
  await shot(phone, "death-summary");

  console.log("R7 · memory ceremony");
  await startRun(desktop);
  await desktop.evaluate(() => {
    window.__run?.getState().bumpStats({ bosses: 1 });
    window.__narrative?.getState().pushMemory(1);
  });
  await desktop.waitForTimeout(500);
  check(
    "memory ceremony modal",
    (await desktop.locator("[data-memory-ceremony]").count()) > 0,
  );
  await shot(desktop, "memory-ceremony");
  await desktop.locator("[data-memory-continue]").click();
  await desktop.waitForTimeout(300);
  check(
    "ceremony dismisses",
    (await desktop.locator("[data-memory-ceremony]").count()) === 0,
  );

  console.log("R7 · codex silhouettes");
  await desktop.evaluate(() => {
    window.__app?.getState().go("codex");
  });
  await desktop.waitForTimeout(700);
  const hints = await desktop.locator("[data-memory-hint]").count();
  check("locked memories show unlock hints", hints > 0, `${String(hints)} hints`);
  await shot(desktop, "codex-memories");

  const errors = [
    ...((phone as unknown as { __errors: string[] }).__errors ?? []),
    ...((desktop as unknown as { __errors: string[] }).__errors ?? []),
  ].filter((e) => !e.includes("favicon"));
  check("no console errors", errors.length === 0, errors.slice(0, 3).join(" | "));

  await browser.close();
  console.log(
    failures.length === 0
      ? `r7: all checks passed — shots in ${OUT}`
      : `r7: ${String(failures.length)} FAILED — ${failures.join(", ")}`,
  );
  if (failures.length > 0) process.exit(1);
};

void main();
