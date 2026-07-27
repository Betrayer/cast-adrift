import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import type { Page } from "@playwright/test";

const URL = process.env.E2E_URL ?? "http://localhost:5173";
const OUT = join(process.cwd(), "sim-out", "phase8");
mkdirSync(OUT, { recursive: true });

const shot = async (page: Page, name: string): Promise<void> => {
  await page.screenshot({ path: join(OUT, `${name}.png`) });
  console.log(`  shot: ${name}.png`);
};

const goTo = async (page: Page, screen: string): Promise<void> => {
  await page.evaluate((s) => {
    window.__app?.getState().go(s as never);
  }, screen);
  await page.waitForTimeout(320);
};

const main = async (): Promise<void> => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 780 } });
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => {
    errors.push(String(e));
  });

  await page.goto(URL, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__meta !== undefined, {
    timeout: 20000,
  });

  // ── Fresh profile: menu offers the prologue ────────────────────────────────
  await page.evaluate(() => {
    window.__meta?.setState({
      level: 6,
      xp: 240,
      shards: 400,
      hangar: {
        deck: ["red-d6", "red-d6", "ember", "blue-d6", "grey-d4", "green-d4"],
      },
      collection: [
        { defId: "red-d6", count: 4 },
        { defId: "ember", count: 2 },
        { defId: "blue-d6", count: 2 },
        { defId: "grey-d4", count: 2 },
        { defId: "green-d4", count: 2 },
      ],
      ships: ["wanderer"],
      selectedShip: "wanderer",
      codex: [],
      codexRead: [],
      bossFirstKills: [],
      endings: [],
      ascension: { campaign: 0 },
      stats: {
        runs: 0,
        wins: 0,
        shardsEarned: 0,
        prologueDone: false,
        campaignClears: 0,
        kills: 0,
        scrapEarned: 0,
        deepestDrift: 0,
        driftRuns: 0,
        dailyRuns: 0,
        contractRuns: 0,
      },
    });
    window.__app?.getState().go("menu");
  });
  await page.waitForTimeout(400);
  await shot(page, "01-menu-fresh");

  // ── Prologue beats ────────────────────────────────────────────────────────
  await goTo(page, "prologue");
  await shot(page, "02-prologue-beat1");
  for (let i = 0; i < 3; i += 1) {
    await page.getByRole("button").first().click();
    await page.waitForTimeout(280);
  }
  await shot(page, "03-prologue-beat4");

  // Last CTA starts the scripted first battle inside a real run.
  await page.getByRole("button").first().click();
  await page.waitForTimeout(900);
  await shot(page, "04-prologue-battle");

  const scripted = await page.evaluate(() => ({
    screen: window.__app?.getState().screen,
    scriptedSlots: window.__battle?.getState().scriptedSlots,
    runActive: window.__run?.getState().active,
    sector: window.__run?.getState().sector,
  }));
  console.log("  prologue battle:", JSON.stringify(scripted));

  // ── Run setup with ascension unlocked ─────────────────────────────────────
  await page.evaluate(() => {
    window.__meta?.setState({ ascension: { campaign: 3 } });
  });
  await goTo(page, "runSetup");
  await shot(page, "05-run-setup");
  const aButtons = page.getByRole("button", { name: /^A[123]$/ });
  if ((await aButtons.count()) > 0) {
    await aButtons.last().click();
    await page.waitForTimeout(250);
    await shot(page, "06-run-setup-a3");
  }

  // ── Sector 1 map (real run) ───────────────────────────────────────────────
  await page.evaluate(() => {
    window.__run?.setState({ ascension: 0 });
    window.__app?.getState().go("map");
  });
  await page.waitForTimeout(600);
  await shot(page, "07-map-sector1");

  // Reveal the whole map and select the mini-boss gate to see the intent line.
  await page.evaluate(() => {
    window.__run?.setState({ bonusReveal: 14 });
  });
  await page.waitForTimeout(300);
  const gateNode = await page.evaluate(() => {
    const run = window.__run?.getState();
    const node = run?.map?.nodes.find((n) => n.type === "miniboss");
    return node?.id ?? null;
  });
  console.log("  gate node:", gateNode);
  await shot(page, "08-map-revealed");

  // ── Boss intro card: stand one row below the boss and jump into it ────────
  await page.evaluate(() => {
    const run = window.__run?.getState();
    const map = run?.map;
    if (run === undefined || map === null || map === undefined) return;
    const boss = map.nodes.find((n) => n.type === "boss");
    const prev = map.nodes.find(
      (n) => n.row === (boss?.row ?? 15) - 1 && n.type !== "boss",
    );
    if (boss === undefined || prev === undefined) return;
    const hasEdge = map.edges.some(
      ([a, b]) => a === prev.id && b === boss.id,
    );
    window.__run?.setState({
      position: prev.id,
      depthRow: prev.row,
      visited: [prev.id],
      map: hasEdge
        ? map
        : { nodes: map.nodes, edges: [...map.edges, [prev.id, boss.id]] },
      bonusReveal: 14,
    });
    window.__app?.getState().go("menu");
  });
  await goTo(page, "map");
  await page.waitForTimeout(500);
  await shot(page, "09-map-at-boss-row");

  const clicked = await page.evaluate(() => {
    const groups = [...document.querySelectorAll("svg g")];
    for (const g of groups) {
      const label = g.querySelector("text")?.textContent ?? "";
      if (label === "Boss") {
        g.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        return true;
      }
    }
    return false;
  });
  console.log("  boss node clicked:", clicked);
  await page.waitForTimeout(300);
  await shot(page, "10-boss-selected");

  const jump = page.getByRole("button", { name: /Jump|Прыжок|Стрибок/i });
  if ((await jump.count()) > 0 && (await jump.first().isEnabled())) {
    await jump.first().click();
    await page.waitForTimeout(1400);
  }
  await shot(page, "11-boss-intro");
  const introState = await page.evaluate(() => ({
    screen: window.__app?.getState().screen,
    introPending: window.__battle?.getState().introPending,
    introEnemyId: window.__battle?.getState().introEnemyId,
    enemies: window.__battle?.getState().enemies.map((e) => e.defId),
  }));
  console.log("  boss intro:", JSON.stringify(introState));

  const begin = page.getByRole("button", { name: /Begin|Начать|Почати/i });
  if ((await begin.count()) > 0) {
    await begin.first().click();
    await page.waitForTimeout(700);
  }
  await shot(page, "12-boss-fight");

  // ── Mini-boss reward package ──────────────────────────────────────────────
  await page.evaluate(() => {
    window.__battle?.getState().reset();
    window.__run?.getState().addVoucher(1);
    window.__run?.getState().setPendingRewards({
      dieDrop: null,
      perkChoices: ["overclock", "ricochet", "compost"],
      dieChoices: ["vulture", "obsidian"],
      voucher: true,
      packageScrap: 36,
    });
    window.__app?.getState().go("rewards");
  });
  await page.waitForTimeout(500);
  await shot(page, "13-miniboss-package");

  await page.getByRole("button", { name: /Take|Взять|Взяти|Sell|Продать/i })
    .first()
    .click()
    .catch(() => undefined);
  await page.waitForTimeout(500);
  await shot(page, "14-package-perk-draft");

  // ── Shipyard voucher ──────────────────────────────────────────────────────
  await page.evaluate(() => {
    window.__run?.getState().setPendingRewards(null);
    window.__run?.setState({ scrap: 120, vouchers: 1 });
    window.__app?.getState().go("shipyard");
  });
  await page.waitForTimeout(400);
  await shot(page, "15-shipyard-voucher");
  const free = page.getByRole("button", { name: /Free|Бесплатно|Безкоштовно/i });
  if ((await free.count()) > 0) {
    await free.first().click();
    await page.waitForTimeout(300);
  }
  const afterVoucher = await page.evaluate(() => ({
    vouchers: window.__run?.getState().vouchers,
    mk: window.__run?.getState().mkLevels,
  }));
  console.log("  after voucher:", JSON.stringify(afterVoucher));
  await shot(page, "16-shipyard-after-voucher");

  // ── Sector interstitial ───────────────────────────────────────────────────
  for (const sector of [2, 3, 4, 5]) {
    await page.evaluate((s) => {
      window.__run?.setState({ sector: s });
      window.__app?.getState().go("interstitial");
    }, sector);
    await page.waitForTimeout(700);
    await shot(page, `17-interstitial-s${String(sector)}`);
  }

  // ── Beacon scene ──────────────────────────────────────────────────────────
  await page.evaluate(() => {
    window.__run?.setState({ sector: 1, seenEvents: [] });
    const run = window.__run?.getState();
    const beacon = run?.map?.nodes.find((n) => n.type === "beacon");
    if (beacon !== undefined) {
      window.__run?.setState({ position: beacon.id, depthRow: beacon.row });
    }
    window.__app?.getState().go("event");
  });
  await page.waitForTimeout(600);
  await shot(page, "18-beacon-s1");

  // ── Finale with everything earned ─────────────────────────────────────────
  await page.evaluate(() => {
    window.__run?.setState({
      sector: 5,
      axis: 4,
      flags: {
        beacon1: true,
        beacon2: true,
        beacon3: true,
        beacon4: true,
        beacon5: true,
        silentReady: true,
        crewSaved: true,
        pactSealed: true,
        maraFriend: true,
        yusufFriend: true,
        courierFreed: true,
        refusedChoir: true,
        hunterEngaged: true,
      },
    });
    window.__app?.getState().go("finale");
  });
  await page.waitForTimeout(500);
  await shot(page, "19-finale-all-earned");
  const finaleOptions = await page.evaluate(() =>
    [...document.querySelectorAll("button")].map((b) => b.textContent),
  );
  console.log("  finale options:", JSON.stringify(finaleOptions));

  // Thin-margin fallback
  await page.evaluate(() => {
    window.__run?.setState({ axis: 1, flags: {} });
    window.__app?.getState().go("menu");
  });
  await page.waitForTimeout(200);
  await goTo(page, "finale");
  await shot(page, "20-finale-thin");

  // ── Ending scene + epilogue tally ─────────────────────────────────────────
  await page.evaluate(() => {
    window.__run?.setState({
      axis: 4,
      endingId: "silent",
      ascension: 2,
      flags: {
        beacon1: true,
        beacon2: true,
        beacon3: true,
        beacon4: true,
        beacon5: true,
        silentReady: true,
        crewSaved: true,
        maraFriend: true,
        yusufFriend: true,
        courierFreed: true,
        refusedChoir: true,
        hunterEngaged: true,
        survivedLethal: true,
      },
    });
    window.__app?.getState().go("ending");
  });
  await page.waitForTimeout(500);
  await shot(page, "21-ending-beat1");
  for (let i = 0; i < 4; i += 1) {
    const next = page.getByRole("button").first();
    if ((await next.count()) === 0) break;
    await next.click();
    await page.waitForTimeout(320);
  }
  await shot(page, "22-ending-tally");

  // ── Codex: Echo memory section ────────────────────────────────────────────
  await page.evaluate(() => {
    const meta = window.__meta?.getState();
    for (let i = 1; i <= 11; i += 1) meta?.unlockCodex(`memory-${String(i)}`);
    meta?.unlockCodex("memory-12-silent");
    meta?.unlockCodex("keeperCreed");
    window.__app?.getState().go("codex");
  });
  await page.waitForTimeout(500);
  await shot(page, "23-codex-memories");
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
    document.querySelector("[data-scrollarea-viewport]")?.scrollTo(0, 2000);
  });
  await page.waitForTimeout(300);
  await shot(page, "24-codex-scrolled");

  // ── Menu resume card ──────────────────────────────────────────────────────
  await page.evaluate(() => {
    window.__run?.setState({ active: true, sector: 3, depthRow: 7 });
  });
  await page.evaluate(() => {
    window.__app?.getState().go("map");
  });
  await page.waitForTimeout(200);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__meta !== undefined, {
    timeout: 20000,
  });
  await page.waitForTimeout(800);
  await shot(page, "25-menu-resume-card");

  const abandon = page.getByRole("button", {
    name: /Leave it|Оставить|Залишити/i,
  });
  if ((await abandon.count()) > 0) {
    await abandon.first().click();
    await page.waitForTimeout(400);
    await shot(page, "26-abandon-confirm");
    const keep = page.getByRole("button", {
      name: /Keep it|Оставить забег|Лишити забіг/i,
    });
    if ((await keep.count()) > 0) await keep.first().click();
  }

  await browser.close();

  if (errors.length > 0) {
    console.error(`\nconsole errors (${String(errors.length)}):`);
    for (const e of errors.slice(0, 20)) console.error(`  ${e}`);
    process.exitCode = 1;
    return;
  }
  console.log("\nno console errors");
};

void main();
