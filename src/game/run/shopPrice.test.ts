import { describe, expect, it } from "vitest";
import { generateShopModules, generateShopStock } from "@/game/economy/shop";
import { shopPricePct, type ShopPriceInput } from "@/game/run/shopPrice";

const plain: ShopPriceInput = {
  perks: [],
  chartPicks: [],
  modules: [],
  flags: {},
  ascension: 0,
  contractId: null,
};

const marked = (par: number, markupPct: number): number =>
  Math.max(1, Math.round(par * (1 + markupPct / 100)));

describe("shopPricePct", () => {
  it("prices a plain A0 run at par", () => {
    expect(shopPricePct(plain)).toBe(0);
  });

  it("charges the ascension markups of A3 and A7", () => {
    expect(shopPricePct({ ...plain, ascension: 3 })).toBe(-20);
    expect(shopPricePct({ ...plain, ascension: 7 })).toBe(-45);
  });

  it("charges the markup a contract promises", () => {
    expect(shopPricePct({ ...plain, contractId: "tightVoyage" })).toBe(-50);
    expect(shopPricePct({ ...plain, contractId: "voidTithe" })).toBe(-75);
  });

  it("stacks a flag markup on the ascension markup", () => {
    expect(
      shopPricePct({ ...plain, ascension: 3, flags: { maraGrudge: true } }),
    ).toBe(-40);
  });
});

describe("a shelf under a markup", () => {
  it("raises every die on an A3 shelf by a fifth", () => {
    const par = generateShopStock(11, "n1", 0, shopPricePct(plain));
    const a3 = generateShopStock(11, "n1", 0, shopPricePct({ ...plain, ascension: 3 }));
    expect(a3.map((item) => item.price)).toEqual(
      par.map((item) => marked(item.price, 20)),
    );
  });

  it("raises a module by half on the tight-voyage contract", () => {
    const par = generateShopModules(11, "n1", 0, shopPricePct(plain));
    const tight = generateShopModules(
      11,
      "n1",
      0,
      shopPricePct({ ...plain, contractId: "tightVoyage" }),
    );
    expect(tight.map((item) => item.price)).toEqual(
      par.map((item) => marked(item.price, 50)),
    );
  });
});
