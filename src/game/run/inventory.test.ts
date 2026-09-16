import { beforeEach, describe, expect, it } from "vitest";
import { ALL_DICE } from "@/data/dice";
import { ALL_MODULES, MODULE_BY_ID } from "@/data/modules";
import { applyEventEffects } from "@/game/events/apply";
import {
  applyDiscount,
  DECK_CAP,
  diePrice,
  MAX_SHOP_DISCOUNT_PCT,
  moduleSellValue,
  ptsForDie,
  sellValue,
} from "@/game/economy/prices";
import {
  grantDie,
  grantModule,
  replaceDie,
  replaceModule,
  resolveSwapReplace,
  resolveSwapSell,
  sellModule,
  swapValue,
} from "@/game/run/inventory";
import { abandonRun, resolveModuleChoice, startRun } from "@/game/run/flow";
import { createStream } from "@/services/rng";
import { useRunStore } from "@/stores/runStore";

const FILLER = "green-d4";
const BETTER = "red-d6";

const fillDeck = (): void => {
  const run = useRunStore.getState();
  while (useRunStore.getState().deck.length < DECK_CAP) run.addDie(FILLER);
};

const fillBay = (ids: readonly string[]): void => {
  for (const id of ids) useRunStore.getState().addModule(id);
};

describe("inventory grants", () => {
  beforeEach(() => {
    abandonRun();
    startRun(7);
    useRunStore.setState({ deck: [], modules: [], scrap: 0, pendingSwaps: [] });
  });

  it("adds a die while the deck has room and queues a swap at the cap", () => {
    expect(grantDie(BETTER)).toBe("added");
    fillDeck();
    expect(useRunStore.getState().deck).toHaveLength(DECK_CAP);
    expect(grantDie(BETTER)).toBe("queued");
    expect(useRunStore.getState().deck).toHaveLength(DECK_CAP);
    expect(useRunStore.getState().scrap).toBe(0);
    expect(useRunStore.getState().pendingSwaps).toEqual([
      { kind: "die", defId: BETTER },
    ]);
  });

  it("adds a module while a bay is free and queues a swap when the bay is full", () => {
    expect(grantModule("heatsink")).toBe("added");
    expect(grantModule("blackLedger")).toBe("added");
    expect(useRunStore.getState().modules).toHaveLength(2);
    expect(grantModule("escapePod")).toBe("queued");
    expect(useRunStore.getState().modules).toHaveLength(2);
    expect(useRunStore.getState().scrap).toBe(0);
  });

  it("refuses a module the ship already carries without queueing anything", () => {
    grantModule("heatsink");
    expect(grantModule("heatsink")).toBe("owned");
    expect(useRunStore.getState().pendingSwaps).toEqual([]);
  });

  it("never converts a grant to scrap on its own", () => {
    fillDeck();
    fillBay(["heatsink", "blackLedger"]);
    const before = useRunStore.getState().scrap;
    grantDie(BETTER);
    grantModule("escapePod");
    expect(useRunStore.getState().scrap).toBe(before);
    expect(useRunStore.getState().pendingSwaps).toHaveLength(2);
  });
});

describe("swap resolution", () => {
  beforeEach(() => {
    abandonRun();
    startRun(7);
    useRunStore.setState({ deck: [], modules: [], scrap: 0, pendingSwaps: [] });
  });

  it("replaces a die and credits the outgoing die's honest value", () => {
    fillDeck();
    const outgoing = useRunStore.getState().deck[0];
    expect(outgoing).toBeDefined();
    grantDie(BETTER);
    resolveSwapReplace(outgoing?.uid ?? "");
    const after = useRunStore.getState();
    expect(after.deck).toHaveLength(DECK_CAP);
    expect(after.deck.some((d) => d.defId === BETTER)).toBe(true);
    expect(after.deck.some((d) => d.uid === outgoing?.uid)).toBe(false);
    expect(after.scrap).toBe(sellValue(ptsForDie(FILLER)));
    expect(after.pendingSwaps).toEqual([]);
  });

  it("replaces a module at half its shop price and installs the new one", () => {
    fillBay(["heatsink", "blackLedger"]);
    grantModule("escapePod");
    resolveSwapReplace("heatsink");
    const after = useRunStore.getState();
    expect(after.modules).toEqual(["blackLedger", "escapePod"]);
    expect(after.scrap).toBe(
      moduleSellValue(MODULE_BY_ID.get("heatsink")?.price ?? 0),
    );
    expect(after.pendingSwaps).toEqual([]);
  });

  it("sells the incoming item instead, at the same honest value", () => {
    fillDeck();
    grantDie(BETTER);
    const swap = useRunStore.getState().pendingSwaps[0];
    expect(swap).toBeDefined();
    resolveSwapSell();
    const after = useRunStore.getState();
    expect(after.scrap).toBe(sellValue(ptsForDie(BETTER)));
    expect(after.deck.every((d) => d.defId === FILLER)).toBe(true);
    expect(after.pendingSwaps).toEqual([]);
  });

  it("drains the queue in order", () => {
    fillDeck();
    fillBay(["heatsink", "blackLedger"]);
    grantDie(BETTER);
    grantModule("escapePod");
    expect(useRunStore.getState().pendingSwaps[0]?.kind).toBe("die");
    resolveSwapSell();
    expect(useRunStore.getState().pendingSwaps).toHaveLength(1);
    expect(useRunStore.getState().pendingSwaps[0]?.kind).toBe("module");
    resolveSwapSell();
    expect(useRunStore.getState().pendingSwaps).toEqual([]);
  });

  it("leaves the queue alone when the chosen outgoing item is gone", () => {
    fillDeck();
    grantDie(BETTER);
    resolveSwapReplace("not-a-uid");
    expect(useRunStore.getState().pendingSwaps).toHaveLength(1);
  });

  it("queues a module at most once, however many times it is granted", () => {
    fillBay(["heatsink", "blackLedger"]);
    expect(grantModule("escapePod")).toBe("queued");
    expect(grantModule("escapePod")).toBe("owned");
    expect(useRunStore.getState().pendingSwaps).toHaveLength(1);
  });

  it("drops a swap whose module got installed by an earlier answer", () => {
    fillBay(["heatsink", "blackLedger"]);
    useRunStore.setState({
      pendingSwaps: [
        { kind: "module", moduleId: "escapePod" },
        { kind: "module", moduleId: "escapePod" },
      ],
    });
    resolveSwapReplace("heatsink");
    expect(useRunStore.getState().modules).toEqual([
      "blackLedger",
      "escapePod",
    ]);
    expect(useRunStore.getState().pendingSwaps).toHaveLength(1);
    resolveSwapReplace("blackLedger");
    expect(useRunStore.getState().pendingSwaps).toEqual([]);
    expect(useRunStore.getState().modules).toEqual([
      "blackLedger",
      "escapePod",
    ]);
  });

  it("prices a queued swap the same way the card shows it", () => {
    fillBay(["heatsink", "blackLedger"]);
    grantModule("escapePod");
    const swap = useRunStore.getState().pendingSwaps[0];
    expect(swap).toBeDefined();
    if (swap === undefined) return;
    expect(swapValue(swap)).toBe(
      moduleSellValue(MODULE_BY_ID.get("escapePod")?.price ?? 0),
    );
  });
});

