import { mkdirSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { chromium, type Browser, type Page } from "@playwright/test";

const URL = process.env.E2E_URL ?? "http://localhost:5173";
const OUT = join(process.cwd(), "sim-out", "r11");
mkdirSync(OUT, { recursive: true });

const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };

const checks: { name: string; ok: boolean; detail: string }[] = [];
const record = (name: string, ok: boolean, detail = ""): void => {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${detail === "" ? "" : ` — ${detail}`}`);
};

const shot = async (page: Page, name: string): Promise<void> => {
  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: false });
};

const boot = async (browser: Browser, viewport: typeof DESKTOP): Promise<Page> => {
  const page = await browser.newPage({ viewport });
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));
  Object.defineProperty(page, "__errors", { value: errors });
  await page.goto(URL, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__meta !== undefined);
  await page.waitForTimeout(900);
  return page;
};

const errorsOf = (page: Page): string[] =>
  (page as unknown as { __errors: string[] }).__errors;

const startRun = async (page: Page, seed: number): Promise<void> => {
  await page.evaluate((s) => {
    window.__battle?.getState().reset();
    window.__flow?.startRunMode({ mode: "campaign", seed: s });
  }, seed);
  await page.waitForTimeout(600);
};

const jumpToType = async (page: Page, type: string): Promise<boolean> =>
  page.evaluate((wanted) => {
    const run = window.__run?.getState();
    const map = run?.map;
    if (map === undefined || map === null) return false;
    const target = map.nodes.find((n) => n.type === wanted);
    if (target === undefined) return false;
    const from = map.edges.find(([, b]) => b === target.id)?.[0];
    if (from === undefined) return false;
    window.__run?.setState({
      position: from,
      depthRow: map.nodes.find((n) => n.id === from)?.row ?? 0,
      visited: [from],
    });
    return window.__flow?.jumpTo(target.id) ?? false;
  }, type);

const screenOf = async (page: Page): Promise<string | undefined> =>
  page.evaluate(() => window.__app?.getState().screen);

const main = async (): Promise<void> => {
  const browser = await chromium.launch();

  const page = await boot(browser, DESKTOP);

  // 1. The retuned sector table still generates every act and its gate.
  const shapes = await page.evaluate(() => {
    const out: { sector: number; nodes: number; anomalies: number; boss: string }[] =
      [];
    window.__flow?.startRunMode({ mode: "campaign", seed: 906 });
    for (let step = 0; step < 6; step += 1) {
      const run = window.__run?.getState();
      const map = run?.map;
      if (map !== undefined && map !== null) {
        out.push({
          sector: run?.sector ?? 0,
          nodes: map.nodes.length,
          anomalies: map.nodes.filter((n) => n.type === "anomaly").length,
          boss: map.nodes.find((n) => n.type === "boss")?.id ?? "none",
        });
      }
      if (step === 4) window.__run?.setState({ crossedThreshold: true });
      window.__flow?.advanceSector();
    }
    return out;
  });
  record(
    "every act generates a map with a boss node",
    shapes.length === 6 &&
      new Set(shapes.map((s) => s.sector)).size === 6 &&
      shapes.every((s) => s.boss !== "none" && s.nodes > 20),
    shapes.map((s) => `S${String(s.sector)}:${String(s.nodes)}n/${String(s.anomalies)}a`).join(" "),
  );

  // 2. An anomaly still opens a puzzle at a real tier with real stakes.
  await startRun(page, 4242);
  const anomalyOpened = await jumpToType(page, "anomaly");
  await page.waitForTimeout(700);
  const puzzleScreen = await screenOf(page);
  record(
    "an anomaly opens the puzzle screen",
    anomalyOpened && puzzleScreen === "puzzle",
    `screen=${String(puzzleScreen)}`,
  );
  if (puzzleScreen === "puzzle") await shot(page, "puzzle-entry");
  const entryCard = await page.locator("[data-testid=puzzle-enter]").count();
  record(
    "the anomaly offers the R4 enter/leave stake before it costs anything",
    entryCard === 1,
    `entryButtons=${String(entryCard)}`,
  );
  if (entryCard === 1) {
    await page.locator("[data-testid=puzzle-enter]").click();
    await page.waitForTimeout(700);
    await shot(page, "puzzle-board");
  }
  const stakes = await page.evaluate(() => {
    const run = window.__run?.getState();
    const entries = Object.values(run?.puzzleRuns ?? {});
    return {
      started: entries.length,
      puzzleId: entries[0]?.puzzleId ?? "none",
      attempts: entries[0]?.attempts ?? -1,
      streak: run?.anomalyStreak ?? -1,
    };
  });
  record(
    "the puzzle screen registers a run with a named puzzle and an attempt budget",
    stakes.started > 0 && stakes.puzzleId !== "none" && stakes.attempts >= 0,
    `puzzle=${stakes.puzzleId} attempts=${String(stakes.attempts)} streak=${String(stakes.streak)}`,
  );

  // 3. A battle renders and resolves with the retuned enemy numbers.
  await startRun(page, 31337);
  const battleOpened = await jumpToType(page, "battle");
  await page.waitForTimeout(1400);
  const inBattle = (await screenOf(page)) === "battle";
  record("a battle opens", battleOpened && inBattle);
  if (inBattle) await shot(page, "battle");
  const resolved = await page.evaluate(async () => {
    const b = window.__battle?.getState();
    if (b === undefined || b.phase !== "placement") return false;
    const slots = Object.keys(b.slots);
    let n = 0;
    for (const die of b.dice.filter((d) => d.state === "tray")) {
      const slot = slots[n % slots.length];
      if (slot === undefined) break;
      b.placeDie(die.uid, slot as never);
      n += 1;
    }
    b.endTurn();
    return true;
  });
  await page.waitForTimeout(1600);
  const turnAdvanced = await page.evaluate(
    () => (window.__battle?.getState().turn ?? 0) > 1,
  );
  record("the battle resolves a turn", resolved && turnAdvanced);

  // 4. The map renders the retuned act on a phone viewport.
  const phone = await boot(browser, PHONE);
  await startRun(phone, 777);
  await phone.waitForTimeout(700);
  if ((await screenOf(phone)) === "interstitial") {
    await phone.locator("[data-interstitial-enter]").click();
    await phone.waitForTimeout(900);
  }
  const mapScreen = await screenOf(phone);
  record("the map renders on a 390px viewport", mapScreen === "map", `screen=${String(mapScreen)}`);
  await shot(phone, "map-phone");
  const overflow = await phone.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  record("the phone map does not scroll horizontally", !overflow);

  // 5. The perf harness still reads 60 fps in a fight at 1x and 4x CPU.
  const perfPage = await boot(browser, DESKTOP);
  await perfPage.goto(`${URL}?perf=1`, { waitUntil: "domcontentloaded" });
  await perfPage.waitForFunction(() => window.__meta !== undefined);
  await perfPage.waitForTimeout(1000);
  await page.close();
  await phone.close();
  const cdp = await perfPage.context().newCDPSession(perfPage);
  for (const rate of [1, 4]) {
    await cdp.send("Emulation.setCPUThrottlingRate", { rate });
    await startRun(perfPage, 31337);
    if ((await screenOf(perfPage)) === "interstitial") {
      await perfPage.locator("[data-interstitial-enter]").click();
      await perfPage.waitForTimeout(700);
    }
    await jumpToType(perfPage, "battle");
    await perfPage.waitForTimeout(1500);
    const samples: { fps: number; objects: number; poolSize: number }[] = [];
    for (let turn = 0; turn < 3; turn += 1) {
      if ((await screenOf(perfPage)) !== "battle") break;
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
      const snap = await perfPage.evaluate(() => window.__perf?.());
      if (snap !== undefined && snap.objects > 0) samples.push(snap);
      await perfPage.waitForTimeout(700);
    }
    const worst = samples.sort((a, b) => a.fps - b.fps)[0];
    record(
      `battle holds 60 fps at cpu x${String(rate)}`,
      worst !== undefined && worst.fps >= 55,
      worst === undefined
        ? "no sample"
        : `${String(worst.fps)} fps · ${String(worst.objects)} objects · pool ${String(worst.poolSize)}`,
    );
  }

  const consoleErrors = errorsOf(perfPage);
  record(
    "no console errors during the perf pass",
    consoleErrors.length === 0,
    consoleErrors.slice(0, 2).join(" | "),
  );

  await browser.close();

  const failed = checks.filter((c) => !c.ok);
  console.log(
    `\nr11 e2e: ${String(checks.length - failed.length)}/${String(checks.length)} checks green · screenshots in ${OUT}`,
  );
  if (failed.length > 0) process.exitCode = 1;
};

void main();
