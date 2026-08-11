import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import type { Page } from "@playwright/test";

const URL = process.env.E2E_URL ?? "http://localhost:5173";
const OUT = join(process.cwd(), "sim-out", "phase9");
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

const clickLaunch = async (page: Page, index: number): Promise<void> => {
  await page.evaluate((i) => {
    const launch = [...document.querySelectorAll("button")].filter((b) =>
      /Launch|Запустить|Запустити/i.test(b.textContent ?? ""),
    );
    launch[i]?.click();
  }, index);
  await page.waitForTimeout(700);
};

const seedProfile = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    window.__meta?.setState({
      level: 18,
      xp: 1500,
      shards: 900,
      hangar: {
        deck: [
          "red-d6",
          "red-d6",
          "ember",
          "slug",
          "blue-d6",
          "bulwark",
          "black-d6",
          "black-d6",
        ],
      },
      collection: [
        { defId: "red-d6", count: 4 },
        { defId: "ember", count: 2 },
        { defId: "slug", count: 2 },
        { defId: "blue-d6", count: 2 },
        { defId: "bulwark", count: 2 },
        { defId: "black-d6", count: 3 },
      ],
      ships: ["wanderer", "ram", "ark"],
      selectedShip: "wanderer",
      endings: ["seal", "silent"],
      contracts: { bareHull: 7, redHeat: 3, iceWall: 1 },
      dailyPlayed: {},
      best: {
        drift: 1840,
        driftWeek: null,
        driftWeekly: 1240,
        dailyRank: 7,
        dailyDate: "2026-07-20",
      },
      ascension: { campaign: 2 },
      stats: {
        runs: 41,
        wins: 9,
        shardsEarned: 3100,
        prologueDone: true,
        campaignClears: 2,
        kills: 618,
        scrapEarned: 9420,
        deepestDrift: 34,
        driftRuns: 12,
        dailyRuns: 6,
        contractRuns: 8,
        elites: 24,
        t5Solved: 3,
        beacons: 9,
        noDeathStreak: 1,
        bestNoDeathStreak: 2,
      },
    });
  });
  await page.waitForTimeout(250);
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
  await page.waitForFunction(
    () => window.__meta !== undefined && window.__flow !== undefined,
    { timeout: 20000 },
  );
  await seedProfile(page);

  // ── Menu: Modes is live, no longer a Phase-9 stub ──────────────────────────
  await goTo(page, "menu");
  await shot(page, "01-menu-modes-live");
  console.log(
    "  menu modes entry:",
    JSON.stringify(
      await page.evaluate(() => {
        const button = [...document.querySelectorAll("button")].find((b) =>
          /Modes|Режимы|Режими/i.test(b.textContent ?? ""),
        );
        return { found: button !== undefined, disabled: button?.disabled ?? null };
      }),
    ),
  );

  // ── Modes screen: four cards, daily mutator chips, reset countdown ─────────
  await goTo(page, "modes");
  await page.waitForTimeout(400);
  await shot(page, "02-modes");

  // ── Contracts grid with partial stars ─────────────────────────────────────
  await goTo(page, "contracts");
  await page.waitForTimeout(400);
  await shot(page, "03-contracts-top");
  await page.evaluate(() => {
    document.querySelector("[data-scrollarea-viewport]")?.scrollTo(0, 950);
  });
  await page.waitForTimeout(300);
  await shot(page, "04-contracts-scrolled");
  console.log(
    "  contract star rows:",
    JSON.stringify(
      await page.evaluate(() =>
        [...document.querySelectorAll("p, div")]
          .map((n) => (n.textContent ?? "").trim())
          .filter((t) => /^[★☆]{3}$/.test(t))
          .slice(0, 12),
      ),
    ),
  );

  // ── Profile: level ring, lifetime grid, endings badges ────────────────────
  await goTo(page, "profile");
  await page.waitForTimeout(400);
  await shot(page, "05-profile-top");
  await page.evaluate(() => {
    document.querySelector("[data-scrollarea-viewport]")?.scrollTo(0, 800);
  });
  await page.waitForTimeout(300);
  await shot(page, "06-profile-endings");

  // ── Leaderboard tabs (offline here: the empty state must be graceful) ──────
  await goTo(page, "leaderboard");
  await page.waitForTimeout(1600);
  await shot(page, "07-board-drift");
  for (const [label, name] of [
    [/^Daily$|^Дневной$|^Денний$/, "08-board-daily"],
    [/^Week$|^Неделя$|^Тиждень$/, "09-board-week"],
    [/Around me|Вокруг меня|Навколо мене/, "10-board-around-me"],
  ] as const) {
    const control = page.getByText(label).first();
    if ((await control.count()) > 0) {
      await control.click().catch(() => undefined);
      await page.waitForTimeout(1200);
    }
    await shot(page, name);
  }

  // ── Drift: a real run through the real flow ───────────────────────────────
  await page.evaluate(() => {
    window.__flow?.startDriftRun(4242);
  });
  await page.waitForTimeout(800);
  await shot(page, "11-drift-map-s1");
  console.log(
    "  drift run:",
    JSON.stringify(
      await page.evaluate(() => {
        const run = window.__run?.getState();
        return {
          screen: window.__app?.getState().screen,
          mode: run?.mode,
          active: run?.active,
          sectorIndex: run?.sectorIndex,
          sector: run?.sector,
          tide: run?.tide,
          bossNodes: run?.map?.nodes.filter((n) => n.type === "boss").length,
          row15: [
            ...new Set(
              run?.map?.nodes.filter((n) => n.row === 15).map((n) => n.type),
            ),
          ],
        };
      }),
    ),
  );

  // Crossing the gate: the same run continues into sector 2, no reload.
  await page.evaluate(() => {
    window.__flow?.advanceSector();
  });
  await page.waitForTimeout(700);
  await shot(page, "12-drift-interstitial-s2");
  await goTo(page, "map");
  await page.waitForTimeout(600);
  await shot(page, "13-drift-map-s2");
  console.log(
    "  sector crossing:",
    JSON.stringify(
      await page.evaluate(() => {
        const run = window.__run?.getState();
        return {
          active: run?.active,
          sectorIndex: run?.sectorIndex,
          sector: run?.sector,
          depth: run?.stats.depth,
          position: run?.position,
          bossNodes: run?.map?.nodes.filter((n) => n.type === "boss").length,
        };
      }),
    ),
  );

  // Past sector five the index keeps climbing while content stays clamped.
  await page.evaluate(() => {
    window.__run?.setState({ sectorIndex: 5, sector: 5 });
    window.__flow?.advanceSector();
  });
  await page.waitForTimeout(500);
  console.log(
    "  drift loop:",
    JSON.stringify(
      await page.evaluate(() => {
        const run = window.__run?.getState();
        return { sectorIndex: run?.sectorIndex, sector: run?.sector };
      }),
    ),
  );

  // ── Drift summary through the real endRun ─────────────────────────────────
  await page.evaluate(() => {
    const run = window.__run?.getState();
    if (run === undefined) return;
    window.__run?.setState({
      stats: {
        ...run.stats,
        depth: 27,
        kills: 34,
        scrapEarned: 512,
        nodesCleared: 22,
        elites: 4,
        minibosses: 2,
      },
    });
    window.__flow?.endRun(false);
  });
  await page.waitForTimeout(900);
  await shot(page, "14-drift-summary");
  console.log(
    "  drift summary:",
    JSON.stringify(
      await page.evaluate(() => {
        const summary = window.__summary?.getState();
        return {
          screen: window.__app?.getState().screen,
          score: summary?.result?.score,
          mode: summary?.result?.mode,
          xpGain: summary?.result?.xpGain,
          personalBest: summary?.personalBest,
          beat: summary?.beatPersonalBest,
          submit: summary?.submit,
          metaBest: window.__meta?.getState().best.drift,
          deepest: window.__meta?.getState().stats.deepestDrift,
        };
      }),
    ),
  );

  // ── Daily: one attempt, then the card reads spent ─────────────────────────
  await page.evaluate(() => {
    window.__flow?.abandonRun();
    const today = new Date().toISOString().slice(0, 10);
    window.__flow?.startDailyRun(today);
  });
  await page.waitForTimeout(700);
  await shot(page, "15-daily-map");
  console.log(
    "  daily run:",
    JSON.stringify(
      await page.evaluate(() => {
        const run = window.__run?.getState();
        return {
          mode: run?.mode,
          dailyDate: run?.dailyDate,
          mutators: run?.mutators,
          seed: run?.seed,
        };
      }),
    ),
  );

  await page.evaluate(() => {
    window.__flow?.abandonRun();
    const today = new Date().toISOString().slice(0, 10);
    window.__meta?.setState({
      dailyPlayed: { [today]: { state: "done", score: 1490, rank: 12 } },
    });
    window.__app?.getState().go("modes");
  });
  await page.waitForTimeout(500);
  await shot(page, "16-modes-daily-spent");
  console.log(
    "  daily attempt spent:",
    JSON.stringify(
      await page.evaluate(() => {
        const spent = [...document.querySelectorAll("button")].find((b) =>
          /Attempt spent|израсходована|витрачено/i.test(b.textContent ?? ""),
        );
        return { found: spent !== undefined, disabled: spent?.disabled ?? null };
      }),
    ),
  );

  // ── Contract run: the authored deck and ship override the hangar ──────────
  await page.evaluate(() => {
    window.__meta?.setState({ dailyPlayed: {} });
    window.__flow?.abandonRun();
    window.__flow?.startContractRun("redHeat");
  });
  await page.waitForTimeout(700);
  await shot(page, "17-contract-map");
  console.log(
    "  contract redHeat:",
    JSON.stringify(
      await page.evaluate(() => {
        const run = window.__run?.getState();
        return {
          mode: run?.mode,
          contractId: run?.contractId,
          deck: run?.deck.map((d) => d.defId),
          shipId: run?.shipId,
        };
      }),
    ),
  );
  await page.evaluate(() => {
    window.__flow?.startContractRun("blindJump");
  });
  await page.waitForTimeout(600);
  await shot(page, "18-contract-blindjump-fog");
  console.log(
    "  contract blindJump:",
    JSON.stringify(
      await page.evaluate(() => {
        const run = window.__run?.getState();
        return { mutators: run?.mutators, sector: run?.sector };
      }),
    ),
  );

  // ── Contract stars settle through the ordinary XP pipeline ────────────────
  await page.evaluate(() => {
    const run = window.__run?.getState();
    if (run === undefined) return;
    window.__run?.setState({
      hull: run.hullMax,
      scrap: 140,
      solvedPuzzles: ["oreVein"],
      flags: { beacon1: true },
      stats: { ...run.stats, nodesCleared: 18, elites: 2, minibosses: 1, depth: 15 },
    });
    window.__flow?.endRun(true);
  });
  await page.waitForTimeout(700);
  await shot(page, "19-contract-summary");
  console.log(
    "  contract settle:",
    JSON.stringify(
      await page.evaluate(() => ({
        screen: window.__app?.getState().screen,
        contracts: window.__meta?.getState().contracts,
        xp: window.__meta?.getState().xp,
        stars: window.__summary?.getState().result?.contractStars,
      })),
    ),
  );

  // Replay must grant no duplicate XP.
  const beforeReplay = await page.evaluate(() => window.__meta?.getState().xp);
  await page.evaluate(() => {
    window.__flow?.abandonRun();
    window.__flow?.startContractRun("blindJump");
    const run = window.__run?.getState();
    if (run === undefined) return;
    window.__run?.setState({
      hull: run.hullMax,
      solvedPuzzles: ["oreVein"],
      flags: { beacon1: true },
      stats: { ...run.stats, nodesCleared: 18, depth: 15 },
    });
    window.__flow?.endRun(true);
  });
  await page.waitForTimeout(600);
  console.log(
    "  replay xp:",
    JSON.stringify({
      before: beforeReplay,
      after: await page.evaluate(() => window.__meta?.getState().xp),
      starsSecondTime: await page.evaluate(
        () => window.__summary?.getState().result?.contractStars,
      ),
    }),
  );

  // ── Active-run guard: another mode start must ask first ───────────────────
  await page.evaluate(() => {
    window.__flow?.abandonRun();
    window.__flow?.startDriftRun(77);
    window.__app?.getState().go("modes");
  });
  await page.waitForTimeout(500);
  await clickLaunch(page, 1);
  await shot(page, "20-active-run-guard");
  console.log(
    "  guard shown:",
    await page.evaluate(() =>
      /already under way|уже идёт|уже триває/i.test(document.body.innerText),
    ),
  );
  const keep = page.getByRole("button", {
    name: /Keep it|Оставить|Залишити/i,
  });
  if ((await keep.count()) > 0) {
    await keep.first().click();
    await page.waitForTimeout(400);
  }
  console.log(
    "  run kept after cancel:",
    JSON.stringify(
      await page.evaluate(() => ({
        active: window.__run?.getState().active,
        mode: window.__run?.getState().mode,
      })),
    ),
  );

  // Confirming the guard replaces the run.
  await clickLaunch(page, 1);
  await page.waitForTimeout(300);
  const erase = page.getByRole("button", {
    name: /Erase and launch|Стереть и запустить|Стерти й запустити/i,
  });
  if ((await erase.count()) > 0) {
    await erase.first().click();
    await page.waitForTimeout(800);
  }
  await shot(page, "21-guard-confirmed-new-drift");
  console.log(
    "  after guard confirm:",
    JSON.stringify(
      await page.evaluate(() => ({
        screen: window.__app?.getState().screen,
        mode: window.__run?.getState().mode,
        sectorIndex: window.__run?.getState().sectorIndex,
      })),
    ),
  );

  // ── ?debug=1 greys flagged rows instead of hiding them ────────────────────
  await page.goto(`${URL}/?debug=1`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__meta !== undefined, {
    timeout: 20000,
  });
  await seedProfile(page);
  await goTo(page, "leaderboard");
  await page.waitForTimeout(1500);
  await shot(page, "22-board-debug");

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
