import { beforeEach, describe, expect, it } from "vitest";
import { DIE_BY_ID } from "@/data/dice";
import { dieGrantId, unlockedDice } from "@/data/unlocks";
import { dieShopPrice, unlockContextOf } from "@/game/meta/unlockState";
import {
  ENCOUNTER_DISCOUNT_PCT,
  FIRST_FIND_SHARDS,
  META_DIE_PRICE,
} from "@/data/metaShop";
import { captureRunSnapshot, restoreRunSnapshot } from "@/game/run/snapshot";
import { createInitialMetaStats, useMetaStore } from "@/stores/metaStore";
import { useRunStore } from "@/stores/runStore";

const resetMeta = (): void => {
  useMetaStore.setState({
    shards: 0,
    encountered: {},
    unlocksGranted: [],
    achievements: [],
    level: 1,
    ascension: { campaign: 0 },
    stats: createInitialMetaStats(),
  });
};

describe("run loot reaches the collection", () => {
  beforeEach(() => {
    resetMeta();
    useRunStore.getState().reset();
  });

  it("records where a die was met and pays the first find by rarity", () => {
    useRunStore.setState({
      sector: 3,
      map: {
        nodes: [{ id: "n1", type: "anomaly", row: 4, col: 1 }],
        edges: [],
      } as never,
      position: "n1",
    });
    useRunStore.getState().addDie("magma");
    const encounters = useRunStore.getState().encounters;
    expect(encounters).toEqual([
      { defId: "magma", sector: 3, node: "anomaly" },
    ]);

    const result = useMetaStore.getState().recordEncounters(encounters);
    expect(result.firstFinds).toEqual(["magma"]);
    const rarity = DIE_BY_ID.get("magma")?.rarity ?? "common";
    expect(result.shards).toBe(FIRST_FIND_SHARDS[rarity]);
    expect(useMetaStore.getState().shards).toBe(result.shards);
    expect(useMetaStore.getState().encountered.magma).toEqual({
      sector: 3,
      node: "anomaly",
    });
  });

  it("never pays the same first find twice", () => {
    const list = [{ defId: "magma", sector: 1, node: "battle" }];
    const first = useMetaStore.getState().recordEncounters(list);
    expect(first.shards).toBeGreaterThan(0);
    const second = useMetaStore.getState().recordEncounters(list);
    expect(second).toEqual({ firstFinds: [], shards: 0 });
    expect(useMetaStore.getState().shards).toBe(first.shards);
  });

  it("counts a die met twice in one run once", () => {
    useRunStore.setState({ sector: 2 });
    useRunStore.getState().addDie("aegis");
    useRunStore.getState().addDie("aegis");
    expect(useRunStore.getState().encounters).toHaveLength(1);
  });

  it("drops the shop price by 30% for good once met", () => {
    const base = META_DIE_PRICE.rare;
    expect(dieShopPrice("magma", {})).toBe(base);
    expect(dieShopPrice("magma", { magma: { sector: 1, node: "battle" } })).toBe(
      Math.round((base * (100 - ENCOUNTER_DISCOUNT_PCT)) / 100),
    );
  });

  it("survives a snapshot round-trip so a resume cannot double-pay", () => {
    useRunStore.setState({ active: true, sector: 4 });
    useRunStore.getState().addDie("eclipse");
    const snapshot = captureRunSnapshot();
    const paid = useMetaStore
      .getState()
      .recordEncounters(useRunStore.getState().encounters);
    expect(paid.shards).toBeGreaterThan(0);
    useRunStore.getState().reset();
    expect(restoreRunSnapshot(snapshot)).toBe(true);
    expect(useRunStore.getState().encounters).toHaveLength(1);
    const replay = useMetaStore
      .getState()
      .recordEncounters(useRunStore.getState().encounters);
    expect(replay.shards).toBe(0);
    expect(useMetaStore.getState().shards).toBe(paid.shards);
  });

  it("opens a boss or tier-5 drop for purchase through the grant source", () => {
    expect(unlockedDice(unlockContextOf(useMetaStore.getState())).has("voidmaw")).toBe(
      false,
    );
    useMetaStore.getState().grantUnlock(dieGrantId("voidmaw"));
    expect(unlockedDice(unlockContextOf(useMetaStore.getState())).has("voidmaw")).toBe(
      true,
    );
  });
});
