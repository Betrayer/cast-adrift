import { beforeEach, describe, expect, it } from "vitest";
import { CONTRACT_BY_ID } from "@/data/contracts";
import {
  advanceSector,
  startContractRun,
  startDailyRun,
  startDriftRun,
  tideCapFor,
} from "@/game/run/flow";
import { BOSS_ROW } from "@/game/map/types";
import { claimDailyAttempt } from "@/game/run/boards";
import {
  contentSector,
  dailyMutators,
  dailySeed,
  depthFor,
  driftLoop,
  DRIFT_TIDE_CAP,
} from "@/game/run/modes";
import { START_NODE_ID } from "@/game/map/generator";
import {
  actionLogState,
  recordAction,
  resetActionLog,
  syncActionStats,
} from "@/game/run/actionLog";
import { captureRunSnapshot, restoreRunSnapshot } from "@/game/run/snapshot";
import { createInitialMetaStats, useMetaStore } from "@/stores/metaStore";
import { useRunStore } from "@/stores/runStore";

const DATE = "2026-07-27";

const resetProfile = (): void => {
  useMetaStore.setState({
    level: 1,
    xp: 0,
    shards: 0,
    chartPicks: [],
    contracts: {},
    dailyPlayed: {},
    best: {
      drift: 0,
      driftWeek: null,
      driftWeekly: 0,
      dailyRank: null,
      dailyDate: null,
    },
    ships: ["wanderer"],
    selectedShip: "wanderer",
    hangar: { deck: ["red-d6", "red-d6", "blue-d6", "grey-d4", "green-d4"] },
    stats: createInitialMetaStats(),
  });
};

beforeEach(() => {
  resetProfile();
  useRunStore.getState().reset();
});

describe("drift mode", () => {
  it("opens an endless run with no boss node — row 15 is a gate", () => {
    startDriftRun(4242);
    const run = useRunStore.getState();
    expect(run.mode).toBe("drift");
    expect(run.active).toBe(true);
    expect(run.sectorIndex).toBe(1);
    expect(run.sector).toBe(1);
    const nodes = run.map?.nodes ?? [];
    expect(nodes.some((n) => n.type === "boss")).toBe(false);
    const last = nodes.filter((n) => n.row === BOSS_ROW);
    expect(last.length).toBeGreaterThan(0);
    for (const node of last) expect(node.type).toBe("miniboss");
  });

  it("raises the tide cap to five", () => {
    expect(tideCapFor(0, "drift")).toBe(DRIFT_TIDE_CAP);
  });

  it("crosses into sector 2 in the same run, without a fresh start", () => {
    startDriftRun(4242);
    const before = useRunStore.getState();
    const firstMap = before.map;
    advanceSector();
    const after = useRunStore.getState();
    expect(after.active).toBe(true);
    expect(after.sectorIndex).toBe(2);
    expect(after.sector).toBe(2);
    expect(after.seed).toBe(before.seed);
    expect(after.position).toBe(START_NODE_ID);
    expect(after.depthRow).toBe(0);
    expect(after.tide).toBe(0);
    expect(after.map).not.toEqual(firstMap);
    expect(after.stats.depth).toBe(depthFor(2, 0));
    expect(after.map?.nodes.some((n) => n.type === "boss")).toBe(false);
  });

  it("keeps counting sectors past five while the content sector stays clamped", () => {
    startDriftRun(99);
    useRunStore.setState({ sectorIndex: 5, sector: 5 });
    advanceSector();
    const run = useRunStore.getState();
    expect(run.sectorIndex).toBe(6);
    expect(run.sector).toBe(contentSector(6));
    expect(run.sector).toBe(5);
    expect(driftLoop(run.sectorIndex)).toBe(1);
  });

  it("reproduces the same first map from the same seed", () => {
    startDriftRun(777);
    const first = useRunStore.getState().map;
    useRunStore.getState().reset();
    startDriftRun(777);
    expect(useRunStore.getState().map).toEqual(first);
  });
});

describe("campaign mode is untouched", () => {
  it("still ends its sector on a boss node", () => {
    startContractRun("storm");
    expect(useRunStore.getState().map?.nodes.some((n) => n.type === "boss")).toBe(
      true,
    );
  });
});

describe("daily mode", () => {
  it("uses the shared UTC seed and the day's two mutators", () => {
    startDailyRun(DATE);
    const run = useRunStore.getState();
    expect(run.mode).toBe("daily");
    expect(run.seed).toBe(dailySeed(DATE));
    expect(run.dailyDate).toBe(DATE);
    expect(run.mutators).toEqual(dailyMutators(DATE));
    expect(run.mutators).toHaveLength(2);
  });

  it("reproduces an identical map for the same day", () => {
    startDailyRun(DATE);
    const first = useRunStore.getState().map;
    useRunStore.getState().reset();
    startDailyRun(DATE);
    expect(useRunStore.getState().map).toEqual(first);
  });

  it("gives a different day a different map", () => {
    startDailyRun(DATE);
    const first = useRunStore.getState().map;
    useRunStore.getState().reset();
    startDailyRun("2026-07-28");
    expect(useRunStore.getState().map).not.toEqual(first);
  });

  it("spends the attempt on the first claim and refuses the second", async () => {
    expect(useMetaStore.getState().dailyPlayed[DATE]).toBeUndefined();
    useMetaStore.getState().markDailyStarted(DATE);
    expect(useMetaStore.getState().dailyPlayed[DATE]?.state).toBe("started");
    await expect(claimDailyAttempt(DATE)).resolves.toBe(false);
  });

  it("records a finished daily with its place", () => {
    useMetaStore.getState().markDailyStarted(DATE);
    useMetaStore.getState().recordDaily(DATE, 1830, 4);
    const meta = useMetaStore.getState();
    expect(meta.dailyPlayed[DATE]).toEqual({
      state: "done",
      score: 1830,
      rank: 4,
    });
    expect(meta.best.dailyRank).toBe(4);
    expect(meta.best.dailyDate).toBe(DATE);
  });

  it("keeps the better daily place across days", () => {
    useMetaStore.getState().recordDaily(DATE, 100, 12);
    useMetaStore.getState().recordDaily("2026-07-28", 900, 30);
    expect(useMetaStore.getState().best.dailyRank).toBe(12);
    useMetaStore.getState().recordDaily("2026-07-29", 9000, 2);
    expect(useMetaStore.getState().best.dailyRank).toBe(2);
  });
});

