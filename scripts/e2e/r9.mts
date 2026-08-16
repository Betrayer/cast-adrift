import { mkdirSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { chromium, type Browser, type Page } from "@playwright/test";

const URL = process.env.E2E_URL ?? "http://localhost:5173";
const OUT = join(process.cwd(), "sim-out", "r9");
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
  await page.waitForTimeout(400);
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
  await page.waitForFunction(() => window.__meta !== undefined);
  await page.waitForTimeout(600);
  Object.assign(page, { __errors: errors });
  return page;
};

const setMeta = async (
  page: Page,
  patch: Record<string, unknown>,
): Promise<void> => {
  await page.evaluate((p) => {
    window.__meta?.setState(p as never);
  }, patch);
  await page.waitForTimeout(200);
};

const setClears = async (page: Page, clears: number): Promise<void> => {
  await page.evaluate((n) => {
    const meta = window.__meta?.getState();
    if (meta === undefined) return;
    window.__meta?.setState({
      stats: { ...meta.stats, campaignClears: n },
    } as never);
  }, clears);
  await page.waitForTimeout(200);
};

// Drives the real flow rather than faking store state: a campaign run walked to
// the fifth act through `advanceSector`, which is the only route the finale is
// ever reached by.
const atFinale = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    const flow = window.__flow;
    if (flow === undefined) return;
    flow.startRunMode({ mode: "campaign", seed: 4242 });
    for (let i = 0; i < 5; i += 1) flow.advanceSector();
    window.__app?.getState().go("finale");
  });
  await page.waitForTimeout(500);
};

