import { expect, test } from '../fixtures';

interface FrameReport {
  frames: number;
  medianMs: number;
  p95Ms: number;
  worstMs: number;
  longFrames: number;
}

declare global {
  interface Window {
    caFrameReport?: FrameReport;
  }
}

const SAMPLE_MS = 3000;

const LONG_FRAME_MS = 20;

const measure = async (
  page: import('@playwright/test').Page,
): Promise<FrameReport> => {
  await page.evaluate((ms) => {
    const gaps: number[] = [];
    let last = 0;
    const started = performance.now();
    const frame = (now: number): void => {
      if (last !== 0) gaps.push(now - last);
      last = now;
      if (now - started < ms) {
        requestAnimationFrame(frame);
        return;
      }
      const sorted = [...gaps].sort((a, b) => a - b);
      const at = (q: number): number =>
        sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))] ?? 0;
      window.caFrameReport = {
        frames: sorted.length,
        medianMs: Math.round(at(0.5) * 100) / 100,
        p95Ms: Math.round(at(0.95) * 100) / 100,
        worstMs: Math.round((sorted[sorted.length - 1] ?? 0) * 100) / 100,
        longFrames: sorted.filter((gap) => gap > 20).length,
      };
    };
    window.caFrameReport = undefined;
    requestAnimationFrame(frame);
  }, SAMPLE_MS);
  await page.waitForFunction(() => window.caFrameReport !== undefined, null, {
    timeout: SAMPLE_MS * 3,
  });
  const report = await page.evaluate(() => window.caFrameReport);
  if (report === undefined) throw new Error('frame report never arrived');
  return report;
};

const seatComposite = async (
  app: import('../screens').Screens,
  vignette: 'off' | 'full',
): Promise<FrameReport> => {
  await app.setSettings({ vignette });
  await app.seedRun({ seed: 7 });
    await app.startBattle({
      enemyIds: ['quarantineWarden'],
      deck: ['ember', 'frostplate', 'sprout', 'grey-d4', 'ashen', 'coreshard'],
      seed: 42,
      hull: 8,
      hullMax: 40,
      startCharge: 6,
    });
  await app.testId('boss-intro-begin').click();
  await app.waitForPlacement();
  await app.vignetteRim('shield', true);
  await app.vignetteRim('lowHull', true);
  await app.page.evaluate(() => {
    const fire = (): void => {
      window.caTest?.fireVignette('hullHit', 'left');
      window.caTest?.fireVignette('shieldGain');
    };
    window.setInterval(fire, 250);
    fire();
  });
  return measure(app.page);
};

const report = (label: string, frames: FrameReport): void => {
  test.info().annotations.push({
    type: 'perf',
    description: `${label} ${JSON.stringify(frames)}`,
  });
  console.log(`perf ${label}: ${JSON.stringify(frames)}`);
};

test.describe('motion performance', () => {
  test('the heaviest composite holds its frame budget', async ({ app }) => {
    const frames = await seatComposite(app, 'full');
    report('vignette=full', frames);
    expect(frames.frames).toBeGreaterThan(60);
    expect(frames.medianMs).toBeLessThan(LONG_FRAME_MS);
    expect(frames.p95Ms).toBeLessThan(34);
  });

  test('the same composite with the vignette off is a real control', async ({
    app,
  }) => {
    const frames = await seatComposite(app, 'off');
    report('vignette=off', frames);
    const layer = await app.page.evaluate(() => {
      const node = document.querySelector('[data-screen="battle"] [data-vignette]');
      if (node === null) return null;
      return {
        intensity: node.getAttribute('data-vignette-intensity'),
        painted: getComputedStyle(node).display !== 'none',
        flashes: node.querySelectorAll('[data-vignette-flash]').length,
      };
    });
    expect(layer).toEqual({ intensity: 'off', painted: false, flashes: 0 });
    expect(frames.frames).toBeGreaterThan(60);
    expect(frames.medianMs).toBeLessThan(LONG_FRAME_MS);
  });
});
