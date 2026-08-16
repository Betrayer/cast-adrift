import { mkdirSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { chromium, type Page } from "@playwright/test";

const URL = process.env.E2E_URL ?? "http://localhost:5173";
const LABEL = process.env.R10_LABEL ?? "after";
const OUT = join(process.cwd(), "sim-out", "r10");
mkdirSync(OUT, { recursive: true });

const DESKTOP = { width: 1440, height: 900 };

const enterBattle = async (page: Page, seed: number): Promise<void> => {
  await page.evaluate((s) => {
    window.__battle?.getState().reset();
    window.__flow?.startRunMode({ mode: "campaign", seed: s });
  }, seed);
  await page.waitForTimeout(400);
  await page.evaluate(() => {
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
  await page.waitForTimeout(1500);
};

const main = async (): Promise<void> => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: DESKTOP });
  await page.goto(`${URL}?perf=1`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__meta !== undefined);
  await page.waitForTimeout(1200);
  const cdp = await page.context().newCDPSession(page);

  for (const rate of [1, 4]) {
    await cdp.send("Emulation.setCPUThrottlingRate", { rate });
    await enterBattle(page, 31337);
    const samples: { fps: number; objects: number; poolSize: number }[] = [];
    for (let turn = 0; turn < 3; turn += 1) {
      const live = await page.evaluate(
        () => window.__app?.getState().screen === "battle",
      );
      if (!live) break;
      await page.evaluate(() => {
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
      await page.waitForTimeout(900);
      const snap = await page.evaluate(() => window.__perf?.());
      if (snap !== undefined && snap.objects > 0) samples.push(snap);
      await page.waitForTimeout(700);
    }
    const worst = samples.sort((a, b) => a.fps - b.fps)[0];
    console.log(
      `${LABEL} · cpu x${String(rate)} — ${
        worst === undefined
          ? "no sample"
          : `${String(worst.fps)} fps · ${String(worst.objects)} display objects · pool ${String(worst.poolSize)}`
      }`,
    );
  }

  await browser.close();
};

void main();
