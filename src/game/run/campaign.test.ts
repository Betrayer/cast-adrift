import { beforeEach, describe, expect, it } from "vitest";
import { MINIBOSSES } from "@/data/enemies";
import { MEMORIES } from "@/data/narrative/memories";
import { SECTORS } from "@/data/sectors";
import { pickBoss, pickMiniboss } from "@/game/run/encounter";
import {
  advanceSector,
  startRun,
  tideCapFor,
  unlockNextMemory,
} from "@/game/run/flow";
import { bossFirstKillShards, campaignShards } from "@/game/xp";
import { createStream } from "@/services/rng";
import { useAppStore } from "@/stores/appStore";
import { createInitialMetaStats, useMetaStore } from "@/stores/metaStore";
import { useRunStore } from "@/stores/runStore";

const resetMeta = (): void => {
  useMetaStore.setState({
    shards: 0,
    xp: 0,
    level: 1,
    chartPicks: [],
    codex: [],
    codexRead: [],
    bossFirstKills: [],
    endings: [],
    ascension: { campaign: 0 },
    stats: createInitialMetaStats(),
  });
};

describe("campaign progression", () => {
  beforeEach(() => {
    resetMeta();
    useRunStore.getState().reset();
  });

  it("starts in sector 1 with the campaign mode and the chosen ascension", () => {
    startRun(1234, 3);
    const run = useRunStore.getState();
    expect(run.mode).toBe("campaign");
    expect(run.sector).toBe(1);
    expect(run.ascension).toBe(3);
    expect(run.map).not.toBeNull();
    expect(useAppStore.getState().screen).toBe("map");
  });

  it("advanceSector rebuilds the map, resets tide and shows the interstitial", () => {
    startRun(999, 0);
    useRunStore.setState({ tide: 3, jumpsSinceTide: 2, depthRow: 15 });
    const firstMap = useRunStore.getState().map;
    advanceSector();
    const run = useRunStore.getState();
    expect(run.sector).toBe(2);
    expect(run.tide).toBe(0);
    expect(run.jumpsSinceTide).toBe(0);
    expect(run.depthRow).toBe(0);
    expect(run.visited).toEqual([run.position]);
    expect(run.map).not.toBe(firstMap);
    expect(useAppStore.getState().screen).toBe("interstitial");
  });

  it("walks S1 → S5 and stops at the last sector", () => {
    startRun(4242, 0);
    for (let i = 0; i < 6; i += 1) advanceSector();
    expect(useRunStore.getState().sector).toBe(SECTORS.length);
  });

  it("A4 raises the tide cap by one", () => {
    expect(tideCapFor(0)).toBe(3);
    expect(tideCapFor(4)).toBe(4);
    expect(tideCapFor(5)).toBe(4);
  });
});

describe("mini-boss gate", () => {
  beforeEach(() => {
    resetMeta();
    useRunStore.getState().reset();
  });

  it("never repeats a mini-boss within a campaign", () => {
    const seen: string[] = [];
    for (let sector = 1; sector <= 5; sector += 1) {
      const id = pickMiniboss(sector, createStream(sector * 31), seen);
      expect(seen).not.toContain(id);
      seen.push(id);
    }
    expect(new Set(seen).size).toBe(5);
  });

  it("every sector pool draws from the roster of six", () => {
    const roster = new Set(MINIBOSSES.map((m) => m.id));
    for (const sector of SECTORS) {
      expect(sector.minibossPool.length).toBeGreaterThanOrEqual(3);
      for (const id of sector.minibossPool) expect(roster.has(id)).toBe(true);
    }
  });

  it("vouchers are granted once and spent once", () => {
    const run = useRunStore.getState();
    expect(run.vouchers).toBe(0);
    run.addVoucher(1);
    expect(useRunStore.getState().vouchers).toBe(1);
    expect(useRunStore.getState().spendVoucher()).toBe(true);
    expect(useRunStore.getState().vouchers).toBe(0);
    expect(useRunStore.getState().spendVoucher()).toBe(false);
  });

  it("marks a mini-boss used exactly once", () => {
    const run = useRunStore.getState();
    run.markMinibossUsed("mirrorHull");
    run.markMinibossUsed("mirrorHull");
    expect(useRunStore.getState().usedMinibosses).toEqual(["mirrorHull"]);
  });
});

describe("Echo memory arc", () => {
  beforeEach(() => {
    resetMeta();
    useRunStore.getState().reset();
  });

  it("unlocks the eleven gate fragments in order and then stops", () => {
    for (let i = 0; i < 15; i += 1) unlockNextMemory();
    const run = useRunStore.getState();
    expect(run.memoriesUnlocked).toBe(MEMORIES.length);
    const codex = useMetaStore.getState().codex;
    for (const memory of MEMORIES) expect(codex).toContain(memory.codexId);
  });
});

describe("campaign shard table", () => {
  it("pays per sector cleared, per DESIGN 12.3", () => {
    expect(campaignShards(1)).toBe(40);
    expect(campaignShards(2)).toBe(95);
    expect(campaignShards(5)).toBe(410);
  });

  it("pays a first-kill bonus once per boss per profile", () => {
    resetMeta();
    const meta = useMetaStore.getState();
    expect(meta.recordBossFirstKill(pickBoss(1, 7))).toBe(true);
    expect(useMetaStore.getState().recordBossFirstKill(pickBoss(1, 7))).toBe(
      false,
    );
    expect(bossFirstKillShards(1)).toBe(25);
    expect(bossFirstKillShards(5)).toBe(100);
  });
});
