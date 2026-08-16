import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  atLeast,
  BREAKPOINTS,
  BREAKPOINT_ORDER,
  breakpointFor,
  HEIGHTS,
  HEIGHT_ORDER,
  needsRotateGate,
  ROTATE_GATE_MAX_HEIGHT,
} from "@/app/breakpoints";

const SRC = join(process.cwd(), "src");

const cssFiles = (): string[] =>
  readdirSync(SRC, { recursive: true, encoding: "utf8" })
    .filter((entry) => entry.endsWith(".css"))
    .map((entry) => join(SRC, entry));

describe("breakpoint scale", () => {
  it("rises monotonically in declaration order", () => {
    const values = BREAKPOINT_ORDER.map((name) => BREAKPOINTS[name]);
    for (let i = 1; i < values.length; i += 1) {
      expect(values[i]).toBeGreaterThan(values[i - 1] ?? 0);
    }
  });

  it("names the widest breakpoint a width has reached", () => {
    expect(breakpointFor(320)).toBe("xs");
    expect(breakpointFor(360)).toBe("xs");
    expect(breakpointFor(390)).toBe("xs");
    expect(breakpointFor(480)).toBe("sm");
    expect(breakpointFor(768)).toBe("md");
    expect(breakpointFor(899)).toBe("md");
    expect(breakpointFor(900)).toBe("lg");
    expect(breakpointFor(1280)).toBe("xl");
    expect(breakpointFor(1920)).toBe("xl");
  });

  it("treats the breakpoint width itself as inside the breakpoint", () => {
    for (const name of BREAKPOINT_ORDER) {
      expect(atLeast(BREAKPOINTS[name], name)).toBe(true);
      expect(atLeast(BREAKPOINTS[name] - 1, name)).toBe(false);
    }
  });
});

describe("rotate gate condition", () => {
  it("fires on phone landscape", () => {
    expect(needsRotateGate(780, 390)).toBe(true);
    expect(needsRotateGate(844, 390)).toBe(true);
    expect(needsRotateGate(640, 360)).toBe(true);
  });

  it("stays silent in portrait at every matrix size", () => {
    expect(needsRotateGate(360, 640)).toBe(false);
    expect(needsRotateGate(390, 844)).toBe(false);
    expect(needsRotateGate(768, 1024)).toBe(false);
  });

  it("stays silent on desktop and on a small desktop window", () => {
    expect(needsRotateGate(1280, 800)).toBe(false);
    expect(needsRotateGate(1920, 1080)).toBe(false);
    expect(needsRotateGate(800, 600)).toBe(false);
  });

  it("needs all three conditions, not any of them", () => {
    expect(needsRotateGate(BREAKPOINTS.lg, ROTATE_GATE_MAX_HEIGHT - 1)).toBe(
      false,
    );
    expect(needsRotateGate(BREAKPOINTS.lg - 1, ROTATE_GATE_MAX_HEIGHT)).toBe(
      false,
    );
    expect(needsRotateGate(400, 401)).toBe(false);
  });
});

describe("stylesheets share the one breakpoint scale", () => {
  it("uses no media-query width or height that the scale does not declare", () => {
    const declared = new Set<number>();
    for (const name of BREAKPOINT_ORDER) {
      declared.add(BREAKPOINTS[name]);
      declared.add(BREAKPOINTS[name] - 1);
    }
    for (const name of HEIGHT_ORDER) {
      declared.add(HEIGHTS[name]);
      declared.add(HEIGHTS[name] - 1);
    }
    const offenders: string[] = [];
    for (const file of cssFiles()) {
      const css = readFileSync(file, "utf8");
      for (const match of css.matchAll(
        /\(\s*(?:min|max)-(?:width|height):\s*(\d+)px/g,
      )) {
        const px = Number(match[1]);
        if (!declared.has(px)) offenders.push(`${file}: ${String(px)}px`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
