import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import * as GRIDS from "@/app/grids";
import { SRC, relativeToSrc, sourceFiles } from "@/app/sourceFiles";

const ZINDEX = join(SRC, "app", "zindex.css");

describe("the z-scale owns every stacking value", () => {
  it("declares each token once and rises in declaration order", () => {
    const css = readFileSync(ZINDEX, "utf8");
    const values = [...css.matchAll(/--z-[a-z-]+:\s*(-?\d+);/g)].map((match) =>
      Number(match[1]),
    );
    expect(values.length).toBeGreaterThan(0);
    for (let i = 1; i < values.length; i += 1) {
      expect(values[i]).toBeGreaterThan(values[i - 1] ?? 0);
    }
  });

  it("is the only place a stylesheet writes a stacking numeral", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(".css")) {
      if (file === ZINDEX) continue;
      const css = readFileSync(file, "utf8");
      for (const match of css.matchAll(/z-index:\s*([^;]+);/g)) {
        const value = (match[1] ?? "").trim();
        if (value.startsWith("var(--z-")) continue;
        if (value === "auto" || value === "inherit") continue;
        offenders.push(`${relativeToSrc(file)}: ${value}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("is the only place a component writes a stacking numeral", () => {
    const offenders: string[] = [];
    for (const suffix of [".ts", ".tsx"]) {
      for (const file of sourceFiles(suffix)) {
        if (file.endsWith(".test.ts") || file.endsWith(".test.tsx")) continue;
        const source = readFileSync(file, "utf8");
        for (const match of source.matchAll(/zIndex:\s*([^,}\n]+)/g)) {
          const value = (match[1] ?? "").trim();
          if (value.includes("var(--z-")) continue;
          offenders.push(`${relativeToSrc(file)}: ${value}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("grid columns come from one table", () => {
  it("names every column set it ships", () => {
    const sets = Object.values(GRIDS);
    expect(sets.length).toBeGreaterThan(0);
    for (const set of sets) {
      expect(Object.keys(set)).toContain("base");
    }
  });

  it("lets no screen write a literal column count", () => {
    const named = new Set(Object.keys(GRIDS));
    const offenders: string[] = [];
    for (const file of sourceFiles(".tsx")) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(/\bcols=\{\{([^{}]*)\}\}/g)) {
        offenders.push(`${relativeToSrc(file)}: cols={{${(match[1] ?? "").trim()}}}`);
      }
      for (const match of source.matchAll(/\bcols=\{([^{}]*)\}/g)) {
        const value = (match[1] ?? "").trim();
        if (named.has(value)) continue;
        offenders.push(`${relativeToSrc(file)}: cols={${value}}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("the tight step outranks the compact step", () => {
  it("declares every tight block after the last compact block", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(".css")) {
      const css = readFileSync(file, "utf8");
      const lastCompact = css.lastIndexOf("[data-ca-compact=");
      const firstTight = css.indexOf("[data-ca-tight=");
      if (lastCompact < 0 || firstTight < 0) continue;
      if (firstTight < lastCompact) offenders.push(relativeToSrc(file));
    }
    expect(offenders).toEqual([]);
  });
});
