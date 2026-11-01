import i18next from "i18next";
import { describe, expect, it } from "vitest";
import deRun from "@/i18n/de/run.json";
import enRun from "@/i18n/en/run.json";
import esRun from "@/i18n/es/run.json";
import frRun from "@/i18n/fr/run.json";
import plRun from "@/i18n/pl/run.json";
import ruRun from "@/i18n/ru/run.json";
import ukRun from "@/i18n/uk/run.json";
import {
  COUNT_MARK,
  splitAtCountMark,
  SUMMARY_CEREMONY_AT_MS,
  SUMMARY_COUNT_ORDER,
  SUMMARY_COUNT_STEPS,
  SUMMARY_SEQUENCE_MS,
} from "./countSequence";

const RUN_BY_LOCALE = {
  en: enRun,
  ru: ruRun,
  uk: ukRun,
  de: deRun,
  es: esRun,
  fr: frRun,
  pl: plRun,
} as const;

const COUNTED_LINES = ["summary.nodes", "summary.kills", "summary.earned"] as const;

const stepOf = (id: (typeof SUMMARY_COUNT_ORDER)[number]) => {
  const step = SUMMARY_COUNT_STEPS.find((entry) => entry.id === id);
  expect(step).toBeDefined();
  return step ?? { id, delay: 0, ms: 0 };
};

describe("summary count sequence", () => {
  it("counts XP, then shards, then the run's own numbers", () => {
    expect(SUMMARY_COUNT_STEPS.map((step) => step.id)).toEqual([
      ...SUMMARY_COUNT_ORDER,
    ]);
    const starts = SUMMARY_COUNT_STEPS.map((step) => step.delay);
    expect([...starts].sort((a, b) => a - b)).toEqual(starts);
  });

  it("lets each headline number land before the next one starts", () => {
    const xp = stepOf("xp");
    const shards = stepOf("shards");
    const nodes = stepOf("nodes");
    expect(shards.delay).toBeGreaterThanOrEqual(xp.delay + xp.ms);
    expect(nodes.delay).toBeGreaterThanOrEqual(shards.delay + shards.ms);
  });

  it("opens the level-up ceremony only after the last number has landed", () => {
    for (const step of SUMMARY_COUNT_STEPS) {
      expect(step.delay + step.ms).toBeLessThanOrEqual(SUMMARY_SEQUENCE_MS);
    }
    expect(SUMMARY_CEREMONY_AT_MS).toBeGreaterThan(SUMMARY_SEQUENCE_MS);
  });
});

describe("summary count lines", () => {
  it("keeps the count mark a real character, not an empty string", () => {
    expect(COUNT_MARK).toHaveLength(1);
    expect(splitAtCountMark("Nodes cleared: 7")).toEqual({
      before: "Nodes cleared: 7",
      after: "",
    });
  });

  it("splits every locale's counted line around the number", async () => {
    for (const [lng, run] of Object.entries(RUN_BY_LOCALE)) {
      const t = i18next.createInstance();
      await t.init({
        lng,
        resources: { [lng]: { run } },
        defaultNS: "run",
        interpolation: { escapeValue: false },
      });
      for (const key of COUNTED_LINES) {
        const marked = t.t(key, { n: COUNT_MARK });
        expect(marked, `${lng} ${key}`).not.toBe(key);
        const { before, after } = splitAtCountMark(marked);
        expect(`${before}7${after}`, `${lng} ${key}`).toBe(t.t(key, { n: 7 }));
        expect(before.length + after.length, `${lng} ${key}`).toBe(marked.length - 1);
      }
    }
  });
});
