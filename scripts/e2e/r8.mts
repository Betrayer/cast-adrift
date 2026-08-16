import { mkdirSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { chromium, type Browser, type Page } from "@playwright/test";

const URL = process.env.E2E_URL ?? "http://localhost:5173";
const OUT = join(process.cwd(), "sim-out", "r8");
mkdirSync(OUT, { recursive: true });

const PHONE = { width: 390, height: 780 };
const DESKTOP = { width: 1440, height: 900 };

const failures: string[] = [];

const check = (label: string, ok: boolean, detail = ""): void => {
  console.log(
    `  ${ok ? "ok  " : "FAIL"} ${label}${detail === "" ? "" : ` — ${detail}`}`,
  );
  if (!ok) failures.push(label);
};

const shot = async (page: Page, name: string): Promise<void> => {
  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: false });
};

const screen = (page: Page): Promise<string> =>
  page.evaluate(() => window.__app?.getState().screen ?? "?") as Promise<string>;

const go = async (page: Page, id: string): Promise<void> => {
  await page.evaluate((s) => {
    window.__app?.getState().go(s as never);
  }, id);
  await page.waitForTimeout(500);
};

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

const selectSegment = async (page: Page, value: string): Promise<void> => {
  await page.locator(`[data-hangar-tab="${value}"]`).first().click();
  await page.waitForTimeout(400);
};

const setMeta = async (
  page: Page,
  patch: Record<string, unknown>,
): Promise<void> => {
  await page.evaluate((p) => {
    window.__meta?.setState(p as never);
  }, patch);
  await page.waitForTimeout(250);
};