const main = async (): Promise<void> => {
  const browser = await chromium.launch();
  const phone = await openPage(browser, PHONE);
  const desktop = await openPage(browser, DESKTOP);

  console.log("R9 · the threshold is invisible before the first clear");
  await setMeta(phone, { level: 20, shards: 3000, achievements: [], badges: [] });
  await setClears(phone, 0);
  await atFinale(phone);
  check("finale screen", (await screen(phone)) === "finale");
  check(
    "an uncleared profile is offered no threshold",
    (await phone.locator("[data-threshold-offer]").count()) === 0,
  );
  const shallowOptions = await phone.locator("[data-ending-option]").count();
  check("the finale still lists its endings", shallowOptions >= 1, `${String(shallowOptions)}`);
  await shot(phone, "finale-no-threshold");

  console.log("R9 · the offer is the reveal");
  await setClears(phone, 1);
  await atFinale(phone);
  check(
    "a cleared profile is offered the threshold",
    (await phone.locator("[data-threshold-offer]").count()) === 1,
  );
  check(
    "the offer states what continuing costs",
    (await phone.locator("[data-threshold-offer]").innerText()).length > 40,
  );
  await shot(phone, "finale-threshold-offer");

  console.log("R9 · crossing routes into sector 6");
  await phone.locator("[data-threshold-cross]").click();
  await phone.waitForTimeout(700);
  const run = await phone.evaluate(() => {
    const s = window.__run?.getState();
    return {
      sector: s?.sector ?? 0,
      crossed: s?.crossedThreshold ?? false,
      bossRow: s?.map?.shape.bossRow ?? 0,
      inverted: (s?.map?.nodes ?? []).filter((n) => n.inverted === true).length,
      storm: (s?.map?.nodes ?? []).filter((n) => n.storm === true).length,
      events: (s?.map?.nodes ?? []).filter((n) => n.type === "event").length,
      screen: window.__app?.getState().screen ?? "?",
    };
  });
  check("the run is in sector 6", run.sector === 6, String(run.sector));
  check("the run remembers it crossed", run.crossed);
  check("sector 6 is sixteen rows deep", run.bossRow === 16, String(run.bossRow));
  check("the map marks inverted nodes", run.inverted > 0, `${String(run.inverted)} nodes`);
  check("the map marks storm nodes", run.storm > 0, `${String(run.storm)} nodes`);
  check(
    "the act is built out of events",
    run.events >= 10,
    `${String(run.events)} event nodes`,
  );
  check("crossing lands on the interstitial", run.screen === "interstitial");
  await shot(phone, "interstitial-s6");

  console.log("R9 · the map telegraphs the causality rows");
  await go(phone, "map");
  check("map screen", (await screen(phone)) === "map");
  const foggedMarks = await phone.locator("[data-causality]").count();
  check(
    "a causality row stays under the fog until the sensors reach it",
    foggedMarks === 0,
    `${String(foggedMarks)} marks at the start node`,
  );
  // Lift the fog the way a deep scan does, then the marks have to be there.
  await phone.evaluate(() => {
    window.__run?.setState({ bonusReveal: 20 });
  });
  await go(phone, "map");
  const invertedNodes = await phone.locator('[data-causality="inverted"]').count();
  const stormNodes = await phone.locator('[data-causality="storm"]').count();
  check("inverted rows are drawn on the map", invertedNodes > 0, `${String(invertedNodes)}`);
  check("storm rows are drawn on the map", stormNodes > 0, `${String(stormNodes)}`);
  const phoneOverflow = await phone.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  check("the sixteen-row map never scrolls sideways on a phone", !phoneOverflow);
  await shot(phone, "map-s6-phone");
  await setClears(desktop, 1);
  await atFinale(desktop);
  await desktop.locator("[data-threshold-cross]").click();
  await desktop.waitForTimeout(600);
  await go(desktop, "map");
  await shot(desktop, "map-s6-desktop");

  console.log("R9 · an inverted battle says so");
  // Parked on a real predecessor and jumped through `flow.jumpTo`, so the
  // causality reaches the battle store through `routeToNode` → `startBattleNode`
  // → `runBattleInit` rather than through a hand-made encounter.
  const entered = await phone.evaluate(() => {
    const run = window.__run?.getState();
    const map = run?.map;
    if (map === undefined || map === null) return null;
    const target = map.nodes.find(
      (n) => n.inverted === true && n.type === "battle" && n.pocket !== true,
    );
    if (target === undefined) return null;
    const from = map.edges.find(([, b]) => b === target.id)?.[0];
    if (from === undefined) return null;
    const fromNode = map.nodes.find((n) => n.id === from);
    window.__run?.setState({
      position: from,
      depthRow: fromNode?.row ?? 0,
      visited: [from],
    });
    const ok = window.__flow?.jumpTo(target.id) ?? false;
    return { ok, id: target.id };
  });
  check("a jump onto an inverted node routes into a battle", entered?.ok === true);
  await phone.waitForTimeout(600);
  const inverted = await phone.evaluate(() => {
    const b = window.__battle?.getState();
    return {
      inverted: b?.inverted ?? false,
      phase: b?.phase ?? "?",
      screen: window.__app?.getState().screen ?? "?",
    };
  });
  check(
    "the battle store carries the node's inversion",
    inverted.inverted,
    `${inverted.phase} / ${inverted.screen}`,
  );
  await phone.waitForTimeout(900);
  const introBtn = phone.locator("button").filter({ hasText: /./ }).first();
  if ((await phone.locator("[data-boss-intro]").count()) > 0) {
    await introBtn.click();
    await phone.waitForTimeout(300);
  }
  check(
    "the battle HUD banners the inverted order",
    (await phone.locator('[data-causality="inverted"]').count()) >= 1,
  );
  await shot(phone, "battle-inverted-banner");

  // The same route on a storm node, so the second banner is proven too.
  const stormed = await phone.evaluate(() => {
    const run = window.__run?.getState();
    const map = run?.map;
    if (map === undefined || map === null) return null;
    const target = map.nodes.find(
      (n) => n.storm === true && n.type === "battle" && n.pocket !== true,
    );
    if (target === undefined) return null;
    const from = map.edges.find(([, b]) => b === target.id)?.[0];
    if (from === undefined) return null;
    window.__battle?.getState().reset();
    window.__run?.setState({
      position: from,
      depthRow: map.nodes.find((n) => n.id === from)?.row ?? 0,
      visited: [from],
    });
    return window.__flow?.jumpTo(target.id) ?? false;
  });
  check("a jump onto a storm node routes into a battle", stormed === true);
  await phone.waitForTimeout(700);
  check(
    "the battle store carries the node's storm",
    (await phone.evaluate(() => window.__battle?.getState().nodeStorm)) === true,
  );
  check(
    "the battle HUD banners the probability storm",
    (await phone.locator('[data-causality="storm"]').count()) >= 1,
  );
  await shot(phone, "battle-storm-banner");

  console.log("R9 · the deep endings replace the shallow ones");
  const deep = await desktop.evaluate(() => {
    window.__app?.getState().go("finale");
    return null;
  });
  void deep;
  await desktop.waitForTimeout(400);
  check("the S6 finale opens", (await screen(desktop)) === "finale");
  check(
    "the finale no longer offers to cross",
    (await desktop.locator("[data-threshold-offer]").count()) === 0,
  );
  await shot(desktop, "finale-deep");
  const optionId = await desktop
    .locator("[data-ending-option]")
    .first()
    .getAttribute("data-ending-option");
  await desktop.locator("[data-ending-option]").first().click();
  await desktop.waitForTimeout(500);
  check("choosing plays an ending", (await screen(desktop)) === "ending");
  const firstBeat = await desktop.locator("[class*=beat]").first().innerText();
  check(
    "a crossed run plays its deep beat set",
    firstBeat.length > 0,
    `${String(optionId)}: ${firstBeat.slice(0, 48)}`,
  );
  await shot(desktop, "ending-deep");

  console.log("R9 · «Ответ» is reachable and only under its own conditions");
  const answer = await desktop.evaluate(() => {
    const meta = window.__meta?.getState();
    if (meta === undefined) return null;
    const numbered = Array.from({ length: 15 }, (_, i) => `memory-${String(i + 1)}`);
    window.__meta?.setState({
      codex: [...numbered, "memory-16-seal"],
      endings: ["seal"],
    } as never);
    const flow = window.__flow;
    if (flow === undefined) return null;
    flow.startRunMode({ mode: "campaign", seed: 99 });
    for (let i = 0; i < 5; i += 1) flow.advanceSector();
    const run = window.__run?.getState();
    run?.crossThreshold();
    flow.advanceSector();
    for (const key of ["beacon1", "beacon2", "beacon3", "beacon4", "beacon5"]) {
      window.__run?.getState().setFlag(key);
    }
    window.__run?.setState({ axis: 1 });
    window.__app?.getState().go("finale");
    return window.__run?.getState().sector ?? 0;
  });
  check("the answer run reached sector 6", answer === 6, String(answer));
  await desktop.waitForTimeout(500);
  const options = await desktop
    .locator("[data-ending-option]")
    .evaluateAll((nodes) =>
      nodes.map((n) => n.getAttribute("data-ending-option") ?? ""),
    );
  check(
    "«Ответ» is offered on a balanced, complete, crossed run",
    options.includes("answer"),
    options.join(","),
  );
  await shot(desktop, "finale-answer");
  await desktop.evaluate(() => {
    window.__run?.setState({ axis: 6 });
  });
  await go(desktop, "map");
  await go(desktop, "finale");
  const leaning = await desktop
    .locator("[data-ending-option]")
    .evaluateAll((nodes) =>
      nodes.map((n) => n.getAttribute("data-ending-option") ?? ""),
    );
  check(
    "a leaning axis takes «Ответ» straight back off the table",
    !leaning.includes("answer"),
    leaning.join(","),
  );

  await desktop.evaluate(() => {
    window.__run?.setState({ axis: 1 });
  });
  await go(desktop, "finale");
  await desktop.locator('[data-ending-option="answer"]').click();
  await desktop.waitForTimeout(500);
  const sealed = await desktop.evaluate(() => ({
    ending: window.__run?.getState().endingId ?? "?",
    codex: (window.__meta?.getState().codex ?? []).includes("memory-16-answer"),
  }));
  check("the true ending is recorded", sealed.ending === "answer");
  check("it seals its own final memory", sealed.codex);
  await shot(desktop, "ending-answer");

  console.log("R9 · meta pays for the act");
  await desktop.evaluate(() => {
    window.__meta?.setState({
      achievements: ["beyondTheCore", "theAnswer"],
      unlocksGranted: ["diceS6", "skinThreshold"],
      badges: ["answer"],
      level: 1,
      shards: 5000,
    } as never);
  });
  await go(desktop, "hangar");
  await desktop.locator('[data-hangar-tab="shop"]').first().click();
  await desktop.waitForTimeout(400);
  const s6Dice = await desktop
    .locator(
      '[data-die-row="retrograde"]:not([data-die-locked]), [data-die-row="hushlight"]:not([data-die-locked]), [data-die-row="foldline"]:not([data-die-locked]), [data-die-row="answerchip"]:not([data-die-locked])',
    )
    .count();
  check("the S6 wave opens its four dice", s6Dice === 4, `${String(s6Dice)}`);
  await shot(desktop, "hangar-s6-dice");

  await go(desktop, "settings");
  const skins = await desktop.locator("[data-skin]").count();
  check("settings offers the threshold skin", skins === 7, `${String(skins)} cards`);
  await desktop.locator('[data-skin="threshold"] button').click();
  await desktop.waitForTimeout(300);
  check(
    "the threshold skin can be equipped once earned",
    (await desktop.evaluate(() => window.__meta?.getState().dieSkin)) === "threshold",
  );
  await shot(desktop, "settings-threshold-skin");

  await go(desktop, "profile");
  const endingSlots = await desktop
    .locator("[data-achievement]")
    .count();
  check("profile renders all 32 achievements", endingSlots === 32, `${String(endingSlots)}`);
  check(
    "the answer badge is on the shelf",
    (await desktop.locator("[data-badge]").count()) >= 1,
  );
  await shot(desktop, "profile-s6");

  console.log("R9 · the summary prices the act");
  await desktop.evaluate(() => {
    window.__summary?.getState().setResult({
      xpGain: 700,
      shardGain: 900,
      shards: {
        sectors: 410,
        beacons: 40,
        firstEnding: 25,
        hullClear: 15,
        streak: 25,
        deepClear: 180,
        ascension: 0,
        total: 695,
      },
      findShards: 40,
      firstFinds: ["retrograde"],
      achievements: ["beyondTheCore"],
      achievementShards: 150,
      unlocks: ["meta:unlock.diceS6"],
      unlockIds: ["diceS6"],
      fromLevel: 30,
      toLevel: 31,
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
  await desktop.waitForTimeout(1400);
  const cont = desktop.locator("button", { hasText: /continue|Дальше|Далее/i }).first();
  if ((await cont.count()) > 0) {
    await cont.click();
    await desktop.waitForTimeout(500);
  }
  const breakdown = await desktop.locator("[data-shard-breakdown]").innerText();
  check(
    "the shard breakdown prints the deep-clear line",
    breakdown.includes("180"),
    breakdown.replace(/\n/g, " · ").slice(0, 90),
  );
  await shot(desktop, "summary-deep-clear");

  const errors = [
    ...((phone as unknown as { __errors: string[] }).__errors ?? []),
    ...((desktop as unknown as { __errors: string[] }).__errors ?? []),
  ].filter((e) => !e.includes("favicon"));
  check("no console errors", errors.length === 0, errors.slice(0, 3).join(" | "));

  await browser.close();
  console.log(
    failures.length === 0
      ? `r9: all checks passed — shots in ${OUT}`
      : `r9: ${String(failures.length)} FAILED — ${failures.join(", ")}`,
  );
  if (failures.length > 0) process.exit(1);
};

void main();