const JITTER = [-4, -3, -2, -1, 0, 1, 2, 3, 4];

describe("a sale can never outprice a purchase", () => {
  it("keeps every module dearer to buy than to sell, at any discount", () => {
    for (const def of ALL_MODULES) {
      for (const jitter of JITTER) {
        for (const pct of [0, MAX_SHOP_DISCOUNT_PCT, 200]) {
          expect(applyDiscount(def.price + jitter, pct)).toBeGreaterThan(
            moduleSellValue(def.price),
          );
        }
      }
    }
  });

  it("keeps every die dearer to buy than to sell, at any discount", () => {
    for (const die of ALL_DICE) {
      for (const jitter of JITTER) {
        for (const pct of [0, MAX_SHOP_DISCOUNT_PCT, 200]) {
          expect(applyDiscount(diePrice(die.pts, jitter), pct)).toBeGreaterThan(
            sellValue(die.pts),
          );
        }
      }
    }
  });
});

describe("selling and replacing outside a queue", () => {
  beforeEach(() => {
    abandonRun();
    startRun(7);
    useRunStore.setState({ deck: [], modules: [], scrap: 0, pendingSwaps: [] });
  });

  it("sells an installed module for half its price and frees the bay", () => {
    fillBay(["heatsink"]);
    expect(sellModule("heatsink")).toBe(true);
    expect(useRunStore.getState().modules).toEqual([]);
    expect(useRunStore.getState().scrap).toBe(
      moduleSellValue(MODULE_BY_ID.get("heatsink")?.price ?? 0),
    );
  });

  it("refuses to sell a module the ship does not carry", () => {
    expect(sellModule("heatsink")).toBe(false);
    expect(useRunStore.getState().scrap).toBe(0);
  });

  it("refuses a module replacement that would duplicate an installed module", () => {
    fillBay(["heatsink", "blackLedger"]);
    expect(replaceModule("heatsink", "blackLedger")).toBe(false);
    expect(useRunStore.getState().modules).toEqual(["heatsink", "blackLedger"]);
    expect(useRunStore.getState().scrap).toBe(0);
  });

  it("refuses a die replacement whose target uid is not in the deck", () => {
    fillDeck();
    expect(replaceDie("nope", BETTER)).toBe(false);
    expect(useRunStore.getState().deck).toHaveLength(DECK_CAP);
  });
});

describe("the old silent conversions are gone", () => {
  beforeEach(() => {
    abandonRun();
    startRun(7);
    useRunStore.setState({ deck: [], modules: [], scrap: 0, pendingSwaps: [] });
  });

  it("a gate-package module on a full bay opens a choice instead of paying full price", () => {
    fillBay(["heatsink", "blackLedger"]);
    useRunStore.getState().setPendingRewards({
      dieDrop: null,
      perkChoices: [],
      dieChoices: [],
      moduleChoices: ["escapePod"],
    });
    resolveModuleChoice("escapePod");
    const after = useRunStore.getState();
    expect(after.scrap).toBe(0);
    expect(after.pendingSwaps).toEqual([
      { kind: "module", moduleId: "escapePod" },
    ]);
  });

  it("an event loot effect at the deck cap opens a choice instead of auto-selling", () => {
    fillDeck();
    applyEventEffects([{ k: "loot", die: BETTER }], createStream(11));
    const after = useRunStore.getState();
    expect(after.scrap).toBe(0);
    expect(after.deck).toHaveLength(DECK_CAP);
    expect(after.pendingSwaps).toEqual([{ kind: "die", defId: BETTER }]);
  });
});
