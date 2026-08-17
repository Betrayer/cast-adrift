import process from 'node:process';
import { devices, type PlaywrightTestConfig } from '@playwright/test';

export const PREVIEW_PORT = 4173;
export const BASE_URL = `http://127.0.0.1:${String(PREVIEW_PORT)}`;
export const MAX_DIFF_PIXEL_RATIO = 0.02;

export const isCI = process.env.CI === 'true' || process.env.CI === '1';

const MOTION_SPECS = /.*\.motion\.spec\.ts/;
const EMULATOR_SPECS = /.*\.emu\.spec\.ts/;
const BASELINE_SPECS = /.*visual\.spec\.ts/;

const touchDevice = {
  ...devices['Desktop Chrome'],
  deviceScaleFactor: 1,
  hasTouch: true,
};

export type E2eMode = 'e2e' | 'e2e-emu';

export const createConfig = (mode: E2eMode): PlaywrightTestConfig => ({
  testDir: './e2e/specs',
  outputDir: './e2e/.artifacts',
  snapshotPathTemplate:
    '{testDir}/__screenshots__/{testFileName}/{arg}-{projectName}{ext}',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 2 : undefined,
  reporter: isCI ? [['github'], ['list']] : [['list']],
  timeout: 90_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      maxDiffPixelRatio: MAX_DIFF_PIXEL_RATIO,
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
    },
  },
  use: {
    baseURL: BASE_URL,
    contextOptions: { reducedMotion: 'reduce' },
    colorScheme: 'dark',
    locale: 'en-GB',
    timezoneId: 'UTC',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects:
    mode === 'e2e-emu'
      ? [
          {
            name: 'emulatorMobile',
            testMatch: EMULATOR_SPECS,
            use: {
              ...touchDevice,
              viewport: { width: 390, height: 844 },
              isMobile: true,
            },
          },
          {
            name: 'emulatorDesktop',
            testMatch: EMULATOR_SPECS,
            use: {
              ...devices['Desktop Chrome'],
              deviceScaleFactor: 1,
              viewport: { width: 1280, height: 800 },
            },
          },
        ]
      : [
          {
            name: 'mobile',
            testIgnore: [MOTION_SPECS, EMULATOR_SPECS],
            use: {
              ...touchDevice,
              viewport: { width: 390, height: 844 },
              isMobile: true,
            },
          },
          {
            name: 'mobileSmall',
            testIgnore: [MOTION_SPECS, EMULATOR_SPECS, BASELINE_SPECS],
            use: {
              ...touchDevice,
              viewport: { width: 360, height: 640 },
              isMobile: true,
            },
          },
          {
            name: 'tablet',
            testIgnore: [MOTION_SPECS, EMULATOR_SPECS, BASELINE_SPECS],
            use: { ...touchDevice, viewport: { width: 768, height: 1024 } },
          },
          {
            name: 'desktop',
            testIgnore: [MOTION_SPECS, EMULATOR_SPECS],
            use: {
              ...devices['Desktop Chrome'],
              deviceScaleFactor: 1,
              viewport: { width: 1280, height: 800 },
            },
          },
          {
            name: 'motion',
            testMatch: MOTION_SPECS,
            use: {
              ...touchDevice,
              viewport: { width: 390, height: 844 },
              isMobile: true,
              contextOptions: { reducedMotion: 'no-preference' },
            },
          },
        ],
  webServer: {
    command: `npm run e2e:build -- --mode ${mode} && npm run e2e:serve -- --mode ${mode}`,
    url: BASE_URL,
    reuseExistingServer: !isCI,
    timeout: 300_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
