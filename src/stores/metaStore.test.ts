import { beforeEach, describe, expect, it } from "vitest";
import {
  createInitialMetaStats,
  migrateMeta,
  useMetaStore,
} from "@/stores/metaStore";
import { totalXpForLevel } from "@/game/xp";

const resetMeta = (): void => {
  useMetaStore.setState({
    shards: 0,
    xp: 0,
    level: 1,
    chartPicks: [],
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
