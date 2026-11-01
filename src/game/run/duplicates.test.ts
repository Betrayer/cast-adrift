import { describe, expect, it } from "vitest";
import { LOOT_DICE } from "@/data/dice";
import { DROP_WEIGHTS, rollDrop } from "@/game/economy/rewards";
import { generateShopStock } from "@/game/economy/shop";
import { ownedCount } from "@/game/run/inventory";
import { createStream } from "@/services/rng";

describe("duplicates", () => {
  const hand = LOOT_DICE.map((def) => ({ defId: def.id }));

  it("counts how many copies of a die the hand already holds", () => {
    expect(ownedCount([{ defId: "ember" }, { defId: "ember" }, { defId: "slug" }], "ember")).toBe(2);
    expect(ownedCount([{ defId: "slug" }], "ember")).toBe(0);
  });

  it("still offers loot when the hand already holds every die in the pool", () => {
    const rng = createStream(9);
    const offered = Array.from({ length: 40 }, () => rollDrop(rng, DROP_WEIGHTS.battle));
    expect(offered.every((defId) => ownedCount(hand, defId) > 0)).toBe(true);
    expect(new Set(offered).size).toBeGreaterThan(1);
  });

  it("stocks the shop with dice the hand already holds, and can repeat one", () => {
    const repeats = Array.from({ length: 30 }, (_, seed) =>
      generateShopStock(seed, "n1", 0, 0).map((item) => item.defId),
    );
    expect(repeats.flat().every((defId) => ownedCount(hand, defId) > 0)).toBe(true);
    expect(repeats.some((stock) => new Set(stock).size < stock.length)).toBe(true);
  });
});
