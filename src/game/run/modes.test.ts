import { describe, expect, it } from "vitest";
import { BOSS_ROW } from "@/game/map/types";
import {
  contentSector,
  depthFor,
  driftLoop,
  driftLoopHpPct,
  DRIFT_TIDE_CAP,
  isoWeekKey,
  isScoredMode,
  msUntilUtcReset,
  runScore,
  scoreBreakdown,
  SCORE_PER_DEPTH,
  SCORE_PER_KILL,
  utcDateKey,
} from "@/game/run/modes";
import { createInitialRunStats, type RunStats } from "@/stores/runStore";
import { BASE_TIDE_CAP, tideCapFor, jumpsPerTideFor, JUMPS_PER_TIDE } from "@/game/run/flow";

const statsWith = (patch: Partial<RunStats>): RunStats => ({
  ...createInitialRunStats(),
  ...patch,
});

describe("drift score", () => {
  it("is depth×50 + kills×5 + scrap earned (DESIGN §13)", () => {
    const stats = statsWith({ depth: 22, kills: 31, scrapEarned: 418 });
    expect(scoreBreakdown(stats)).toEqual({
      depth: 22,
      depthPoints: 22 * SCORE_PER_DEPTH,
      kills: 31,
      killPoints: 31 * SCORE_PER_KILL,
      scrap: 418,
      total: 22 * 50 + 31 * 5 + 418,
    });
    expect(runScore(stats)).toBe(1673);
  });

  it("scores zero on an untouched run", () => {
    expect(runScore(createInitialRunStats())).toBe(0);
  });

  it("ignores spending — the score reads scrap earned, not carried", () => {
    const spent = statsWith({ depth: 5, scrapEarned: 200, scrapSpent: 190 });
    const hoarded = statsWith({ depth: 5, scrapEarned: 200 });
    expect(runScore(spent)).toBe(runScore(hoarded));
  });
});

describe("drift depth and looping", () => {
  it("counts rows advanced, so a sector's boss row is depth 15", () => {
    expect(depthFor(1, 0)).toBe(0);
    expect(depthFor(1, BOSS_ROW)).toBe(BOSS_ROW);
    expect(depthFor(2, 0)).toBe(BOSS_ROW);
    expect(depthFor(3, 7)).toBe(2 * BOSS_ROW + 7);
  });

  it("clamps the content sector at five while the index keeps climbing", () => {
    expect(contentSector(1)).toBe(1);
    expect(contentSector(5)).toBe(5);
    expect(contentSector(9)).toBe(5);
    expect(driftLoop(5)).toBe(0);
    expect(driftLoop(8)).toBe(3);
  });

  it("scales enemy hull by 8% per loop", () => {
    expect(driftLoopHpPct(0)).toBe(0);
    expect(driftLoopHpPct(1)).toBe(8);
    expect(driftLoopHpPct(4)).toBe(32);
  });

  it("raises the tide cap to five in drift only", () => {
    expect(tideCapFor(0, "campaign")).toBe(BASE_TIDE_CAP);
    expect(tideCapFor(0, "drift")).toBe(DRIFT_TIDE_CAP);
    expect(tideCapFor(4, "drift")).toBe(DRIFT_TIDE_CAP);
    expect(tideCapFor(4, "campaign")).toBe(BASE_TIDE_CAP + 1);
  });

  it("shortens the tide clock under «Прилив»", () => {
    expect(jumpsPerTideFor([])).toBe(JUMPS_PER_TIDE);
    expect(jumpsPerTideFor(["risingTide"])).toBe(3);
  });
});

describe("mode classification", () => {
  it("scores drift and daily, not campaign or contracts", () => {
    expect(isScoredMode("drift")).toBe(true);
    expect(isScoredMode("daily")).toBe(true);
    expect(isScoredMode("campaign")).toBe(false);
    expect(isScoredMode("contract")).toBe(false);
  });
});

describe("utc calendar", () => {
  it("keys days by UTC date", () => {
    expect(utcDateKey(Date.UTC(2026, 6, 27, 23, 59))).toBe("2026-07-27");
    expect(utcDateKey(Date.UTC(2026, 6, 28, 0, 1))).toBe("2026-07-28");
  });

  it("counts down to the next UTC midnight", () => {
    expect(msUntilUtcReset(Date.UTC(2026, 6, 27, 23, 0))).toBe(3_600_000);
    expect(msUntilUtcReset(Date.UTC(2026, 6, 27, 0, 0))).toBe(86_400_000);
  });

  it("keys weeks by ISO week", () => {
    expect(isoWeekKey(Date.UTC(2026, 0, 1))).toBe("2026-01");
    expect(isoWeekKey(Date.UTC(2026, 6, 27))).toBe(
      isoWeekKey(Date.UTC(2026, 6, 30)),
    );
    expect(isoWeekKey(Date.UTC(2026, 6, 27))).not.toBe(
      isoWeekKey(Date.UTC(2026, 7, 5)),
    );
  });
});
