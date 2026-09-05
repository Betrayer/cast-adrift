import { beforeEach, describe, expect, it } from "vitest";
import { MAX_MODULE_SLOTS } from "@/data/modules/types";
import { bayPrice, moduleSellValue } from "@/game/economy/prices";
import { bayPurchasable, moduleSlots } from "@/game/run/bays";
import { grantModule } from "@/game/run/inventory";
import { abandonRun, startRun } from "@/game/run/flow";
import {
  captureRunSnapshot,
  restoreRunSnapshot,
  RUN_SNAPSHOT_V,
} from "@/game/run/snapshot";
import { runModuleSlots, useRunStore } from "@/stores/runStore";

describe("bay prices", () => {
  it("walks 90 to 240 across the six sectors", () => {
    expect([1, 2, 3, 4, 5, 6].map(bayPrice)).toEqual([
      90, 120, 150, 180, 210, 240,
    ]);
  });

  it("halves a module's shop price, floored, never below one", () => {
    expect(moduleSellValue(90)).toBe(45);
    expect(moduleSellValue(45)).toBe(22);
    expect(moduleSellValue(1)).toBe(1);
    expect(moduleSellValue(0)).toBe(1);
  });
});

describe("the purchased bay", () => {
  beforeEach(() => {
    abandonRun();
    startRun(11);
    useRunStore.setState({ modules: [], scrap: 0, baysPurchased: 0 });
  });

  it("raises the run's cap by one and lets a third module in", () => {
    expect(useRunStore.getState().shipId).toBe("wanderer");
    expect(runModuleSlots(useRunStore.getState())).toBe(2);
    grantModule("heatsink");
    grantModule("blackLedger");
    expect(grantModule("escapePod")).toBe("queued");
    useRunStore.setState({ pendingSwaps: [] });
    useRunStore.getState().purchaseBay();
    expect(runModuleSlots(useRunStore.getState())).toBe(3);
    expect(grantModule("escapePod")).toBe("added");
    expect(useRunStore.getState().modules).toHaveLength(3);
  });

  it("is offered once per run and never past the ceiling", () => {
    expect(bayPurchasable("wanderer", 0, 0)).toBe(true);
    expect(bayPurchasable("wanderer", 0, 1)).toBe(false);
    expect(moduleSlots("ark", 1, 1)).toBe(MAX_MODULE_SLOTS);
    expect(bayPurchasable("ark", 1, 0)).toBe(false);
  });
});

describe("the run snapshot", () => {
  beforeEach(() => {
    abandonRun();
    startRun(13);
  });

  it("round-trips the bay purchase and the pending queue", () => {
    useRunStore.setState({
      baysPurchased: 1,
      pendingSwaps: [{ kind: "module", moduleId: "escapePod" }],
    });
    const snapshot = captureRunSnapshot();
    expect(snapshot.v).toBe(RUN_SNAPSHOT_V);
    abandonRun();
    expect(restoreRunSnapshot(snapshot)).toBe(true);
    const after = useRunStore.getState();
    expect(after.baysPurchased).toBe(1);
    expect(after.pendingSwaps).toEqual([
      { kind: "module", moduleId: "escapePod" },
    ]);
  });

  it("restores a v10 snapshot with the two new fields defaulted", () => {
    useRunStore.setState({ scrap: 77, baysPurchased: 1 });
    const current = captureRunSnapshot();
    const legacy = {
      ...current,
      v: 10,
      run: Object.fromEntries(
        Object.entries(current.run).filter(
          ([key]) => key !== "baysPurchased" && key !== "pendingSwaps",
        ),
      ),
    };
    abandonRun();
    expect(restoreRunSnapshot(legacy)).toBe(true);
    const after = useRunStore.getState();
    expect(after.baysPurchased).toBe(0);
    expect(after.pendingSwaps).toEqual([]);
    expect(after.scrap).toBe(77);
    expect(after.seed).toBe(current.run.seed);
    expect(after.deck.map((d) => d.defId)).toEqual(
      current.run.deck.map((d) => d.defId),
    );
  });

  it("still refuses a snapshot from a version the build never wrote", () => {
    const snapshot = captureRunSnapshot();
    expect(restoreRunSnapshot({ ...snapshot, v: 9 })).toBe(false);
  });
});