describe("contract setups", () => {
  it("forces the authored deck preset over the hangar deck", () => {
    startContractRun("redHeat");
    const run = useRunStore.getState();
    const preset = CONTRACT_BY_ID.get("redHeat")?.setup.deckPreset ?? [];
    expect(run.mode).toBe("contract");
    expect(run.contractId).toBe("redHeat");
    expect(run.deck.map((d) => d.defId)).toEqual([...preset]);
  });

  it("forces the authored ship", () => {
    startContractRun("batteringRam");
    expect(useRunStore.getState().shipId).toBe("ram");
    startContractRun("ark");
    expect(useRunStore.getState().shipId).toBe("ark");
  });

  it("strips chart picks when the contract disables the chart", () => {
    useMetaStore.setState({ chartPicks: ["hub-core"] });
    startContractRun("singleCast");
    expect(useRunStore.getState().chartPicks).toEqual([]);
    startContractRun("storm");
    expect(useRunStore.getState().chartPicks).toEqual(["hub-core"]);
  });

  it("starts «Шторм» with the tide already up", () => {
    startContractRun("storm");
    expect(useRunStore.getState().tide).toBe(2);
  });

  it("launches «Тень Хора» into the sector-4 pool with its mutator", () => {
    startContractRun("choirShadow");
    const run = useRunStore.getState();
    expect(run.sector).toBe(4);
    expect(run.sectorIndex).toBe(4);
    expect(run.mutators).toEqual(["resonantStorm"]);
  });

  it("carries «Слепой прыжок»'s fog", () => {
    startContractRun("blindJump");
    expect(useRunStore.getState().mutators).toEqual(["fog"]);
  });
});

describe("contract stars", () => {
  it("accumulates bits and counts only the new ones", () => {
    const meta = useMetaStore.getState();
    expect(meta.recordContractStars("redHeat", 0b001)).toBe(1);
    expect(useMetaStore.getState().contracts.redHeat).toBe(0b001);
    expect(useMetaStore.getState().recordContractStars("redHeat", 0b011)).toBe(1);
    expect(useMetaStore.getState().contracts.redHeat).toBe(0b011);
  });

  it("grants nothing on a replay of an already-earned mask", () => {
    useMetaStore.getState().recordContractStars("iceWall", 0b111);
    expect(useMetaStore.getState().recordContractStars("iceWall", 0b111)).toBe(0);
    expect(useMetaStore.getState().recordContractStars("iceWall", 0b010)).toBe(0);
    expect(useMetaStore.getState().contracts.iceWall).toBe(0b111);
  });
});

describe("save round-trip", () => {
  it("restores a drift run's mode, sector index and depth", () => {
    startDriftRun(31337);
    useRunStore.setState({ sectorIndex: 3, sector: 3, depthRow: 9 });
    useRunStore.getState().noteDepth(depthFor(3, 9));
    const snapshot = captureRunSnapshot();

    useRunStore.getState().reset();
    expect(useRunStore.getState().mode).toBe("campaign");

    expect(restoreRunSnapshot(snapshot)).toBe(true);
    const run = useRunStore.getState();
    expect(run.mode).toBe("drift");
    expect(run.sectorIndex).toBe(3);
    expect(run.sector).toBe(3);
    expect(run.stats.depth).toBe(depthFor(3, 9));
  });

  it("restores a contract run's id and mutators", () => {
    startContractRun("choirShadow");
    const snapshot = captureRunSnapshot();
    useRunStore.getState().reset();

    expect(restoreRunSnapshot(snapshot)).toBe(true);
    const run = useRunStore.getState();
    expect(run.mode).toBe("contract");
    expect(run.contractId).toBe("choirShadow");
    expect(run.mutators).toEqual(["resonantStorm"]);
    expect(run.sector).toBe(4);
  });

  it("restores a daily run's date and the action hash behind it", () => {
    startDailyRun(DATE);
    recordAction("place:red-d6:4:weaponA");
    recordAction("jump:r1l2");
    syncActionStats();
    const expected = actionLogState();
    const snapshot = captureRunSnapshot();

    useRunStore.getState().reset();
    resetActionLog();

    expect(restoreRunSnapshot(snapshot)).toBe(true);
    expect(useRunStore.getState().mode).toBe("daily");
    expect(useRunStore.getState().dailyDate).toBe(DATE);
    expect(actionLogState()).toEqual(expected);
  });
});

describe("«Глушь» — no markets", () => {
  it("generates a sector with no shop nodes but keeps the shipyards", () => {
    startDriftRun(5);
    expect(useRunStore.getState().map?.nodes.some((n) => n.type === "shop")).toBe(
      true,
    );
    useRunStore.setState({ mutators: ["wilds"] });
    advanceSector();
    const nodes = useRunStore.getState().map?.nodes ?? [];
    expect(nodes.some((n) => n.type === "shop")).toBe(false);
    expect(nodes.some((n) => n.type === "shipyard")).toBe(true);
    expect(nodes.some((n) => n.type === "elite")).toBe(true);
  });
});
