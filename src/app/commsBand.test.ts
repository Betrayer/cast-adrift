import { describe, expect, it } from "vitest";
import { commsMetricsOf, fitCommsBand, type CommsMetrics } from "@/app/commsBand";

const ROOMY: CommsMetrics = { lead: 40, row: 25, gap: 4, inset: 4 };
const COMPACT: CommsMetrics = { lead: 34, row: 21, gap: 3, inset: 3 };

const styleOf = (values: Record<string, string>) => ({
  getPropertyValue: (name: string): string => values[name] ?? "",
});

describe("fitCommsBand, roomy", () => {
  it.each([
    [29, 1, 1],
    [43, 1, 1],
    [43.6, 1, 2],
    [44, 1, 2],
    [72, 1, 2],
    [73, 2, 2],
    [101.4, 2, 2],
    [101.6, 3, 2],
    [102, 3, 2],
  ])("fits %s px as %s row(s) of %s lead line(s)", (height, rows, lines) => {
    expect(fitCommsBand(height, ROOMY)).toEqual({ rows, lines });
  });

  it("never fits more than three rows", () => {
    expect(fitCommsBand(600, ROOMY)).toEqual({ rows: 3, lines: 2 });
  });
});

describe("fitCommsBand, compact", () => {
  it.each([
    [24, 1, 1],
    [36, 1, 1],
    [36.6, 1, 2],
    [37, 1, 2],
    [61, 2, 2],
    [84.4, 2, 2],
    [85, 3, 2],
  ])("fits %s px as %s row(s) of %s lead line(s)", (height, rows, lines) => {
    expect(fitCommsBand(height, COMPACT)).toEqual({ rows, lines });
  });
});

describe("fitCommsBand, unreadable metrics", () => {
  it("falls back to one single-line row", () => {
    const metrics = commsMetricsOf(styleOf({}));
    expect(fitCommsBand(102, metrics)).toEqual({ rows: 1, lines: 1 });
  });
});

describe("commsMetricsOf", () => {
  it("derives the lead and row heights from the band's custom properties", () => {
    const metrics = commsMetricsOf(
      styleOf({
        "--comms-line": " 15px",
        "--comms-pad": "4px",
        "--comms-gap": " 4px",
        "--comms-inset": "4px",
      }),
    );
    expect(metrics).toEqual(ROOMY);
  });

  it("derives the compact profile the same way", () => {
    const metrics = commsMetricsOf(
      styleOf({
        "--comms-line": "13px",
        "--comms-pad": " 3px",
        "--comms-gap": "3px",
        "--comms-inset": " 3px",
      }),
    );
    expect(metrics).toEqual(COMPACT);
  });
});
