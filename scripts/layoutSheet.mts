import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { chromium, type Browser } from "@playwright/test";
import { CLIP_TOLERANCE, measure, MIN_TARGET, NAME_SHIM, type Measure } from "./layoutSheet/measure";
import { OVERLAYS, PHONES, READY_MS, RECIPES, VIEWPORTS, type Recipe, type Viewport } from "./layoutSheet/recipes";
import { layoutVerdict } from "./layoutSheet/verdict";

const BASE_URL = "http://127.0.0.1:4173";
const FROZEN_NOW = 1_760_000_000_000;
const OUT = join(process.cwd(), "docs", "horizon", "layout-sheet");
const SHOTS = join(OUT, "shots");

interface Shot {
  recipe: string;
  screen: string;
  viewport: string;
  profile: "none" | "tma";
  file: string;
  measure: Measure | null;
  error: string | null;
}

const serverUp = async (): Promise<boolean> => {
  try {
    const response = await fetch(BASE_URL);
    return response.ok;
  } catch {
    return false;
  }
};

const stopServer = (child: ChildProcess): void => {
  if (process.platform === "win32" && child.pid !== undefined) {
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    return;
  }
  child.kill();
};

const startServer = async (): Promise<ChildProcess | null> => {
  if (await serverUp()) return null;
  const child = spawn("npm run e2e:build -- --mode e2e && npm run e2e:serve -- --mode e2e", {
    shell: true,
    stdio: "ignore",
  });
  const deadline = Date.now() + 300_000;
  while (Date.now() < deadline) {
    if (await serverUp()) return child;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  stopServer(child);
  throw new Error("layoutSheet: the e2e server did not come up on 4173");
};

const shoot = async (
  browser: Browser,
  recipe: Recipe,
  viewport: Viewport,
  profile: "none" | "tma",
): Promise<Shot> => {
  const file = `${recipe.id}-${viewport.id}-${profile}.png`;
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    hasTouch: viewport.touch,
    isMobile: viewport.touch,
    reducedMotion: "reduce",
    colorScheme: "dark",
    locale: "en-GB",
    timezoneId: "UTC",
  });
  const page = await context.newPage();
  try {
    await page.goto(BASE_URL);
    await page.waitForFunction(() => window.caTest !== undefined, null, { timeout: READY_MS });
    await page.evaluate((at) => {
      const api = window.caTest;
      api?.now(at);
      api?.grantMeta({ tutorialSeen: "all", prologueDone: true, systemsCheckDone: true } as never);
      api?.settings({ locale: "ru", fontScale: "l" } as never);
    }, FROZEN_NOW);
    if (profile === "tma" && viewport.tma !== null) {
      await page.evaluate((inset) => window.caTest?.insets(inset), viewport.tma);
    }
    await recipe.prepare(page);
    await page.locator(`[data-screen="${recipe.screen}"]`).first().waitFor({ state: "visible", timeout: READY_MS });
    await page.waitForFunction(() => document.querySelectorAll("[data-screen-loading]").length === 0, null, { timeout: READY_MS });
    if (recipe.overlay !== undefined) {
      await page.waitForTimeout(300);
      await recipe.overlay.open(page);
      await page.locator(recipe.overlay.shown).first().waitFor({ state: "visible", timeout: READY_MS });
    }
    await page.waitForTimeout(recipe.overlay?.settleMs ?? 600);
    await page.evaluate(NAME_SHIM);
    const result = await page.evaluate(measure, {
      screenId: recipe.screen,
      minTarget: MIN_TARGET,
      tolerance: CLIP_TOLERANCE,
    });
    await page.screenshot({ path: join(SHOTS, file) });
    return { recipe: recipe.id, screen: recipe.screen, viewport: viewport.id, profile, file, measure: result, error: null };
  } catch (error) {
    return {
      recipe: recipe.id,
      screen: recipe.screen,
      viewport: viewport.id,
      profile,
      file,
      measure: null,
      error: error instanceof Error ? error.message.split("\n")[0] ?? "error" : String(error),
    };
  } finally {
    await context.close();
  }
};

const stripHtml = (recipe: string, shots: readonly Shot[]): string => {
  const cells = shots
    .map(
      (shot) =>
        `<figure><img src="shots/${shot.file}"/><figcaption>${shot.viewport} · ${shot.profile}${shot.error === null ? "" : " · ERROR"}</figcaption></figure>`,
    )
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:#0b0d12;color:#cfd6e4;font:14px system-ui}h1{font-size:18px;margin:8px 12px}main{display:flex;gap:12px;align-items:flex-start;padding:0 12px 12px}figure{margin:0}img{display:block;height:640px;width:auto;border:1px solid #2a3140}figcaption{padding:4px 0}</style></head><body><h1>${recipe}</h1><main>${cells}</main></body></html>`;
};

const main = async (): Promise<void> => {
  const only = process.argv.indexOf("--only");
  const wanted = only >= 0 ? new Set((process.argv[only + 1] ?? "").split(",")) : null;
  mkdirSync(SHOTS, { recursive: true });
  const server = await startServer();
  const shots: Shot[] = [];
  try {
    const browser = await chromium.launch();
    try {
      for (const recipe of [...RECIPES, ...OVERLAYS]) {
        if (wanted !== null && !wanted.has(recipe.id)) continue;
        const mine: Shot[] = [];
        for (const viewport of VIEWPORTS) {
          if (recipe.overlay !== undefined && !PHONES.has(viewport.id)) continue;
          mine.push(await shoot(browser, recipe, viewport, "none"));
          if (viewport.tma !== null) mine.push(await shoot(browser, recipe, viewport, "tma"));
        }
        shots.push(...mine);
        const html = join(OUT, `${recipe.id}.html`);
        writeFileSync(html, stripHtml(recipe.id, mine), "utf8");
        const page = await browser.newPage({ viewport: { width: 2400, height: 720 } });
        await page.goto(pathToFileURL(html).href);
        await page.screenshot({ path: join(OUT, `${recipe.id}.png`), fullPage: true });
        await page.close();
        const count = (key: keyof Omit<Measure, "safe">): number =>
          mine.reduce((sum, shot) => sum + (shot.measure?.[key].length ?? 0), 0);
        console.log(
          `layoutSheet: ${recipe.id.padEnd(16)} overflow ${String(count("overflow"))} · clipped ${String(count("clippedText"))} · cut ${String(count("cut"))} · <44 ${String(count("smallTargets"))} · overlaps ${String(count("textOverlaps"))} · inset ${String(count("insetIntrusions"))}${mine.some((shot) => shot.error !== null) ? " · ERRORS" : ""}`,
        );
      }
    } finally {
      await browser.close();
    }
  } finally {
    if (server !== null) stopServer(server);
  }
  const sidecar = join(OUT, "layout-sheet.json");
  const order = [...RECIPES, ...OVERLAYS].map((recipe) => recipe.id);
  const kept =
    wanted !== null && existsSync(sidecar)
      ? (JSON.parse(readFileSync(sidecar, "utf8")) as Shot[]).filter((shot) => !wanted.has(shot.recipe))
      : [];
  const merged = [...kept, ...shots].sort((a, b) => order.indexOf(a.recipe) - order.indexOf(b.recipe));
  writeFileSync(sidecar, `${JSON.stringify(merged, null, 1)}\n`, "utf8");
  const verdict = layoutVerdict(shots, merged.length, OUT);
  console.log(verdict.line);
  if (verdict.exitCode !== 0) process.exitCode = verdict.exitCode;
};

await main();
