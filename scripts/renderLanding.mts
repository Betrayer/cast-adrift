import { mkdirSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";

const ROOT = process.cwd();
const LANDING = join(ROOT, "landing");
const BRAND = join(LANDING, "brand");
const SEED = 20260921;

interface Shot {
  file: string;
  width: number;
  height: number;
}

const SHOTS: readonly Shot[] = [
  { file: "og.png", width: 1200, height: 630 },
  { file: "cover.png", width: 640, height: 360 },
];

const url = (): string => `${pathToFileURL(join(LANDING, "index.html")).href}?seed=${String(SEED)}&still=1&lang=en`;

const render = async (): Promise<void> => {
  mkdirSync(BRAND, { recursive: true });
  const browser = await chromium.launch();
  try {
    for (const shot of SHOTS) {
      const page = await browser.newPage({
        viewport: { width: shot.width, height: shot.height },
        deviceScaleFactor: 1,
      });
      await page.goto(url(), { waitUntil: "load" });
      await page.waitForTimeout(400);
      await page.screenshot({ path: join(BRAND, shot.file) });
      await page.close();
      console.log(
        `render-landing: ${shot.file} ${String(shot.width)}x${String(shot.height)} seed ${String(SEED)}`,
      );
    }
  } finally {
    await browser.close();
  }
};

await render();
