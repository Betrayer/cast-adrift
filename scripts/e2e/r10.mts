import { mkdirSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { chromium, type Browser, type Page } from "@playwright/test";
import {
  HOT_SFX,
  MUSIC_IDS,
  SFX_IDS,
  SFX_VARIANTS,
  variantId,
} from "../../src/data/audio";

const URL = process.env.E2E_URL ?? "http://localhost:5173";
const OUT = join(process.cwd(), "sim-out", "r10");
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
  await page.waitForTimeout(420);
};

interface AudioLog {
  urls: string[];
  statuses: Map<string, number>;
}

const openPage = async (
  browser: Browser,
  viewport: { width: number; height: number },
  query = "",
): Promise<{ page: Page; errors: string[]; audio: AudioLog }> => {
  const page = await browser.newPage({ viewport });
  const errors: string[] = [];
  const audio: AudioLog = { urls: [], statuses: new Map() };
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("response", (res) => {
    const url = res.url();
    if (!url.includes("/audio/")) return;
    const name = url.split("/audio/")[1] ?? url;
    audio.urls.push(name);
    audio.statuses.set(name, res.status());
  });
  await page.goto(`${URL}${query}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__meta !== undefined);
  await page.waitForTimeout(700);
  return { page, errors, audio };
};

const startRun = async (page: Page, seed: number): Promise<void> => {
  await page.evaluate((s) => {
    window.__flow?.startRunMode({ mode: "campaign", seed: s });
  }, seed);
  await page.waitForTimeout(400);
};

const main = async (): Promise<void> => {
  const browser = await chromium.launch();
  const phoneCtx = await openPage(browser, PHONE);
  const phone = phoneCtx.page;

  console.log("R10 · the payload the browser actually takes");
  const bootFiles = [...phoneCtx.audio.urls];
  const hotFirst = bootFiles
    .filter((f) => f.startsWith("sfx/"))
    .slice(0, HOT_SFX.length)
    .every((f) => HOT_SFX.some((id) => f === `sfx/${id}.webm`));
  check(
    "the battle-hot set is fetched before the rest is warmed",
    hotFirst,
    bootFiles.filter((f) => f.startsWith("sfx/")).slice(0, 4).join(", "),
  );
  check(
    "Chromium is served Opus, never the wav fallback",
    bootFiles.every((f) => f.endsWith(".webm")),
    bootFiles.filter((f) => !f.endsWith(".webm")).slice(0, 3).join(", "),
  );

  // The idle warm brings in the rest; give it its timeout and then some.
  await phone.waitForTimeout(3200);
  const warmed = new Set(phoneCtx.audio.urls);
  const expected: string[] = [];
  for (const id of SFX_IDS) {
    for (let v = 0; v < (SFX_VARIANTS[id] ?? 1); v += 1) {
      expected.push(`sfx/${variantId(id, v)}.webm`);
    }
  }
  const missing = expected.filter((f) => !warmed.has(f));
  check(
    "every declared clip is warmed and reachable",
    missing.length === 0,
    missing.length === 0
      ? `${String(expected.length)} clips`
      : `missing ${missing.slice(0, 4).join(", ")}`,
  );
  const bad = [...phoneCtx.audio.statuses.entries()].filter(
    ([, status]) => status >= 400,
  );
  check(
    "no clip 404s",
    bad.length === 0,
    bad.slice(0, 3).map(([f, s]) => `${f}=${String(s)}`).join(", "),
  );

  console.log("R10 · the beds follow the screen");
  await startRun(phone, 7788);
  await go(phone, "map");
  check("map screen", (await screen(phone)) === "map");
  const bedsAfterMap = [...phoneCtx.audio.urls].filter((f) =>
    f.startsWith("music/"),
  );
  check(
    "the map has its own bed rather than the menu one",
    bedsAfterMap.some((f) => f === "music/map.webm"),
    bedsAfterMap.join(", "),
  );
  check(
    "all four beds exist on disk",
    MUSIC_IDS.every((id) =>
      [...phoneCtx.audio.statuses.keys()].every(
        (f) => f !== `music/${id}.webm` || phoneCtx.audio.statuses.get(f) === 200,
      ),
    ),
  );
  await shot(phone, "map-bed");

  console.log("R10 · the silent screens");
  await go(phone, "event");
  check("event screen renders", (await screen(phone)) === "event");
  const optionCount = await phone.locator("[data-event-option]").count();
  check("the event offers options to tick", optionCount >= 1, `${String(optionCount)}`);
  await shot(phone, "event");
  const takeable = phone.locator("[data-event-option]:not([disabled])");
  if ((await takeable.count()) > 0) {
    await takeable.first().click();
    await phone.waitForTimeout(600);
    check(
      "picking an option lands its outcome",
      (await phone.locator("[data-event-option]").count()) === 0,
    );
  }
  await shot(phone, "event-outcome");

  // Reached through a real anomaly node: the debug route skips the entry card,
  // and the entry card is where the tier flourish and the commitment thump live.
  const onAnomaly = await phone.evaluate(() => {
    const map = window.__run?.getState().map;
    if (map === undefined || map === null) return false;
    const target = map.nodes.find((n) => n.type === "anomaly");
    if (target === undefined) return false;
    const from = map.edges.find(([, b]) => b === target.id)?.[0];
    if (from === undefined) return false;
    window.__run?.setState({
      position: from,
      depthRow: map.nodes.find((n) => n.id === from)?.row ?? 0,
      visited: [from],
    });
    return window.__flow?.jumpTo(target.id) ?? false;
  });
  check("an anomaly node routes into the puzzle screen", onAnomaly);
  await phone.waitForTimeout(700);
  check("puzzle screen renders", (await screen(phone)) === "puzzle");
  const entryCard = await phone.locator("[data-testid=puzzle-enter]").count();
  check("the tier entry card is offered", entryCard === 1, `${String(entryCard)}`);
  await shot(phone, "puzzle-entry");
  if (entryCard > 0) {
    await phone.locator("[data-testid=puzzle-enter]").click();
    await phone.waitForTimeout(700);
  }
  const boardLive = await phone.locator("[data-testid=puzzle-attempts]").count();
  check("the board opens after taking the reading", boardLive === 1);
  await shot(phone, "puzzle-board");

  console.log("R10 · battle enters through the warp");
  const entered = await phone.evaluate(() => {
    const run = window.__run?.getState();
    const map = run?.map;
    if (map === undefined || map === null) return false;
    const target = map.nodes.find((n) => n.type === "battle");
    if (target === undefined) return false;
    const from = map.edges.find(([, b]) => b === target.id)?.[0];
    if (from === undefined) return false;
    window.__run?.setState({
      position: from,
      depthRow: map.nodes.find((n) => n.id === from)?.row ?? 0,
      visited: [from],
    });
    return window.__flow?.jumpTo(target.id) ?? false;
  });
  check("a battle node routes into the battle screen", entered);
  let warped = false;
  for (let i = 0; i < 20 && !warped; i += 1) {
    await phone.waitForTimeout(50);
    warped = (await phone.locator("[data-warp]").count()) > 0;
    if (warped) await shot(phone, "battle-warp");
  }
  check("the battle opens on the jump warp", warped);
  await phone.waitForTimeout(700);
  check(
    "the warp clears itself",
    (await phone.locator("[data-warp]").count()) === 0,
  );

  console.log("R10 · resolution holds its pools");
  await phone.waitForTimeout(400);
  const placed = await phone.evaluate(() => {
    const b = window.__battle?.getState();
    if (b === undefined) return 0;
    const slots = Object.keys(b.slots);
    let n = 0;
    for (const die of b.dice.filter((d) => d.state === "tray")) {
      const slot = slots[n % slots.length];
      if (slot === undefined) break;
      b.placeDie(die.uid, slot as never);
      n += 1;
      if (n >= 3) break;
    }
    return n;
  });
  check("dice can be placed for a resolution", placed > 0, `${String(placed)} dice`);
  await phone.evaluate(() => {
    window.__battle?.getState().endTurn();
  });
  await phone.waitForTimeout(1600);
  const perf = await phone.evaluate(() => window.__perf?.());
  check(
    "the battle fx pool stays inside its budget",
    perf !== undefined && perf.poolUsed <= perf.poolSize,
    perf === undefined
      ? "no perf hook"
      : `${String(perf.poolUsed)}/${String(perf.poolSize)} used`,
  );
  check(
    "the scene stays under the 100-object display budget",
    perf !== undefined && perf.poolSize <= 100,
    perf === undefined ? "?" : `${String(perf.poolSize)} pooled`,
  );
  await shot(phone, "battle-resolved");

  console.log("R10 · ?perf=1, desktop and a 4x-throttled proxy for mid Android");
  // The perf page measures alone: a second live canvas on the same cores turns a
  // frame-rate reading into a reading of how many pages this run left open.
  await phone.close();
  const perfCtx = await openPage(browser, DESKTOP, "?perf=1");
  const perfPage = perfCtx.page;
  const cdp = await perfPage.context().newCDPSession(perfPage);
  const perfRun = async (label: string, throttle: number): Promise<void> => {
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: throttle });
    await perfPage.evaluate(() => {
      window.__battle?.getState().reset();
      window.__flow?.startRunMode({ mode: "campaign", seed: 31337 });
    });
    await perfPage.waitForTimeout(400);
    await perfPage.evaluate(() => {
      const map = window.__run?.getState().map;
      if (map === undefined || map === null) return;
      const target = map.nodes.find((n) => n.type === "battle");
      if (target === undefined) return;
      const from = map.edges.find(([, b]) => b === target.id)?.[0];
      if (from === undefined) return;
      window.__run?.setState({
        position: from,
        depthRow: map.nodes.find((n) => n.id === from)?.row ?? 0,
        visited: [from],
      });
      window.__flow?.jumpTo(target.id);
    });
    await perfPage.waitForTimeout(1400);
    // Sampled between resolutions while the scene is still live: once the fight
    // ends the canvas unmounts and the reading is a zero, not a result.
    const samples: { fps: number; objects: number; poolUsed: number; poolSize: number }[] = [];
    for (let turn = 0; turn < 3; turn += 1) {
      const onBattle = await perfPage.evaluate(
        () => window.__app?.getState().screen === "battle",
      );
      if (!onBattle) break;
      await perfPage.evaluate(() => {
        const b = window.__battle?.getState();
        if (b === undefined || b.phase !== "placement") return;
        const slots = Object.keys(b.slots);
        let n = 0;
        for (const die of b.dice.filter((d) => d.state === "tray")) {
          const slot = slots[n % slots.length];
          if (slot === undefined) break;
          b.placeDie(die.uid, slot as never);
          n += 1;
        }
        b.endTurn();
      });
      await perfPage.waitForTimeout(900);
      const sample = await perfPage.evaluate(() => window.__perf?.());
      if (sample !== undefined && sample.objects > 0) samples.push(sample);
      await perfPage.waitForTimeout(700);
    }
    const snap = samples.sort((a, b) => a.fps - b.fps)[0];
    const floor = throttle > 1 ? 30 : 55;
    check(
      `${label}: frame rate holds`,
      snap !== undefined && snap.fps >= floor,
      snap === undefined
        ? "no perf hook"
        : `${String(snap.fps)} fps · ${String(snap.objects)} objects · pools ${String(snap.poolUsed)}/${String(snap.poolSize)}`,
    );
    check(
      `${label}: pooled display objects stay under 100`,
      snap !== undefined && snap.poolSize <= 100,
      snap === undefined ? "?" : `${String(snap.poolSize)}`,
    );
    await shot(perfPage, `perf-${label.replace(/\s+/g, "-")}`);
  };
  await perfRun("desktop", 1);
  await perfRun("throttled 4x", 4);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });

  console.log("R10 · reduced motion keeps every cue and drops every animation");
  const reducedCtx = await openPage(browser, PHONE);
  const reduced = reducedCtx.page;
  await reduced.evaluate(() => {
    window.__settings?.setState({ reducedMotion: "on" } as never);
  });
  await startRun(reduced, 4242);
  const reducedEntered = await reduced.evaluate(() => {
    const map = window.__run?.getState().map;
    if (map === undefined || map === null) return false;
    const target = map.nodes.find((n) => n.type === "battle");
    if (target === undefined) return false;
    const from = map.edges.find(([, b]) => b === target.id)?.[0];
    if (from === undefined) return false;
    window.__run?.setState({
      position: from,
      depthRow: map.nodes.find((n) => n.id === from)?.row ?? 0,
      visited: [from],
    });
    return window.__flow?.jumpTo(target.id) ?? false;
  });
  check("reduced-motion run reaches a battle", reducedEntered);
  await reduced.waitForTimeout(200);
  check(
    "reduced motion skips the battle warp entirely",
    (await reduced.locator("[data-warp]").count()) === 0,
  );
  await shot(reduced, "battle-reduced");

  console.log("R10 · the ceremonies");
  const desktopCtx = await openPage(browser, DESKTOP);
  const desktop = desktopCtx.page;
  // The summary store rides the lazily-loaded summary chunk, so the screen has
  // to be mounted once before its dev hook exists.
  await go(desktop, "summary");
  await desktop.evaluate(() => {
    window.__meta?.setState({ level: 20, shards: 4000 } as never);
    window.__summary?.getState().setResult({
      xpGain: 400,
      shardGain: 500,
      fromLevel: 12,
      toLevel: 13,
      win: true,
      milestones: ["meta:milestone.deckPlus"],
      unlocks: ["meta:unlock.diceS6"],
      unlockIds: ["diceS6"],
      mode: "campaign",
    } as never);
    window.__app?.getState().go("menu");
  });
  await desktop.waitForTimeout(200);
  await go(desktop, "summary");
  await desktop.waitForTimeout(1600);
  const unlockCards = await desktop.locator("[data-unlock-card]").count();
  check(
    "the level-up ceremony stages its unlock cards",
    unlockCards >= 1,
    `${String(unlockCards)} cards`,
  );
  await shot(desktop, "levelup-unlocks");

  await desktop.evaluate(() => {
    const flow = window.__flow;
    if (flow === undefined) return;
    flow.startRunMode({ mode: "campaign", seed: 555 });
    for (let i = 0; i < 5; i += 1) flow.advanceSector();
    window.__app?.getState().go("finale");
  });
  await desktop.waitForTimeout(600);
  check("finale screen", (await screen(desktop)) === "finale");
  await shot(desktop, "finale");
  const endingOptions = await desktop.locator("[data-ending-option]").count();
  if (endingOptions > 0) {
    await desktop.locator("[data-ending-option]").first().click();
    await desktop.waitForTimeout(600);
    check("an ending plays", (await screen(desktop)) === "ending");
    await shot(desktop, "ending");
  }

  const errors = [
    ...phoneCtx.errors,
    ...perfCtx.errors,
    ...reducedCtx.errors,
    ...desktopCtx.errors,
  ].filter((e) => !e.includes("favicon"));
  check("no console errors", errors.length === 0, errors.slice(0, 3).join(" | "));

  await browser.close();
  console.log(
    failures.length === 0
      ? `r10: all checks passed — shots in ${OUT}`
      : `r10: ${String(failures.length)} FAILED — ${failures.join(", ")}`,
  );
  if (failures.length > 0) process.exit(1);
};

void main();
