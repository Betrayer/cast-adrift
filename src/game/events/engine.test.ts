import { describe, expect, it } from "vitest";
import { createStream } from "@/services/rng";
import {
  eligibleEvents,
  eventEligible,
  matchesFlagQuery,
  optionMet,
  pickEvent,
  selectOutcome,
  type EventContext,
  type OptionContext,
} from "@/game/events/engine";
import type { EventDef, Outcome } from "@/types/events";

const ctx = (over: Partial<EventContext> = {}): EventContext => ({
  sector: 1,
  axis: 0,
  flags: {},
  seenEvents: [],
  ...over,
});

const ev = (over: Partial<EventDef> & { id: string }): EventDef => ({
  weight: 10,
  text: "content:events.driftingPod.text",
  options: [],
  ...over,
});

describe("event eligibility", () => {
  it("filters by sector", () => {
    const e = ev({ id: "a", requires: { sector: [2] } });
    expect(eventEligible(e, ctx({ sector: 1 }))).toBe(false);
    expect(eventEligible(e, ctx({ sector: 2 }))).toBe(true);
  });

  it("filters by resonance axis window", () => {
    const e = ev({ id: "a", requires: { resonance: [-3, 3] } });
    expect(eventEligible(e, ctx({ axis: 5 }))).toBe(false);
    expect(eventEligible(e, ctx({ axis: -5 }))).toBe(false);
    expect(eventEligible(e, ctx({ axis: 2 }))).toBe(true);
  });

  it("filters by flag query (all / any / not)", () => {
    expect(matchesFlagQuery({ x: true }, { all: ["x"] })).toBe(true);
    expect(matchesFlagQuery({}, { all: ["x"] })).toBe(false);
    expect(matchesFlagQuery({ y: 2 }, { any: ["x", "y"] })).toBe(true);
    expect(matchesFlagQuery({ x: true }, { not: ["x"] })).toBe(false);
    const e = ev({ id: "a", requires: { flags: { all: ["courierFreed"] } } });
    expect(eventEligible(e, ctx())).toBe(false);
    expect(eventEligible(e, ctx({ flags: { courierFreed: true } }))).toBe(true);
  });

  it("excludes already-seen events", () => {
    const e = ev({ id: "a" });
    expect(eventEligible(e, ctx({ seenEvents: ["a"] }))).toBe(false);
  });

  it("eligibleEvents respects kind", () => {
    const pool = [ev({ id: "a" }), ev({ id: "b", kind: "anomaly" })];
    expect(eligibleEvents(pool, ctx(), "event").map((e) => e.id)).toEqual(["a"]);
    expect(eligibleEvents(pool, ctx(), "anomaly").map((e) => e.id)).toEqual([
      "b",
    ]);
  });
});

describe("pickEvent determinism", () => {
  it("same seed picks the same event", () => {
    const pool = [
      ev({ id: "a", weight: 5 }),
      ev({ id: "b", weight: 5 }),
      ev({ id: "c", weight: 5 }),
    ];
    const first = pickEvent(pool, ctx(), "event", createStream(99));
    const second = pickEvent(pool, ctx(), "event", createStream(99));
    expect(first?.id).toBe(second?.id);
  });

  it("returns null when nothing is eligible", () => {
    const pool = [ev({ id: "a", requires: { sector: [3] } })];
    expect(pickEvent(pool, ctx({ sector: 1 }), "event", createStream(1))).toBe(
      null,
    );
  });
});

describe("selectOutcome determinism", () => {
  const outcomes: Outcome[] = [
    { text: "o1", weight: 1, effects: [{ k: "scrap", n: 1 }] },
    { text: "o2", weight: 9, effects: [{ k: "scrap", n: 2 }] },
  ];

  it("same seed selects the same outcome", () => {
    const a = selectOutcome(outcomes, createStream(7));
    const b = selectOutcome(outcomes, createStream(7));
    expect(a?.text).toBe(b?.text);
  });

  it("weights bias the distribution", () => {
    let heavy = 0;
    const stream = createStream(123);
    for (let i = 0; i < 400; i += 1) {
      if (selectOutcome(outcomes, stream)?.text === "o2") heavy += 1;
    }
    expect(heavy).toBeGreaterThan(280);
  });
});

describe("optionMet requirements", () => {
  const base: OptionContext = {
    scrap: 20,
    hull: 15,
    deck: [
      { school: "black", tier: 6 },
      { school: "red", tier: 8 },
      { school: "red", tier: 6 },
    ],
    mkLevels: { engines: 2 },
    flags: { maraFriend: true },
  };

  it("checks scrap / hull thresholds", () => {
    expect(optionMet({ req: "scrap", n: 25 }, base)).toBe(false);
    expect(optionMet({ req: "scrap", n: 20 }, base)).toBe(true);
    expect(optionMet({ req: "hull", n: 10 }, base)).toBe(true);
  });

  it("checks die school counts and tiers", () => {
    expect(optionMet({ req: "school", school: "red", n: 2 }, base)).toBe(true);
    expect(optionMet({ req: "school", school: "red", n: 3 }, base)).toBe(false);
    expect(optionMet({ req: "dieSchool", school: "black" }, base)).toBe(true);
    expect(optionMet({ req: "dieTier", tier: 8 }, base)).toBe(true);
    expect(optionMet({ req: "dieTier", tier: 10 }, base)).toBe(false);
  });

  it("checks Mk level and flags", () => {
    expect(optionMet({ req: "mk", slot: "engines", mk: 2 }, base)).toBe(true);
    expect(optionMet({ req: "mk", slot: "engines", mk: 3 }, base)).toBe(false);
    expect(optionMet({ req: "flag", key: "maraFriend" }, base)).toBe(true);
    expect(optionMet({ req: "flag", key: "nope" }, base)).toBe(false);
  });

  it("counts prismatic toward any school requirement", () => {
    const prism: OptionContext = {
      ...base,
      deck: [{ school: "prismatic", tier: 10 }],
    };
    expect(optionMet({ req: "school", school: "blue", n: 1 }, prism)).toBe(true);
    expect(optionMet({ req: "dieSchool", school: "green" }, prism)).toBe(true);
  });
});
