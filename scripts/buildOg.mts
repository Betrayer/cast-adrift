import { readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { chromium } from "@playwright/test";

// Telegram, Twitter and Discord all refuse SVG for a share preview, and the
// stack has no rasteriser. Playwright is already a dev dependency for the e2e
// drivers, so the same Chromium turns landing/brand/og.svg into the PNG that
// ships. Run once whenever the SVG changes: `tsx scripts/buildOg.mts`.
const SOURCE = join(process.cwd(), "landing", "brand", "og.svg");
const TARGET = join(process.cwd(), "landing", "brand", "og.png");

const main = async (): Promise<void> => {
  const svg = readFileSync(SOURCE, "utf8");
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  await page.setContent(
    `<!doctype html><html><body style="margin:0">${svg}</body></html>`,
    { waitUntil: "load" },
  );
  await page.screenshot({ path: TARGET, clip: { x: 0, y: 0, width: 1200, height: 630 } });
  await browser.close();
  console.log(`build-og: wrote ${TARGET}`);
};

void main();
