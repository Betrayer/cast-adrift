import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { bodyOf, rulesOf, valueOf, valuesOf } from "@/app/cssRules";
import {
  MOTION_EASE_CSS,
  MOTION_MS,
  POP_MS,
  REDUCED_MS,
  SPRING_SAMPLES,
  springLinearCss,
  STAGGER_MS,
  SWEEP_MS,
} from "@/app/motion";
import { readSource, relativeToSrc, sourceFiles } from "@/app/sourceFiles";
import { spring } from "@/pixi/tween";

const TRANSITIONS = readSource("app", "transitions.css");
const ROUTER = readSource("app", "Router.module.css");
const REWARDS = readSource("screens", "Rewards", "Rewards.module.css");
const DIE_REWARD = readSource("screens", "Rewards", "DieReward.tsx");
const ROOT = bodyOf(TRANSITIONS, ":root");

const ms = (value: string | null): number => {
  expect(value).not.toBeNull();
  const match = /^(\d+(?:\.\d+)?)ms$/.exec(value ?? "");
  expect(match, `${String(value)} is a millisecond literal`).not.toBeNull();
  return Number(match?.[1]);
};

const MOTION_PROPERTIES = [
  "animation",
  "transition",
  "animation-timing-function",
  "transition-timing-function",
] as const;

const VENDOR_PREFIX = "(?:-[a-z]+-)?";

const durationIn = (body: string): string | null => {
  const animation = valueOf(body, "animation");
  if (animation === null) return null;
  return animation.split(" ")[1] ?? null;
};

describe("motion vocabulary — TS and CSS agree", () => {
  it("mirrors every duration step as a root custom property", () => {
    for (const [step, value] of Object.entries(MOTION_MS)) {
      expect(ms(valueOf(ROOT, `--ca-motion-${step}`))).toBe(value);
    }
    expect(ms(valueOf(ROOT, "--ca-motion-reduced"))).toBe(REDUCED_MS);
  });

  it("mirrors both staggers and keeps the legacy aliases on the tokens", () => {
    expect(ms(valueOf(ROOT, "--ca-stagger-list"))).toBe(STAGGER_MS.list);
    expect(ms(valueOf(ROOT, "--ca-stagger-card"))).toBe(STAGGER_MS.card);
    expect(valueOf(ROOT, "--ca-stagger-ms")).toBe("var(--ca-stagger-list)");
    expect(valueOf(ROOT, "--ca-enter-ms")).toBe("var(--ca-motion-s)");
  });

  it("mirrors the out and back curves", () => {
    expect(valueOf(ROOT, "--ca-ease-out")).toBe(MOTION_EASE_CSS.out);
    expect(valueOf(ROOT, "--ca-ease-back")).toBe(MOTION_EASE_CSS.back);
  });

  it("drives the rise and the router fade from tokens, not literals", () => {
    expect(durationIn(bodyOf(TRANSITIONS, "[data-rise]"))).toBe(
      "var(--ca-motion-m)",
    );
    expect(durationIn(bodyOf(TRANSITIONS, "[data-armed='1']::after"))).toBe(
      "var(--ca-motion-m)",
    );
    expect(durationIn(bodyOf(ROUTER, ".screen"))).toBe("var(--ca-enter-ms)");
  });

  it("pins the pop and the sweep to their TS twins", () => {
    expect(ms(durationIn(bodyOf(TRANSITIONS, "[data-pop='1']")))).toBe(POP_MS);
    expect(
      ms(durationIn(bodyOf(TRANSITIONS, "[data-sweep-host][data-sweep='1']::after"))),
    ).toBe(SWEEP_MS);
  });

  it("drives the reward card's spring from the TS spring, behind a fallback", () => {
    const card = bodyOf(REWARDS, ".entryCard");
    expect(valueOf(card, "animation-timing-function")).toBe("var(--ca-ease-back)");
    expect(REWARDS).toContain("@supports (animation-timing-function: linear(0, 1))");
    const sprung = bodyOf(REWARDS, ".entryCard[data-spring]");
    expect(valueOf(sprung, "animation-timing-function")).toBe("var(--ca-card-spring)");
    expect(DIE_REWARD).toMatch(/CARD_SPRING = springLinearCss\(\)/);
    expect(DIE_REWARD).toMatch(/"--ca-card-spring": CARD_SPRING/);
    expect(springLinearCss().startsWith("linear(")).toBe(true);
    const samples = /linear\(([^)]*)\)/.exec(springLinearCss())?.[1]?.split(",");
    expect(samples).toHaveLength(SPRING_SAMPLES + 1);
    samples?.forEach((sample, index) => {
      expect(Number(sample)).toBeCloseTo(spring(index / SPRING_SAMPLES), 3);
    });
  });

  it("names the out curve by its token, never by the browser's own keyword", () => {
    const offenders: string[] = [];
    const bare = /(?<![-\w(])ease(?:-out)?(?![-\w(])/;
    for (const file of sourceFiles(".css")) {
      for (const rule of rulesOf(readFileSync(file, "utf8"))) {
        for (const property of MOTION_PROPERTIES) {
          const values = valuesOf(rule.body, VENDOR_PREFIX + property);
          if (values.some((value) => bare.test(value))) {
            offenders.push(`${relativeToSrc(file)} ${rule.selector} ${property}`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("never reads the OS query directly — the root attribute owns reduced motion", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(".css")) {
      const css = readFileSync(file, "utf8");
      if (/prefers-reduced-motion/.test(css)) offenders.push(relativeToSrc(file));
    }
    expect(offenders).toEqual([]);
  });

  it("gives every Mantine sheet a reduced twin", () => {
    const reduced = rulesOf(TRANSITIONS).filter((rule) =>
      rule.selector.includes(".mantine-Modal-content"),
    );
    expect(reduced).toHaveLength(1);
    expect(reduced[0]?.selector).toContain("[data-ca-motion='reduced']");
  });
});
