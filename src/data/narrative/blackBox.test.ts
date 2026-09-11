import { describe, expect, it } from "vitest";
import {
  BLACK_BOX_EPITAPHS,
  CAUTIOUS_BYPASSES,
  epitaphFor,
  RESONANT_AXIS,
  VETERAN_RIDES,
  type BlackBoxContext,
} from "@/data/narrative/blackBox";

const HULL_MAX = 40;

const base: BlackBoxContext = {
  flags: {},
  beaconsResolved: 0,
  ascension: 0,
  survivedLethal: false,
  axis: 0,
  sector: 3,
  depth: 40,
  death: true,
  crossedThreshold: false,
  rides: 0,
  bypassed: 0,
  hull: HULL_MAX / 2,
  hullMax: HULL_MAX,
};

const ctx = (patch: Partial<BlackBoxContext>): BlackBoxContext => ({
  ...base,
  ...patch,
});

const CASES: readonly [string, Partial<BlackBoxContext>][] = [
  ["firstRun", { flags: { prologueRun: true } }],
  ["beyond", { sector: 6 }],
  ["veteran", { rides: VETERAN_RIDES }],
  ["pact", { flags: { pactSealed: true } }],
  ["cautious", { bypassed: CAUTIOUS_BYPASSES }],
  ["resonant", { axis: RESONANT_AXIS }],
  ["thin", { hull: HULL_MAX / 4 }],
  ["whole", { hull: HULL_MAX }],
  ["quiet", {}],
];

describe("black box epitaphs", () => {
  it("ships nine entries with unique ids and their own keys", () => {
    expect(BLACK_BOX_EPITAPHS).toHaveLength(9);
    const ids = BLACK_BOX_EPITAPHS.map((line) => line.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const line of BLACK_BOX_EPITAPHS) {
      expect(line.text).toBe(`content:blackbox.${line.id}`);
    }
  });

  it("covers every id with a case", () => {
    expect(CASES.map(([id]) => id)).toEqual(
      BLACK_BOX_EPITAPHS.map((line) => line.id),
    );
  });

  it.each(CASES)("selects %s", (id, patch) => {
    expect(epitaphFor(ctx(patch))).toBe(`content:blackbox.${id}`);
  });

  it("reads the Choir's grudge as well as its pact", () => {
    expect(epitaphFor(ctx({ flags: { choirEnemy: true } }))).toBe(
      "content:blackbox.pact",
    );
  });

  it("takes the first match when several apply", () => {
    expect(
      epitaphFor(
        ctx({
          flags: { prologueRun: true, pactSealed: true },
          sector: 6,
          rides: VETERAN_RIDES,
          hull: HULL_MAX,
        }),
      ),
    ).toBe("content:blackbox.firstRun");
    expect(
      epitaphFor(ctx({ sector: 6, rides: VETERAN_RIDES, hull: HULL_MAX })),
    ).toBe("content:blackbox.beyond");
  });

  it("keeps the fallback unconditional and last", () => {
    const last = BLACK_BOX_EPITAPHS[BLACK_BOX_EPITAPHS.length - 1];
    expect(last?.id).toBe("quiet");
    expect(last?.applies(base)).toBe(true);
  });

  it("never leaves the whole hull to the fallback", () => {
    expect(epitaphFor(ctx({ hull: HULL_MAX }))).toBe("content:blackbox.whole");
    expect(epitaphFor(ctx({ hull: HULL_MAX - 1 }))).toBe(
      "content:blackbox.quiet",
    );
  });

  it("holds the thin hull to a quarter", () => {
    expect(epitaphFor(ctx({ hull: HULL_MAX / 4 }))).toBe(
      "content:blackbox.thin",
    );
    expect(epitaphFor(ctx({ hull: HULL_MAX / 4 + 1 }))).toBe(
      "content:blackbox.quiet",
    );
  });
});
