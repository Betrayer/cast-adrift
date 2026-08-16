import { describe, expect, it } from "vitest";
import { ASCENSIONS, ascensionMods, maxSelectableAscension } from "@/data/ascension";
import { BEACON_FLAGS, beaconsResolved } from "@/data/events/beacons";
import {
  earnedEndings,
  endingBeats,
  ENDINGS,
  finaleOptions,
  STANDARD_ENDINGS,
  type EndingContext,
} from "@/data/narrative/endings";
import {
  buildEpilogue,
  DEATH_TALLY_LINES,
  EPILOGUE_ENTRIES,
} from "@/data/narrative/epilogue";
import { finalMemoryCodexId } from "@/data/narrative/memories";
import { CODEX_BY_ID } from "@/data/codex";
import type { FlagValue } from "@/types/events";

const ctx = (over: Partial<EndingContext> = {}): EndingContext => ({
  axis: 0,
  flags: {},
  beaconsResolved: 0,
  ...over,
});

const allBeacons = (): Record<string, FlagValue> =>
  Object.fromEntries(BEACON_FLAGS.map((k) => [k, true as FlagValue]));

describe("finale gating", () => {
  it("offers Seal on a stability-leaning axis", () => {
    const ids = earnedEndings(ctx({ axis: 4 })).map((e) => e.id);
    expect(ids).toContain("seal");
    expect(ids).not.toContain("merge");
  });

  it("offers Merge on a resonance-leaning axis", () => {
    const ids = earnedEndings(ctx({ axis: -5 })).map((e) => e.id);
    expect(ids).toContain("merge");
    expect(ids).not.toContain("seal");
  });

  it("offers Choir Bargain only with the sealed pact", () => {
    expect(earnedEndings(ctx()).map((e) => e.id)).not.toContain("bargain");
    expect(
      earnedEndings(ctx({ flags: { pactSealed: true } })).map((e) => e.id),
    ).toContain("bargain");
  });

  it("offers Silent Fleet only with all five beacons, the blessing and a mercy", () => {
    const nearly = ctx({
      flags: { ...allBeacons(), silentReady: true },
      beaconsResolved: 5,
    });
    expect(earnedEndings(nearly).map((e) => e.id)).not.toContain("silent");

    const full = ctx({
      flags: { ...allBeacons(), silentReady: true, crewSaved: true },
      beaconsResolved: 5,
    });
    expect(earnedEndings(full).map((e) => e.id)).toContain("silent");
  });

  it("all four endings are reachable from some state", () => {
    const reachable = new Set<string>();
    for (const state of [
      ctx({ axis: 5 }),
      ctx({ axis: -5 }),
      ctx({ flags: { pactSealed: true } }),
      ctx({
        flags: { ...allBeacons(), silentReady: true, courierFreed: true },
        beaconsResolved: 5,
      }),
      ctx({
        flags: allBeacons(),
        beaconsResolved: 5,
        crossedThreshold: true,
        echoArcComplete: true,
      }),
    ]) {
      for (const ending of earnedEndings(state)) reachable.add(ending.id);
    }
    expect(reachable.size).toBe(ENDINGS.length);
  });

  it("plays nine distinct beat sets across the four endings and the true one", () => {
    const sets = new Set<string>();
    for (const ending of ENDINGS) {
      for (const crossed of [false, true]) {
        if (ending.id === "answer" && !crossed) continue;
        const beats = endingBeats(
          ending,
          ctx({ crossedThreshold: crossed, beaconsResolved: 5 }),
        );
        expect(beats.length).toBeGreaterThan(0);
        sets.add(beats.join("|"));
      }
    }
    expect(sets.size).toBe(9);
  });

  it("gives every standard ending a deep set that replaces it, never appends", () => {
    for (const ending of STANDARD_ENDINGS) {
      const shallow = endingBeats(ending, ctx());
      const deep = endingBeats(ending, ctx({ crossedThreshold: true }));
      expect(deep).toHaveLength(shallow.length);
      expect(deep).not.toEqual(shallow);
    }
  });

  it("still applies flag variants inside a deep set", () => {
    const seal = ENDINGS.find((e) => e.id === "seal");
    expect(seal).toBeDefined();
    if (seal === undefined) return;
    const plain = endingBeats(seal, ctx({ crossedThreshold: true }));
    const varied = endingBeats(
      seal,
      ctx({ crossedThreshold: true, flags: { coreSilenced: true } }),
    );
    expect(varied).not.toEqual(plain);
    expect(varied[2]).toBe("content:ending.seal.var.silenced");
  });

  it("falls back to a Seal/Merge fork when nothing was earned", () => {
    const result = finaleOptions(ctx({ axis: 1 }));
    expect(result.thin).toBe(true);
    expect(result.options.map((e) => e.id)).toEqual(["seal", "merge"]);
    const negative = finaleOptions(ctx({ axis: -1 }));
    expect(negative.options.map((e) => e.id)).toEqual(["merge", "seal"]);
  });

  it("each ending has its own final Echo memory", () => {
    const ids = new Set(ENDINGS.map((e) => finalMemoryCodexId(e.id)));
    expect(ids.size).toBe(ENDINGS.length);
    for (const id of ids) expect(CODEX_BY_ID.has(id)).toBe(true);
  });
});

