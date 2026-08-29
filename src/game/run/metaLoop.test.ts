import { describe, expect, it } from "vitest";
import { CHART_NODE_BY_ID, chartNeighbors } from "@/data/chart";
import { chartNodeCost } from "@/game/chart/cost";
import {
  canAllocate,
  canDeallocate,
  pointsAvailable,
  respecCost,
  RESPEC_SHARD_COST,
} from "@/game/chart/engine";
import { hangarBudget } from "@/data/milestones";
import { validateDeck } from "@/game/meta/deck";
import {
  campaignShards,
  HALF_HULL_CLEAR_SHARDS,
  runXp,
  STREAK_SHARDS,
} from "@/game/xp";
import { endRun, startRun } from "@/game/run/flow";
import { createInitialMetaStats, useMetaStore } from "@/stores/metaStore";
import { createInitialRunStats, useRunStore } from "@/stores/runStore";
import { useSummaryStore } from "@/stores/summaryStore";

describe("meta loop (real flow/store/engine, end-to-end)", () => {
  it("run -> summary award -> chart alloc/respec -> hangar -> next run reflects picks", () => {
    useMetaStore.setState({
      shards: 0, xp: 0, level: 1, chartPicks: [],
      collection: [
        { defId: "red-d6", count: 4 },
        { defId: "blue-d6", count: 2 },
        { defId: "green-d4", count: 2 },
        { defId: "black-d6", count: 2 },
        { defId: "grey-d4", count: 2 },
      ],
      ships: ["wanderer"], selectedShip: "wanderer",
      hangar: { deck: ["red-d6", "red-d6", "blue-d6", "grey-d4", "green-d4"] },
      themes: ["deepSpace"], codex: [], codexRead: [], contracts: {},
      ascension: { campaign: 0 }, flagsArchive: [],
      bossFirstKills: [], endings: [],
      stats: createInitialMetaStats(),
    });

    const counts = { nodes: 60, elites: 12, minibosses: 5, bosses: 5, contractStars: 0 };
    useRunStore.setState({
      active: true,
      hull: 30,
      hullMax: 30,
      stats: {
        ...createInitialRunStats(),
        nodesCleared: 60,
        elites: 12,
        minibosses: 5,
        bosses: 5,
        kills: 40,
        scrapEarned: 300,
        scrapSpent: 120,
      },
      flags: { metCartographer: true },
    });
    endRun(true);
    const result = useSummaryStore.getState().result;
    const meta1 = useMetaStore.getState();
    expect(result).not.toBeNull();
    expect(result?.xpGain).toBe(runXp(counts));
    const expectedShards =
      campaignShards(5) + HALF_HULL_CLEAR_SHARDS + STREAK_SHARDS;
    expect(result?.shards.sectors).toBe(campaignShards(5));
    expect(result?.shards.hullClear).toBe(HALF_HULL_CLEAR_SHARDS);
    expect(result?.shards.streak).toBe(STREAK_SHARDS);
    expect(result?.shards.beacons).toBe(0);
    expect(result?.shards.ascension).toBe(0);
    expect(result?.shards.total).toBe(expectedShards);
    expect(result?.shardGain).toBe(
      expectedShards +
        (result?.findShards ?? 0) +
        (result?.achievementShards ?? 0),
    );
    expect(meta1.xp).toBe(runXp(counts));
    expect(meta1.shards).toBe(result?.shardGain);
    expect(result?.fromLevel).toBe(1);
    expect(result?.toLevel).toBeGreaterThan(1);
    expect(result?.milestones.length).toBeGreaterThan(0);
    expect(useRunStore.getState().active).toBe(false);
    expect(meta1.flagsArchive).toContain("metCartographer");

    const level = meta1.level;
    expect(pointsAvailable(level, meta1.chartPicks)).toBe(level);
    expect(canAllocate("red-gate", level, [])).toBe(true);
    useMetaStore.getState().allocatePick("red-gate");
    const neighbor = chartNeighbors("red-gate").find(
      (id) => CHART_NODE_BY_ID.get(id)?.constellation === "red",
    );
    expect(neighbor).toBeDefined();
    expect(canAllocate(neighbor as string, level, ["red-gate"])).toBe(true);
    useMetaStore.getState().allocatePick(neighbor as string);
    const picks2 = useMetaStore.getState().chartPicks;
    const cutVertexPick = "red-gate";
    const leafPick = neighbor as string;
    expect(picks2.length).toBe(2);
    expect(canDeallocate(cutVertexPick, picks2)).toBe(false);
    expect(canDeallocate(leafPick, picks2)).toBe(true);
    const before = useMetaStore.getState().shards;
    const price = respecCost(level, leafPick);
    expect(price).toBe(RESPEC_SHARD_COST * chartNodeCost(leafPick));
    expect(useMetaStore.getState().spendShards(price)).toBe(true);
    useMetaStore.getState().deallocatePick(neighbor as string);
    expect(useMetaStore.getState().shards).toBe(before - price);
    expect(useMetaStore.getState().chartPicks).not.toContain(neighbor);

    const budget = hangarBudget(useMetaStore.getState().level);
    const newDeck = ["red-d6", "blue-d6", "green-d4", "black-d6"];
    expect(validateDeck(newDeck, budget).valid).toBe(true);
    expect(validateDeck(["red-d6", "blue-d6"], budget).valid).toBe(false);
    useMetaStore.getState().setDeck(newDeck);
    useMetaStore.getState().addShards(2000);
    expect(useMetaStore.getState().buyShip("ram", 800)).toBe(true);
    expect(useMetaStore.getState().selectedShip).toBe("ram");

    startRun(12345);
    const run = useRunStore.getState();
    expect(run.shipId).toBe("ram");
    expect(run.hullMax).toBe(34);
    expect(run.deck.map((d) => d.defId)).toEqual(newDeck);
    expect(run.deckSeq).toBe(newDeck.length);
    expect(run.chartPicks).toContain("red-gate");
    expect(run.active).toBe(true);
    expect(run.map).not.toBeNull();

    useRunStore.getState().reset();
  });
});
