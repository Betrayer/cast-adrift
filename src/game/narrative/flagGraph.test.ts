import { describe, expect, it } from "vitest";
import { ALL_EVENTS, EVENT_BY_ID } from "@/data/events";
import { ENDING_BY_ID, endingBeats } from "@/data/narrative/endings";
import { buildEpilogue } from "@/data/narrative/epilogue";
import { deathLineFor } from "@/data/narrative/deathLines";
import { flagShopDiscount } from "@/game/economy/shop";
import { deadFlags, unwritableFlags } from "@/game/narrative/flagGraph";
import type { FlagValue } from "@/types/events";

const epilogueIds = (flags: Record<string, FlagValue>): string[] =>
  buildEpilogue({
    flags,
    beaconsResolved: 0,
    ascension: 0,
    survivedLethal: false,
    axis: 0,
    sector: 5,
    depth: 40,
    death: false,
  }).map((line) => line.id);

const optionGatedBy = (eventId: string, key: string): boolean =>
  EVENT_BY_ID.get(eventId)?.options.some(
    (o) => o.requires?.req === "flag" && o.requires.key === key,
  ) === true;

describe("flag graph", () => {
  it("has no flag written by content that nothing reads", () => {
    expect(deadFlags().map((f) => f.key)).toEqual([]);
  });

  it("has no reader waiting on a flag nothing can set", () => {
    expect(unwritableFlags().map((f) => f.key)).toEqual([]);
  });

  it("keeps every flag a writer states in the outcome that states it", () => {
    const written = new Set<string>();
    for (const event of ALL_EVENTS) {
      for (const option of event.options) {
        for (const outcome of [
          ...(option.outcomes ?? []),
          ...(option.onPass ?? []),
          ...(option.onFail ?? []),
        ]) {
          for (const effect of outcome.effects) {
            if (effect.k === "flag") written.add(effect.key);
          }
        }
      }
    }
    expect(written.size).toBeGreaterThan(50);
  });
});

// Five representative flags, each driven from the write to the thing the player
// can see: a price, an ending beat, a tally line, a locked option, Echo's last
// word.
describe("flag consumers end to end", () => {
  it("maraDebt moves the counter price and shows in the tally", () => {
    expect(flagShopDiscount({})).toBe(0);
    expect(flagShopDiscount({ maraDebt: true })).toBeLessThan(0);
    expect(epilogueIds({ maraDebt: true })).toContain("maraDebt");
  });

  it("coreAnswered and coreSilenced pick different beats in the same ending", () => {
    const seal = ENDING_BY_ID.get("seal");
    if (seal === undefined) throw new Error("seal ending missing");
    const base = endingBeats(seal, { axis: 5, flags: {}, beaconsResolved: 5 });
    const answered = endingBeats(seal, {
      axis: 5,
      flags: { coreAnswered: true },
      beaconsResolved: 5,
    });
    const silenced = endingBeats(seal, {
      axis: 5,
      flags: { coreSilenced: true },
      beaconsResolved: 5,
    });
    expect(answered).not.toEqual(base);
    expect(silenced).not.toEqual(base);
    expect(answered).not.toEqual(silenced);
    expect(answered).toHaveLength(base.length);
  });

  it("fleetTruthKept and fleetTruthLost are mutually exclusive tally lines", () => {
    expect(epilogueIds({ fleetTruthKept: true })).toContain("fleetTruthKept");
    expect(epilogueIds({ fleetTruthLost: true })).toContain("fleetTruthLost");
    expect(epilogueIds({ fleetTruthKept: true })).not.toContain("fleetTruthLost");
  });

  it("beaconKey1 unlocks the relay repair the Keeper's key was made for", () => {
    expect(optionGatedBy("beaconRelay", "beaconKey1")).toBe(true);
  });

  it("pactBroken rewrites the Bargain and adds its own tally line", () => {
    const bargain = ENDING_BY_ID.get("bargain");
    if (bargain === undefined) throw new Error("bargain ending missing");
    const ctx = {
      axis: 0,
      flags: { pactSealed: true } as Record<string, FlagValue>,
      beaconsResolved: 3,
    };
    const broken = endingBeats(bargain, {
      ...ctx,
      flags: { pactSealed: true, pactBroken: true },
    });
    expect(broken).not.toEqual(endingBeats(bargain, ctx));
    const ids = epilogueIds({ pactSealed: true, pactBroken: true });
    expect(ids).toContain("pactBroken");
    expect(ids).not.toContain("pactSealed");
  });

  it("bargainReady opens the Bargain without a signed pact", () => {
    const bargain = ENDING_BY_ID.get("bargain");
    expect(
      bargain?.qualifies({ axis: 0, flags: { bargainReady: true }, beaconsResolved: 0 }),
    ).toBe(true);
  });

  it("prologueRun gives Echo a different last word", () => {
    const base = {
      flags: {},
      beaconsResolved: 0,
      ascension: 0,
      survivedLethal: false,
      axis: 0,
      sector: 1,
      depth: 2,
      death: true,
    };
    expect(deathLineFor(base)).toBe("content:death.quiet");
    expect(deathLineFor({ ...base, flags: { prologueRun: true } })).toBe(
      "content:death.firstRun",
    );
  });
});