describe("beacon tally", () => {
  it("counts resolved beacon flags", () => {
    expect(beaconsResolved({})).toBe(0);
    expect(beaconsResolved({ beacon1: true, beacon4: true })).toBe(2);
    expect(beaconsResolved(allBeacons())).toBe(5);
  });
});

describe("epilogue tally", () => {
  it("maps at least twenty-four distinct deeds", () => {
    expect(EPILOGUE_ENTRIES.length).toBeGreaterThanOrEqual(24);
  });

  it("keeps the death-only entries out of a clear", () => {
    const lines = buildEpilogue({
      flags: {},
      beaconsResolved: 0,
      ascension: 0,
      survivedLethal: false,
      axis: 0,
      sector: 5,
      depth: 40,
      death: false,
    }).map((l) => l.id);
    expect(lines).not.toContain("deathDeep");
  });

  it("caps the death tally and leads with where the run ended", () => {
    const lines = buildEpilogue(
      {
        flags: { maraFriend: true, crewSaved: true, courierFreed: true },
        beaconsResolved: 2,
        ascension: 3,
        survivedLethal: true,
        axis: 0,
        sector: 4,
        depth: 31,
        death: true,
      },
      DEATH_TALLY_LINES,
    ).map((l) => l.id);
    expect(lines).toHaveLength(DEATH_TALLY_LINES);
    expect(lines[0]).toBe("deathDeep");
  });

  it("renders one line per earned deed and never conflicting Yusuf lines", () => {
    const lines = buildEpilogue({
      flags: {
        ...allBeacons(),
        maraFriend: true,
        yusufFriend: true,
        yusufGrudge: true,
        crewSaved: true,
        courierFreed: true,
        hunterEngaged: true,
        refusedChoir: true,
        pactSealed: true,
        choirEnemy: true,
      },
      beaconsResolved: 5,
      ascension: 2,
      survivedLethal: true,
      axis: 0,
      sector: 5,
      depth: 40,
      death: false,
    }).map((l) => l.id);
    expect(lines).toContain("yusufGrudge");
    expect(lines).not.toContain("yusufFriend");
    expect(lines).toContain("hunterCleared");
    expect(lines.length).toBeGreaterThanOrEqual(10);
  });

  it("falls back to a quiet line when nothing was earned", () => {
    const lines = buildEpilogue({
      flags: {},
      beaconsResolved: 0,
      ascension: 0,
      survivedLethal: false,
      axis: 0,
      sector: 1,
      depth: 0,
      death: false,
    });
    expect(lines).toHaveLength(1);
    expect(lines[0]?.id).toBe("quiet");
  });
});

describe("ascension A1–A10", () => {
  it("defines exactly ten levels", () => {
    expect(ASCENSIONS.map((a) => a.level)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
  });

  it("stacks every lower level's modifier", () => {
    expect(ascensionMods(0)).toEqual({
      enemyHpPct: 0,
      eliteShield: 0,
      shopPricePct: 0,
      tideCapDelta: 0,
      bossPhaseShift: false,
      eliteSubsystem: false,
      bossPatternInsert: false,
      hullPct: 0,
    });
    expect(ascensionMods(5)).toEqual({
      enemyHpPct: 10,
      eliteShield: 6,
      shopPricePct: 20,
      tideCapDelta: 1,
      bossPhaseShift: true,
      eliteSubsystem: false,
      bossPatternInsert: false,
      hullPct: 0,
    });
    expect(ascensionMods(2).shopPricePct).toBe(0);
    expect(ascensionMods(10)).toEqual({
      enemyHpPct: 10,
      eliteShield: 6,
      shopPricePct: 45,
      tideCapDelta: 2,
      bossPhaseShift: true,
      eliteSubsystem: true,
      bossPatternInsert: true,
      hullPct: -15,
    });
  });

  it("unlocks one level per clear, capped at A10", () => {
    expect(maxSelectableAscension(0)).toBe(0);
    expect(maxSelectableAscension(1)).toBe(1);
    expect(maxSelectableAscension(99)).toBe(10);
  });
});
