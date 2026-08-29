import { beforeEach, describe, expect, it } from "vitest";
import {
  createInitialMetaStats,
  migrateMeta,
  useMetaStore,
} from "@/stores/metaStore";
import { pointsSpent, pointsTotal } from "@/game/chart/engine";
import { totalXpForLevel } from "@/game/xp";

const V14_KEYSTONE_LINE: readonly string[] = [
  "red-gate",
  "red-min1",
  "red-not1",
  "red-min2",
  "red-not2",
  "red-min3",
  "red-not3",
  "red-min4",
  "red-not4",
  "red-s19",
  "red-s22",
  "red-s23",
  "red-key1",
];

const resetMeta = (): void => {
  useMetaStore.setState({
    shards: 0,
    xp: 0,
    level: 1,
    chartPicks: [],
    chartFreeRespecs: 0,
    collection: [],
    ships: ["wanderer"],
    selectedShip: "wanderer",
    hangar: { deck: [] },
    themes: ["deepSpace"],
    codex: [],
    codexRead: [],
    contracts: {},
    ascension: { campaign: 0 },
    flagsArchive: [],
    stats: createInitialMetaStats(),
  });
};

describe("metaStore migration", () => {
  it("seeds the starter collection + hangar from empty persisted state", () => {
    const values = migrateMeta({}, 1);
    expect(values.level).toBe(1);
    expect(values.selectedShip).toBe("wanderer");
    expect(values.hangar.deck.length).toBe(5);
    const redCount =
      values.collection.find((e) => e.defId === "red-d6")?.count ?? 0;
    expect(redCount).toBe(2);
    expect(values.collection.some((e) => e.defId === "yellow-d6")).toBe(true);
  });

  it("preserves codex from a v2 blob and recomputes level from xp", () => {
    const values = migrateMeta({ codex: ["a", "b"], xp: totalXpForLevel(4) }, 2);
    expect(values.codex).toEqual(["a", "b"]);
    expect(values.level).toBe(4);
  });

  it("re-prices a v14 allocation, confiscates nothing, and banks one respec", () => {
    const values = migrateMeta(
      { xp: totalXpForLevel(13), chartPicks: [...V14_KEYSTONE_LINE] },
      14,
    );
    expect(values.level).toBe(13);
    expect(values.chartPicks).toEqual([...V14_KEYSTONE_LINE]);
    expect(pointsSpent(values.chartPicks)).toBe(39);
    expect(pointsTotal(values.level)).toBe(13);
    expect(values.chartFreeRespecs).toBe(1);
  });

  it("leaves a v14 allocation that still fits alone", () => {
    const picks = ["red-gate", "red-s1", "red-s3"];
    const values = migrateMeta(
      { xp: totalXpForLevel(13), chartPicks: picks },
      14,
    );
    expect(pointsSpent(values.chartPicks)).toBe(4);
    expect(values.chartFreeRespecs).toBe(0);
  });

  it("banks a respec when a v15 allocation lost its door to the hub", () => {
    const values = migrateMeta(
      {
        xp: totalXpForLevel(40),
        chartPicks: ["hub-i7", "hub-o9"],
      },
      15,
    );
    expect(values.chartPicks).toEqual(["hub-i7", "hub-o9"]);
    expect(pointsSpent(values.chartPicks)).toBeLessThan(pointsTotal(40));
    expect(values.chartFreeRespecs).toBe(1);
  });

  it("never hands out a second free respec on a later migration", () => {
    const values = migrateMeta(
      {
        xp: totalXpForLevel(13),
        chartPicks: [...V14_KEYSTONE_LINE],
        chartFreeRespecs: 1,
      },
      16,
    );
    expect(values.chartFreeRespecs).toBe(1);
  });
});

describe("free full respec", () => {
  beforeEach(resetMeta);

  it("clears every pick once, and only once", () => {
    useMetaStore.setState({
      chartPicks: [...V14_KEYSTONE_LINE],
      chartFreeRespecs: 1,
    });
    expect(useMetaStore.getState().fullRespec()).toBe(true);
    expect(useMetaStore.getState().chartPicks).toEqual([]);
    expect(useMetaStore.getState().chartFreeRespecs).toBe(0);
    expect(useMetaStore.getState().fullRespec()).toBe(false);
  });
});

describe("metaStore accumulation", () => {
  beforeEach(resetMeta);

  it("two runs accumulate xp and shards", () => {
    const meta = useMetaStore.getState();
    meta.awardRun(100, 40, true);
    meta.awardRun(100, 40, false);
    const s = useMetaStore.getState();
    expect(s.xp).toBe(200);
    expect(s.shards).toBe(80);
    expect(s.stats.runs).toBe(2);
    expect(s.stats.wins).toBe(1);
  });

  it("awardRun reports the level transition", () => {
    const award = useMetaStore.getState().awardRun(totalXpForLevel(5), 0, true);
    expect(award.fromLevel).toBe(1);
    expect(award.toLevel).toBe(5);
  });

  it("spendShards guards against overspend", () => {
    useMetaStore.getState().addShards(50);
    expect(useMetaStore.getState().spendShards(60)).toBe(false);
    expect(useMetaStore.getState().spendShards(30)).toBe(true);
    expect(useMetaStore.getState().shards).toBe(20);
  });

  it("buyShip unlocks and selects, respecting shard cost", () => {
    useMetaStore.getState().addShards(800);
    expect(useMetaStore.getState().buyShip("ram", 800)).toBe(true);
    expect(useMetaStore.getState().ships).toContain("ram");
    expect(useMetaStore.getState().selectedShip).toBe("ram");
    expect(useMetaStore.getState().buyShip("ark", 1500)).toBe(false);
  });
});
