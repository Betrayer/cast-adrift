import { describe, expect, it } from "vitest";
import { DIE_BY_ID } from "@/data/dice";
import { fusionTarget, FUSED_DICE } from "@/data/dice/fusion";
import { DIE_PTS } from "@/data/tiers";
import {
  applyDiscount,
  DECK_CAP,
  diePrice,
  diePriceBase,
  FUSION_COST,
  mkUpgradeCost,
  repairCost,
  sellValue,
} from "@/game/economy/prices";
import {
  computeNodeReward,
  DROP_WEIGHTS,
  rollDrop,
} from "@/game/economy/rewards";
import { generateShopStock } from "@/game/economy/shop";
import { createStream, deriveSeed } from "@/services/rng";
import { createInitialRunValues, useRunStore } from "@/stores/runStore";

describe("economy prices", () => {
  it("die price base is 35 + pts*12", () => {
    expect(diePriceBase(1)).toBe(47);
    expect(diePriceBase(3)).toBe(71);
    expect(diePriceBase(7)).toBe(119);
  });

  it("die price applies jitter and never drops below 1", () => {
    expect(diePrice(3, 4)).toBe(75);
    expect(diePrice(3, -4)).toBe(67);
    expect(diePrice(0, -100)).toBe(1);
  });

  it("sell value is pts*8", () => {
    expect(sellValue(1)).toBe(8);
    expect(sellValue(5)).toBe(40);
  });

  it("discount rounds and floors at 1", () => {
    expect(applyDiscount(100, 15)).toBe(85);
    expect(applyDiscount(100, 0)).toBe(100);
    expect(applyDiscount(1, 100)).toBe(1);
  });

  it("mk and repair costs match the design", () => {
    expect(mkUpgradeCost(2)).toBe(60);
    expect(mkUpgradeCost(3)).toBe(130);
    expect(repairCost(7)).toBe(14);
    expect(FUSION_COST).toBe(40);
  });
});

describe("loot drops", () => {
  it("always resolves to a real die of a valid rarity", () => {
    for (let seed = 1; seed <= 100; seed += 1) {
      const rng = createStream(seed);
      const id = rollDrop(rng, DROP_WEIGHTS.elite);
      expect(DIE_BY_ID.has(id)).toBe(true);
    }
  });

  it("battle scrap stays in 12-20, elite 45-60 with a guaranteed drop", () => {
    for (let seed = 1; seed <= 200; seed += 1) {
      const battle = computeNodeReward("battle", createStream(deriveSeed(seed, "b")));
      expect(battle.scrap).toBeGreaterThanOrEqual(12);
      expect(battle.scrap).toBeLessThanOrEqual(20);

      const elite = computeNodeReward("elite", createStream(deriveSeed(seed, "e")));
      expect(elite.scrap).toBeGreaterThanOrEqual(45);
      expect(elite.scrap).toBeLessThanOrEqual(60);
      expect(elite.dieDrop).not.toBeNull();
    }
  });

  it("boss drops a rare or legendary die", () => {
    for (let seed = 1; seed <= 50; seed += 1) {
      const boss = computeNodeReward("boss", createStream(seed));
      expect(boss.scrap).toBe(80);
      const def = boss.dieDrop === null ? undefined : DIE_BY_ID.get(boss.dieDrop);
      expect(def).toBeDefined();
      expect(["rare", "legendary"]).toContain(def?.rarity);
    }
  });
});

describe("shop stock", () => {
  it("produces three affordable-priced dice, discount applied", () => {
    const full = generateShopStock(7, "r3l1", 0, 0);
    const discounted = generateShopStock(7, "r3l1", 0, 15);
    expect(full).toHaveLength(3);
    full.forEach((item, i) => {
      const disc = discounted[i];
      expect(DIE_BY_ID.has(item.defId)).toBe(true);
      expect(item.price).toBeGreaterThan(0);
      expect(disc).toBeDefined();
      if (disc !== undefined) {
        expect(disc.price).toBeLessThanOrEqual(item.price);
      }
    });
  });
});

describe("fusion", () => {
  it("maps a base die to a fused die of the next tier with valid pts", () => {
    const target = fusionTarget("red-d6");
    expect(target).toBe("fused-emberforge");
    const def = target === undefined ? undefined : DIE_BY_ID.get(target);
    expect(def?.tier).toBe(8);
    for (const fused of FUSED_DICE) {
      expect(fused.pts).toBe(DIE_PTS[fused.tier]);
    }
  });

  it("removes both sources and adds the mapped def", () => {
    const run = useRunStore.getState();
    run.hydrate({
      ...createInitialRunValues(),
      active: true,
      deck: [
        { uid: "a", defId: "red-d6" },
        { uid: "b", defId: "red-d6" },
        { uid: "c", defId: "blue-d6" },
      ],
      deckSeq: 3,
      scrap: 100,
    });
    const target = fusionTarget("red-d6");
    if (target === undefined) throw new Error("no fusion target");
    const [first, second] = useRunStore
      .getState()
      .deck.filter((d) => d.defId === "red-d6");
    if (first === undefined || second === undefined) {
      throw new Error("missing sources");
    }
    useRunStore.getState().spendScrap(FUSION_COST);
    useRunStore.getState().removeDie(first.uid);
    useRunStore.getState().removeDie(second.uid);
    useRunStore.getState().addDie(target);
    const deck = useRunStore.getState().deck;
    expect(deck.filter((d) => d.defId === "red-d6")).toHaveLength(0);
    expect(deck.some((d) => d.defId === target)).toBe(true);
    expect(useRunStore.getState().scrap).toBe(60);
    run.reset();
  });
});

describe("run store guards", () => {
  it("cannot overspend scrap", () => {
    const run = useRunStore.getState();
    run.hydrate({ ...createInitialRunValues(), active: true, scrap: 30 });
    expect(useRunStore.getState().spendScrap(50)).toBe(false);
    expect(useRunStore.getState().scrap).toBe(30);
    expect(useRunStore.getState().spendScrap(20)).toBe(true);
    expect(useRunStore.getState().scrap).toBe(10);
    run.reset();
  });

  it("deck cap is nine", () => {
    expect(DECK_CAP).toBe(9);
  });
});