const main = async (): Promise<void> => {
  const browser = await chromium.launch();
  const phone = await openPage(browser, PHONE);
  const desktop = await openPage(browser, DESKTOP);

  console.log("R8 · unlock gates at level 1");
  await setMeta(phone, {
    level: 1,
    xp: 0,
    shards: 4000,
    achievements: [],
    unlocksGranted: [],
    unlocksSeen: [],
    encountered: {},
    badges: [],
  });
  await go(phone, "hangar");
  check("hangar screen", (await screen(phone)) === "hangar");
  await selectSegment(phone, "shop");
  const lockedDice = await phone.locator("[data-die-locked]").count();
  const hints = await phone.locator("[data-unlock-hint]").count();
  check(
    "the shop gates most of the roster at level 1",
    lockedDice >= 40,
    `${String(lockedDice)} locked rows`,
  );
  check("every locked die states its route", hints >= lockedDice, `${String(hints)} hints`);
  await shot(phone, "hangar-locked-phone");

  await go(phone, "contracts");
  const lockedContracts = await phone.locator("[data-contract-locked]").count();
  check(
    "contracts open six of twenty at level 1",
    lockedContracts === 14,
    `${String(lockedContracts)} locked`,
  );
  await shot(phone, "contracts-locked-phone");

  console.log("R8 · a wave opens");
  await setMeta(phone, { level: 22, unlocksSeen: [] });
  await go(phone, "hangar");
  await selectSegment(phone, "shop");
  const openedMagma = await phone
    .locator('[data-die-row="magma"]:not([data-die-locked])')
    .count();
  check("the L22 wave unlocks its dice", openedMagma === 1);
  const newBadges = await phone.locator("[data-unlock-new]").count();
  check("a fresh wave carries a «new» badge", newBadges > 0, `${String(newBadges)} badges`);
  await shot(phone, "hangar-wave-open");

  console.log("R8 · achievement grant");
  await setMeta(phone, {
    level: 1,
    achievements: ["sectorFive"],
    unlocksGranted: ["diceAchFirstClear"],
  });
  await go(phone, "hangar");
  await selectSegment(phone, "shop");
  const auroraOpen = await phone
    .locator('[data-die-row="aurora"]:not([data-die-locked])')
    .count();
  check("an achievement wave opens without the level", auroraOpen === 1);

  console.log("R8 · chart v2");
  await setMeta(desktop, { level: 50, shards: 2000, chartPicks: [] });
  await go(desktop, "chart");
  check("chart screen", (await screen(desktop)) === "chart");
  await shot(desktop, "chart-desktop");
  const homeLabels = await desktop.locator("svg text").count();
  check(
    "the home view labels only the load-bearing tiers",
    homeLabels <= 50,
    `${String(homeLabels)} labels`,
  );
  for (let i = 0; i < 2; i += 1) {
    await desktop.locator('[aria-label="zoom in"]').click();
    await desktop.waitForTimeout(150);
  }
  const zoomedLabels = await desktop.locator("svg text").count();
  check(
    "zooming in earns the named nodes their labels",
    zoomedLabels > homeLabels,
    `${String(homeLabels)} → ${String(zoomedLabels)}`,
  );
  await shot(desktop, "chart-zoomed-labels");
  await desktop.locator('[aria-label="reset"]').click();
  await desktop.waitForTimeout(300);
  await desktop.locator('[data-chart-node="prismatic-key1"]').first().click();
  await desktop.waitForTimeout(400);
  const lines = await desktop.locator("[data-chart-line]").count();
  check(
    "Fate's Favourite renders its lines",
    lines >= 2,
    `${String(lines)} lines`,
  );
  const drawbacks = await desktop.locator("[data-chart-drawback]").count();
  check(
    "the −20% hull drawback is drawn as a drawback",
    drawbacks >= 1,
    `${String(drawbacks)} drawback lines`,
  );
  const path = await desktop.locator("[data-chart-path]").count();
  check("the card prices the path to get there", path === 1);
  await shot(desktop, "chart-keystone-card");

  await desktop.locator("[data-chart-filter-toggle]").click();
  await desktop.waitForTimeout(300);
  const chips = await desktop.locator("[data-chart-tag]").count();
  check("tag filter offers the chart's own tags", chips >= 20, `${String(chips)} chips`);
  await desktop.locator('[data-chart-tag="burn"]').click();
  await desktop.waitForTimeout(300);
  await shot(desktop, "chart-tag-filter");
  await desktop.locator('[data-chart-tag="burn"]').click();
  await desktop.locator("[data-chart-filter-toggle]").click();
  await desktop.waitForTimeout(200);

  await desktop.locator('[data-chart-node="red-min1"]').first().click();
  await desktop.waitForTimeout(400);
  const minorLines = await desktop.locator("[data-chart-line]").count();
  check("a minor notable renders a card", minorLines >= 1);
  await shot(desktop, "chart-minor-notable");

  console.log("R8 · respec confirm + free respec at L50");
  await setMeta(desktop, { chartPicks: ["red-gate"], level: 50, shards: 500 });
  await go(desktop, "chart");
  await desktop.locator("[data-chart-filter-toggle]").waitFor();
  await desktop.locator('[data-chart-node="red-gate"]').first().click();
  await desktop.waitForTimeout(400);
  const respecToggle = desktop.locator("button", { hasText: /respec|Респек/i }).first();
  await respecToggle.click();
  await desktop.waitForTimeout(300);
  const refund = desktop.locator("[data-chart-refund]");
  check("respec mode offers a refund button", (await refund.count()) === 1);
  await refund.click();
  await desktop.waitForTimeout(400);
  check(
    "a refund asks for confirmation first",
    (await desktop.locator("[data-respec-yes]").count()) === 1,
  );
  await shot(desktop, "chart-respec-confirm");
  const shardsBefore = await desktop.evaluate(
    () => window.__meta?.getState().shards ?? 0,
  );
  await desktop.locator("[data-respec-yes]").click();
  await desktop.waitForTimeout(400);
  const shardsAfter = await desktop.evaluate(
    () => window.__meta?.getState().shards ?? 0,
  );
  const picksAfter = await desktop.evaluate(
    () => window.__meta?.getState().chartPicks.length ?? -1,
  );
  check("the confirmed refund removes the pick", picksAfter === 0);
  check(
    "the L50 milestone makes the respec free",
    shardsAfter === shardsBefore,
    `${String(shardsBefore)} → ${String(shardsAfter)}`,
  );

  console.log("R8 · chart on a phone (R2 bar)");
  await setMeta(phone, { level: 50, shards: 2000, chartPicks: ["red-gate"] });
  await go(phone, "chart");
  check("chart opens on a phone", (await screen(phone)) === "chart");
  await shot(phone, "chart-phone");
  const phoneHit = await phone.evaluate(() => {
    const node = document.querySelector('[data-chart-node="red-gate"]');
    if (node === null) return 0;
    const r = node.getBoundingClientRect();
    return Math.min(r.width, r.height);
  });
  check(
    "a node's tap target still clears the 32px R2 floor",
    phoneHit >= 32,
    `${phoneHit.toFixed(1)}px`,
  );
  await phone.locator('[data-chart-node="red-gate"]').first().click();
  await phone.waitForTimeout(400);
  check(
    "tapping a node opens the detail card on a phone",
    (await phone.locator("[data-chart-detail]").count()) === 1,
  );
  const phoneOverflow = await phone.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  check("the phone chart never scrolls sideways", !phoneOverflow);
  await phone.locator("[data-chart-filter-toggle]").click();
  await phone.waitForTimeout(300);
  const barHeight = await phone.evaluate(() => {
    const bar = document.querySelector("[data-chart-filter]");
    return bar === null ? 0 : bar.getBoundingClientRect().height;
  });
  check(
    "the tag filter leaves the board visible on a phone",
    barHeight > 0 && barHeight <= 780 * 0.45,
    `${barHeight.toFixed(0)}px of 780`,
  );
  await shot(phone, "chart-phone-filter");
  await phone.locator("[data-chart-filter-toggle]").click();
  await phone.waitForTimeout(200);

  console.log("R8 · collection economy");
  await setMeta(phone, {
    level: 1,
    collection: [{ defId: "red-d6", count: 2 }],
    encountered: {
      bulwark: { sector: 2, node: "shop" },
      magma: { sector: 3, node: "anomaly" },
    },
  });
  await go(phone, "collection");
  check("collection screen", (await screen(phone)) === "collection");
  const owned = await phone
    .locator('[data-collection-state="owned"]')
    .count();
  const met = await phone.locator('[data-collection-state="found"]').count();
  const unknown = await phone
    .locator('[data-collection-state="unknown"]')
    .count();
  check("collection shows owned dice", owned >= 1, `${String(owned)}`);
  check("collection shows met-but-unowned dice", met === 2, `${String(met)}`);
  check(
    "collection shows the undiscovered rest",
    unknown >= 80,
    `${String(unknown)}`,
  );
  check(
    "a met die names where it was found",
    (await phone.locator("[data-collection-provenance]").count()) === 2,
  );
  await shot(phone, "collection-states-phone");
  await go(desktop, "collection");
  await shot(desktop, "collection-states-desktop");

  await go(phone, "hangar");
  await selectSegment(phone, "shop");
  check(
    "a met die is discounted in the hangar",
    (await phone.locator("[data-die-discount]").count()) >= 1,
  );

  console.log("R8 · ascension rewards");
  await setMeta(desktop, {
    ascension: { campaign: 10 },
    stats: await desktop.evaluate(() => ({
      ...(window.__meta?.getState().stats ?? {}),
      prologueDone: true,
    })),
  });
  await go(desktop, "runSetup");
  check("run setup screen", (await screen(desktop)) === "runSetup");
  const aButtons = desktop.locator("button", { hasText: /^A10$/ });
  if ((await aButtons.count()) > 0) {
    await aButtons.first().click();
    await desktop.waitForTimeout(300);
  }
  check(
    "the A-level picker shows a reward column",
    (await desktop.locator("[data-ascension-rewards]").count()) === 1,
  );
  check(
    "the A-level picker still shows the penalty column",
    (await desktop.locator("[data-ascension-penalties]").count()) === 1,
  );
  await shot(desktop, "runsetup-ascension");

  console.log("R8 · badges + achievements");
  await setMeta(desktop, {
    badges: ["keeper", "ascendant"],
    achievements: ["firstBlood", "sectorFive"],
  });
  await go(desktop, "profile");
  check("profile screen", (await screen(desktop)) === "profile");
  check(
    "profile renders the earned badges",
    (await desktop.locator("[data-badge]").count()) === 2,
  );
  const achRows = await desktop.locator("[data-achievement]").count();
  check("profile renders every achievement", achRows === 32, `${String(achRows)} rows`);
  const achUnlocked = await desktop
    .locator('[data-achievement-state="unlocked"]')
    .count();
  check("unlocked achievements read as unlocked", achUnlocked === 2);
  await shot(desktop, "profile-achievements");
  await go(desktop, "menu");
  check(
    "the Menu ring carries the prestige badge",
    (await desktop.locator("[data-menu-badge]").count()) === 1,
  );
  await shot(desktop, "menu-badge");

  console.log("R8 · daily preview");
  await setMeta(phone, { level: 39 });
  await go(phone, "modes");
  check(
    "the Daily preview is gated below L40",
    (await phone.locator("[data-daily-preview-locked]").count()) === 1,
  );
  await setMeta(phone, { level: 40 });
  await go(phone, "modes");
  check(
    "the L40 milestone shows tomorrow's mutators",
    (await phone.locator("[data-daily-preview]").count()) === 1,
  );
  await shot(phone, "modes-daily-preview");

  console.log("R8 · die skins");
  await setMeta(desktop, { ascension: { campaign: 6 }, dieSkin: "default" });
  await go(desktop, "settings");
  const skins = await desktop.locator("[data-skin]").count();
  check("settings offers every die skin", skins === 7, `${String(skins)} cards`);
  const skinHints = await desktop.locator("[data-skin-hint]").count();
  check(
    "a locked skin states its route",
    skinHints >= 1,
    `${String(skinHints)} hints`,
  );
  await desktop.locator('[data-skin="voidglass"] button').click();
  await desktop.waitForTimeout(300);
  const activeSkin = await desktop.evaluate(
    () => window.__meta?.getState().dieSkin ?? "?",
  );
  check("an unlocked skin can be equipped", activeSkin === "voidglass");
  check(
    "the A10 theme is gated until A10",
    (await desktop.locator('[data-theme-locked="ascendant"]').count()) === 1,
  );
  await shot(desktop, "settings-skins");

  console.log("R8 · summary breakdown");
  await desktop.evaluate(() => {
    window.__summary?.getState().setResult({
      xpGain: 420,
      shardGain: 512,
      shards: {
        sectors: 410,
        beacons: 32,
        firstEnding: 25,
        hullClear: 15,
        streak: 10,
        deepClear: 0,
        ascension: 0,
        total: 492,
      },
      findShards: 20,
      firstFinds: ["magma"],
      achievements: ["sectorFive"],
      achievementShards: 120,
      unlocks: ["meta:unlock.diceL22"],
      unlockIds: ["diceL22"],
      fromLevel: 21,
      toLevel: 22,
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
  await desktop.waitForTimeout(1400);
  check("summary screen", (await screen(desktop)) === "summary");
  check(
    "the ceremony announces the milestone",
    (await desktop.locator("[data-milestone-card]").count()) === 1,
  );
  check(
    "the ceremony announces the unlock",
    (await desktop.locator("[data-unlock-card]").count()) === 1,
  );
  await shot(desktop, "summary-ceremony");
  const continueBtn = desktop.locator("button", { hasText: /continue|Дальше|Далее/i }).first();
  if ((await continueBtn.count()) > 0) {
    await continueBtn.click();
    await desktop.waitForTimeout(500);
  }
  const breakdownRows = await desktop
    .locator("[data-shard-breakdown] > *")
    .count();
  check(
    "the summary breaks the shard payout down",
    breakdownRows >= 5,
    `${String(breakdownRows)} lines`,
  );
  check(
    "the summary names the run's first finds",
    (await desktop.locator("[data-first-finds]").count()) === 1,
  );
  check(
    "the summary names the achievements earned",
    (await desktop.locator("[data-achievement-lines]").count()) === 1,
  );
  await shot(desktop, "summary-breakdown");

  console.log("R8 · achievement toast");
  await desktop.evaluate(() => {
    window.__narrative?.getState().pushAchievement("tierFive");
  });
  await desktop.waitForTimeout(400);
  check(
    "an achievement raises its own toast",
    (await desktop.locator('[data-toast="achievement"]').count()) === 1,
  );
  await shot(desktop, "achievement-toast");

  const errors = [
    ...((phone as unknown as { __errors: string[] }).__errors ?? []),
    ...((desktop as unknown as { __errors: string[] }).__errors ?? []),
  ].filter((e) => !e.includes("favicon"));
  check("no console errors", errors.length === 0, errors.slice(0, 3).join(" | "));

  await browser.close();
  console.log(
    failures.length === 0
      ? `r8: all checks passed — shots in ${OUT}`
      : `r8: ${String(failures.length)} FAILED — ${failures.join(", ")}`,
  );
  if (failures.length > 0) process.exit(1);
};

void main();
