import { describe, expect, it } from "vitest";
import { namesItsSize, recapFileName, topDieOf, type RecapCard } from "@/game/run/recap";

describe("topDieOf", () => {
  it("takes the highest tier the deck holds, a forged tier included", () => {
    expect(topDieOf([{ defId: "red-d6" }, { defId: "lancehead" }, { defId: "grey-d4" }])).toEqual({
      defId: "lancehead",
      tier: 20,
      school: "red",
    });
    expect(topDieOf([{ defId: "red-d6" }, { defId: "red-d6", fusion: { level: 2, consumed: [] } }])?.tier).toBe(10);
  });

  it("keeps the first of equal tiers and has nothing to show for an empty deck", () => {
    expect(topDieOf([{ defId: "red-d6" }, { defId: "blue-d6" }])?.defId).toBe("red-d6");
    expect(topDieOf([])).toBeNull();
  });
});

describe("recapFileName", () => {
  it("names the ship, the result and the sector", () => {
    const card: RecapCard = {
      win: true, shipId: "wanderer", shipRank: 4, rankMax: 6, sector: 5, sectorMax: 5,
      nodes: 40, kills: 60, scrap: 900, ascension: 0, topDie: null,
    };
    expect(recapFileName(card)).toBe("cast-adrift-wanderer-clear-s5.png");
    expect(recapFileName({ ...card, win: false, sector: 3 })).toBe("cast-adrift-wanderer-run-s3.png");
  });
});

describe("namesItsSize", () => {
  it("spots a die whose name already says its size, in any case", () => {
    expect(namesItsSize("Red d6", 6)).toBe(true);
    expect(namesItsSize("Красный D6", 6)).toBe(true);
    expect(namesItsSize("Lancehead", 20)).toBe(false);
    expect(namesItsSize("Red d6", 8)).toBe(false);
  });
});
