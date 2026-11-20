import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CHART_NODE_BY_ID, CHART_NODES } from "@/data/chart";
import { actionMagnitudes } from "@/data/chart/scale";
import { chartNodeLines, chartRequirementLines, type Translate } from "@/game/chart/describe";

const t: Translate = (key, opts) => `${key} ${JSON.stringify(opts ?? {})}`;

describe("chart requirement lines", () => {
  it("names the unmet branch depth a keystone waits on", () => {
    const node = CHART_NODE_BY_ID.get("red-key1");
    expect(node).toBeDefined();
    if (node === undefined) return;
    const lines = chartRequirementLines(node, ["hub-i0"], t);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("meta:chart.requiresPoints");
    expect(lines[0]).toContain(`"n":${String(node.requires?.pointsIn.red)}`);
  });

  it("reports a confluence node's steps and invested points", () => {
    const node = CHART_NODE_BY_ID.get("red-c1");
    expect(node).toBeDefined();
    if (node === undefined) return;
    const lines = chartRequirementLines(node, ["hub-i0"], t);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("meta:chart.scaledBy");
    expect(lines[0]).toContain('"steps":0');
    expect(lines[0]).toContain('"points":0');
  });
});

describe("a chart card's effect line", () => {
  const LOCALES = ["en", "uk", "ru", "de", "es", "fr", "pl"];

  const translatorFor = (locale: string): Translate => {
    const meta = JSON.parse(readFileSync(new URL(`../../i18n/${locale}/meta.json`, import.meta.url), "utf8")) as {
      chartFx: { fx: Record<string, string> };
    };
    return (key, opts) => {
      const template = key.startsWith("meta:chartFx.fx.") ? meta.chartFx.fx[key.slice("meta:chartFx.fx.".length)] ?? key : key;
      return template.replace(/\{\{(\w+)\}\}/g, (_whole, name: string) => String((opts ?? {})[name] ?? `{{${name}}}`));
    };
  };

  it("prints every number the node's own effects carry, at every tier", () => {
    const en = translatorFor("en");
    const wrong: string[] = [];
    for (const node of CHART_NODES) {
      if (node.fx === undefined || node.effects === undefined) continue;
      const line = chartNodeLines(node, en).find((entry) => !entry.drawback && entry.text.length > 0 && !entry.text.startsWith("meta:"))?.text ?? "";
      const numbers = [...line.matchAll(/\d+/g)].map((match) => Number(match[0]));
      const magnitudes = node.effects.flatMap((effect) => actionMagnitudes(effect.do)).map((value) => Math.abs(value));
      if (magnitudes.some((value) => !numbers.includes(value))) wrong.push(`${node.id}: ${line} (${magnitudes.join("/")})`);
    }
    expect(wrong).toEqual([]);
  });

  it("shares a template without a placeholder only between nodes that print the same numbers", () => {
    const fx = (
      JSON.parse(readFileSync(new URL("../../i18n/en/meta.json", import.meta.url), "utf8")) as {
        chartFx: { fx: Record<string, string> };
      }
    ).chartFx.fx;
    const vectorsByKey = new Map<string, Set<string>>();
    for (const node of CHART_NODES) {
      if (node.fx === undefined || node.effects === undefined) continue;
      const vector = node.effects.flatMap((effect) => actionMagnitudes(effect.do)).map((value) => Math.abs(value));
      if (vector.length === 0) continue;
      if ((fx[node.fx.slice("meta:chartFx.fx.".length)] ?? "").includes("{{n}}")) continue;
      vectorsByKey.set(node.fx, (vectorsByKey.get(node.fx) ?? new Set<string>()).add(vector.join("/")));
    }
    const mixed = [...vectorsByKey]
      .filter(([, vectors]) => vectors.size > 1)
      .map(([key, vectors]) => `${key}: ${[...vectors].join(" vs ")}`);
    expect(mixed).toEqual([]);
  });

  it("keeps every locale's numbers and placeholders in step with English, key by key", () => {
    const read = (locale: string): Record<string, string> =>
      (
        JSON.parse(readFileSync(new URL(`../../i18n/${locale}/meta.json`, import.meta.url), "utf8")) as {
          chartFx: { fx: Record<string, string> };
        }
      ).chartFx.fx;
    const placeholders = (text: string): string =>
      [...text.matchAll(/\{\{\w+\}\}/g)]
        .map((match) => match[0])
        .sort()
        .join(" ");
    const digits = (text: string): string[] => [...text.matchAll(/\d+/g)].map((match) => match[0]);
    const withinEnglish = (local: string, source: string): boolean => {
      const pool = digits(source);
      return digits(local).every((digit) => {
        const at = pool.indexOf(digit);
        if (at < 0) return false;
        pool.splice(at, 1);
        return true;
      });
    };
    const english = read("en");
    const drift: string[] = [];
    for (const locale of LOCALES.filter((code) => code !== "en")) {
      const fx = read(locale);
      for (const [key, text] of Object.entries(english)) {
        const local = fx[key] ?? "";
        if (placeholders(local) !== placeholders(text) || !withinEnglish(local, text)) drift.push(`${locale} ${key}: ${local || "(missing)"}`);
      }
    }
    expect(drift).toEqual([]);
  });

  it("leaves no placeholder unfilled in any locale", () => {
    for (const locale of LOCALES) {
      const translate = translatorFor(locale);
      const unfilled = CHART_NODES.filter((node) => node.fx !== undefined)
        .flatMap((node) => chartNodeLines(node, translate).map((entry) => entry.text))
        .filter((text) => text.includes("{{"));
      expect({ locale, unfilled }).toEqual({ locale, unfilled: [] });
    }
  });

  it("reads the tier-IV blue sustain small at its ramped number", () => {
    const node = CHART_NODE_BY_ID.get("blue-s23");
    if (node === undefined) throw new Error("no blue-s23");
    expect(chartNodeLines(node, translatorFor("en")).map((entry) => entry.text)).toContain("Repair 2 hull on every jump while tide is 2+");
  });
});
