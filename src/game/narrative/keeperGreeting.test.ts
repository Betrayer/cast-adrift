import { describe, expect, it } from "vitest";
import { keeperLinesFor } from "@/data/narrative/keeperLines";
import { keeperGreeting } from "@/game/narrative/keeperGreeting";
import { createStream, deriveSeed } from "@/services/rng";

describe("keeperGreeting", () => {
  it("greets a beacon with one of the Keeper's beacon lines", () => {
    for (const seed of [1, 7, 42, 1234]) {
      for (const place of ["s1n4", "s3n9", "beaconKeeperIntro"]) {
        const line = keeperGreeting("beacon", seed, place, {});
        expect(line.venue).toBe("beacon");
        expect(line.speaker).toBe("beaconKeeper");
        expect(line.requires).toBeUndefined();
      }
    }
  });

  it("lets a lit lighthouse win over small talk", () => {
    expect(keeperGreeting("beacon", 7, "s4n2", { lighthouseLit: true }).id).toBe("kLit1");
  });

  it("keeps the shop's and the shipyard's greeting where they were", () => {
    expect(keeperGreeting("shop", 42, "s2n3", {})).toEqual(
      createStream(deriveSeed(42, "keeper:s2n3")).pick(keeperLinesFor("shop", {})),
    );
    expect(keeperGreeting("shipyard", 42, "yard", {})).toEqual(
      createStream(deriveSeed(42, "keeper:yard")).pick(keeperLinesFor("shipyard", {})),
    );
  });
});
