import { describe, expect, it } from "vitest";
import { ALL_EVENTS, EVENT_BY_ID } from "@/data/events";
import { CHAIN_BY_ID, chainView } from "@/data/narrative/chains";
import {
  allOutcomes,
  eventEligible,
  optionMet,
  type OptionContext,
} from "@/game/events/engine";
import type { EventDef, EventOption, FlagValue, Outcome } from "@/types/events";

const flags = (...keys: string[]): Record<string, FlagValue> =>
  Object.fromEntries(keys.map((k) => [k, true as FlagValue]));

const event = (id: string): EventDef => {
  const def = EVENT_BY_ID.get(id);
  if (def === undefined) throw new Error(`missing event ${id}`);
  return def;
};

const option = (eventId: string, optionId: string): EventOption => {
  const found = event(eventId).options.find((o) => o.id === optionId);
  if (found === undefined) throw new Error(`missing option ${eventId}.${optionId}`);
  return found;
};

const withOutcome = (
  before: Record<string, FlagValue>,
  outcome: Outcome,
): Record<string, FlagValue> => {
  const after = { ...before };
  for (const effect of outcome.effects) {
    if (effect.k === "flag") after[effect.key] = effect.value ?? true;
  }
  for (const [key, value] of outcome.follow?.setFlags ?? []) after[key] = value;
  return after;
};

const eligibleIn = (
  id: string,
  sector: number,
  set: Record<string, FlagValue>,
): boolean => eventEligible(event(id), { sector, axis: 0, flags: set, seenEvents: [] });

const optionCtx = (set: Record<string, FlagValue>, scrap = 999): OptionContext => ({
  scrap,
  hull: 20,
  axis: 0,
  deck: [],
  mkLevels: {},
  flags: set,
});

const scrapCharge = (outcome: Outcome): number =>
  outcome.effects.reduce((sum, e) => (e.k === "scrap" && e.n < 0 ? sum - e.n : sum), 0);

describe("the Huntress's favour", () => {
  it("keeps a saved favour off Mara's ledger", () => {
    const mara = CHAIN_BY_ID.get("mara");
    if (mara === undefined) throw new Error("missing chain mara");
    const before = flags("maraFriend", "hunterEngaged", "hunterWarned");
    for (const outcome of allOutcomes(option("huntressFavor", "saveFavor"))) {
      expect(chainView(mara, withOutcome(before, outcome), 4).step).toBe(
        chainView(mara, before, 4).step,
      );
    }
  });

  it("lets the late favour be spent only when it was saved", () => {
    const lateFavor = option("lateBounty", "callFavor");
    const allied = flags("hunterEngaged", "hunterAllied");
    for (const outcome of allOutcomes(option("huntressFavor", "callFavor")))
      expect(optionMet(lateFavor.requires, optionCtx(withOutcome(allied, outcome)))).toBe(false);
    const warned = flags("hunterEngaged", "hunterWarned");
    for (const outcome of allOutcomes(option("huntressFavor", "saveFavor")))
      expect(optionMet(lateFavor.requires, optionCtx(withOutcome(warned, outcome)))).toBe(true);
  });

  it("stands her down at the Core once the contract is squared", () => {
    const ally = flags("hunterEngaged", "hunterPaid", "hunterAllied");
    expect(eligibleIn("huntressAtTheCore", 5, ally)).toBe(true);
    for (const opt of event("huntressFavor").options) {
      for (const outcome of allOutcomes(opt))
        expect(eligibleIn("huntressAtTheCore", 5, withOutcome(ally, outcome))).toBe(false);
    }
  });
});

describe("callbacks that assume an earlier choice", () => {
  it("keeps a netted courier from thanking you at the Core", () => {
    const freed = flags("courierFreed");
    expect(eligibleIn("courierAtTheCore", 5, freed)).toBe(true);
    for (const outcome of allOutcomes(option("courierNetwork", "netRing")))
      expect(eligibleIn("courierAtTheCore", 5, withOutcome(freed, outcome))).toBe(false);
  });

  it("brings the heretics back only to a captain who sided with them", () => {
    const doused = flags("refusedChoir", "pyreDoused");
    expect(eligibleIn("hereticsReturn", 4, doused)).toBe(false);
    for (const outcome of allOutcomes(option("heretics", "reportThem")))
      expect(eligibleIn("hereticsReturn", 4, withOutcome(doused, outcome))).toBe(false);
    const sided = [
      ...allOutcomes(option("heretics", "armThem")),
      ...(option("heretics", "escortThem").onPass ?? []),
    ];
    expect(sided.length).toBeGreaterThan(0);
    for (const outcome of sided)
      expect(eligibleIn("hereticsReturn", 4, withOutcome(flags("refusedChoir"), outcome))).toBe(true);
  });

  it("names a Sector-1 Yusuf cause only where Sector 1 is the only way in", () => {
    const sectorOneKeys = new Set([
      "content:consequence.yusufFriend",
      "content:consequence.yusufGrudge",
    ]);
    const offenders = ALL_EVENTS.flatMap((def) => {
      const sectors = def.requires?.sector ?? [];
      if (sectors.length === 1 && sectors[0] === 1) return [];
      return def.options.flatMap((opt) =>
        allOutcomes(opt)
          .filter((o) => o.consequence !== undefined && sectorOneKeys.has(o.consequence))
          .map(() => `${def.id}.${opt.id}`),
      );
    });
    expect(offenders).toEqual([]);
  });
});

describe("prices the text promises", () => {
  it("gates a paid read or trade on the most it can charge", () => {
    for (const [eventId, optionId] of [
      ["inheritedLedger", "readLedger"],
      ["collapsedStall", "tradeThroughHatch"],
    ] as const) {
      const opt = option(eventId, optionId);
      const charge = Math.max(...allOutcomes(opt).map(scrapCharge));
      expect(charge).toBeGreaterThan(0);
      expect(opt.requires).toEqual({ req: "scrap", n: charge });
      expect(optionMet(opt.requires, optionCtx({}, charge - 1))).toBe(false);
    }
  });

  it("charges nothing when Mara refuses the sale", () => {
    const refusal = allOutcomes(option("maraIndulgences", "friendPrice")).find(
      (o) => o.text === "content:events.maraIndulgences.out.friendPriceTip",
    );
    expect(refusal).toBeDefined();
    expect(refusal?.effects.some((e) => e.k === "scrap")).toBe(false);
  });
});
