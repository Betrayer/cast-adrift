import { beforeEach, describe, expect, it } from "vitest";
import { SECTOR_COUNT, SECTORS } from "@/data/sectors";
import { earnedEndings, ENDINGS } from "@/data/narrative/endings";
import { FINAL_MEMORY_BY_ENDING, NUMBERED_MEMORIES } from "@/data/narrative/memories";
import { echoArcComplete } from "@/game/narrative/memoryArc";
import {
  abandonRun,
  advanceSector,
  canCrossThreshold,
  chooseEnding,
  crossThreshold,
  startRun,
  startRunMode,
} from "@/game/run/flow";
import { resumeLocalRun } from "@/game/run/resume";
import { captureRunSnapshot, restoreRunSnapshot } from "@/game/run/snapshot";
import { useAppStore } from "@/stores/appStore";
import { useMetaStore } from "@/stores/metaStore";
import { useRunStore } from "@/stores/runStore";
import { shardBreakdown, SECTOR_SIX_CLEAR_SHARDS } from "@/game/xp";

const atFinale = (): void => {
  startRun(4242, 0);
  for (let i = 0; i < SECTOR_COUNT; i += 1) advanceSector();
};

const eligible = (): void => {
  useMetaStore.setState((s) => ({
    stats: { ...s.stats, campaignClears: 1 },
  }));
};

const ineligible = (): void => {
  useMetaStore.setState((s) => ({
    stats: { ...s.stats, campaignClears: 0 },
  }));
};

describe("the threshold", () => {
  beforeEach(() => {
    abandonRun();
    ineligible();
    useAppStore.setState({ screen: "menu" });
  });

  it("is invisible until the profile has cleared the campaign once", () => {
    atFinale();
    expect(canCrossThreshold()).toBe(false);
    eligible();
    expect(canCrossThreshold()).toBe(true);
  });

  it("is never offered before the fifth act, or twice", () => {
    eligible();
    startRun(4242, 0);
    expect(canCrossThreshold()).toBe(false);
    for (let i = 0; i < SECTOR_COUNT; i += 1) advanceSector();
    expect(canCrossThreshold()).toBe(true);
    crossThreshold();
    expect(canCrossThreshold()).toBe(false);
  });

  it("is never offered outside the campaign", () => {
    eligible();
    for (const mode of ["drift", "daily", "contract"] as const) {
      startRunMode({ mode, seed: 7, ...(mode === "contract" ? { contractId: "bareHull" } : {}) });
      for (let i = 0; i < SECTOR_COUNT; i += 1) advanceSector();
      expect(canCrossThreshold()).toBe(false);
    }
  });

  it("routes into sector 6 through the ordinary advanceSector path", () => {
    eligible();
    atFinale();
    crossThreshold();
    const run = useRunStore.getState();
    expect(run.crossedThreshold).toBe(true);
    expect(run.flags.crossedThreshold).toBe(true);
    expect(run.sector).toBe(SECTORS.length);
    expect(run.sectorIndex).toBe(SECTORS.length);
    expect(run.tide).toBe(0);
    expect(run.map?.shape.bossRow).toBe(16);
    expect(useAppStore.getState().screen).toBe("interstitial");
  });

  it("leaves the ordinary ending route untouched", () => {
    eligible();
    atFinale();
    chooseEnding("seal");
    expect(useRunStore.getState().crossedThreshold).toBe(false);
    expect(useRunStore.getState().endingId).toBe("seal");
    expect(useAppStore.getState().screen).toBe("ending");
  });

  it("survives a save/resume at the fork, mid-S6 and pre-boss", () => {
    eligible();
    atFinale();
    // 1 — at the fork, before the decision.
    let snap = captureRunSnapshot();
    useRunStore.getState().reset();
    expect(restoreRunSnapshot(snap)).toBe(true);
    expect(useRunStore.getState().crossedThreshold).toBe(false);
    expect(canCrossThreshold()).toBe(true);

    // 2 — mid-S6, right after crossing.
    crossThreshold();
    snap = captureRunSnapshot();
    useRunStore.getState().reset();
    expect(restoreRunSnapshot(snap)).toBe(true);
    expect(useRunStore.getState().crossedThreshold).toBe(true);
    expect(useRunStore.getState().sector).toBe(SECTORS.length);

    // 3 — parked on the boss row, through the real local-storage path.
    const map = useRunStore.getState().map;
    const boss = map?.nodes.find((n) => n.type === "boss");
    expect(boss).toBeDefined();
    useRunStore.setState({ position: boss?.id ?? null, depthRow: boss?.row ?? 0 });
    useAppStore.setState({ screen: "finale" });
    captureRunSnapshot();
    useRunStore.getState().reset();
    expect(resumeLocalRun()).toBe(true);
    expect(useRunStore.getState().crossedThreshold).toBe(true);
    expect(useRunStore.getState().sector).toBe(SECTORS.length);
  });

  it("pays the deep clear as its own shard band", () => {
    const shallow = shardBreakdown({
      win: true,
      sectorsCleared: 5,
      beacons: 5,
      hullPct: 80,
      firstEnding: false,
      streak: 0,
      ascension: 0,
      deepClear: false,
    });
    const deep = shardBreakdown({
      win: true,
      sectorsCleared: 5,
      beacons: 5,
      hullPct: 80,
      firstEnding: false,
      streak: 0,
      ascension: 0,
      deepClear: true,
    });
    expect(shallow.deepClear).toBe(0);
    expect(deep.deepClear).toBe(SECTOR_SIX_CLEAR_SHARDS);
    expect(deep.total - shallow.total).toBe(SECTOR_SIX_CLEAR_SHARDS);
  });
});

describe("«Ответ»", () => {
  beforeEach(() => {
    abandonRun();
    useMetaStore.setState({ codex: [] });
  });

  const balancedCtx = (over = {}) => ({
    axis: 1,
    flags: Object.fromEntries(
      ["beacon1", "beacon2", "beacon3", "beacon4", "beacon5"].map((k) => [k, true as const]),
    ),
    beaconsResolved: 5,
    crossedThreshold: true,
    echoArcComplete: true,
    ...over,
  });

  it("needs the threshold, five beacons, the whole arc and no lean", () => {
    const has = (over = {}) =>
      earnedEndings(balancedCtx(over)).some((e) => e.id === "answer");
    expect(has()).toBe(true);
    expect(has({ crossedThreshold: false })).toBe(false);
    expect(has({ echoArcComplete: false })).toBe(false);
    expect(has({ beaconsResolved: 4 })).toBe(false);
    expect(has({ axis: 3 })).toBe(false);
    expect(has({ axis: -3 })).toBe(false);
    expect(has({ axis: -2 })).toBe(true);
  });

  it("is never offered on a run that stopped at the Core", () => {
    for (const ending of earnedEndings(balancedCtx({ crossedThreshold: false }))) {
      expect(ending.id).not.toBe("answer");
    }
  });

  it("reads the arc as fifteen numbered fragments plus one sealed sixteenth", () => {
    const numbered = NUMBERED_MEMORIES.map((m) => m.codexId);
    useMetaStore.setState({ codex: [...numbered] });
    expect(echoArcComplete()).toBe(false);
    useMetaStore.setState({
      codex: [...numbered, FINAL_MEMORY_BY_ENDING.seal ?? ""],
    });
    expect(echoArcComplete()).toBe(true);
    useMetaStore.setState({ codex: numbered.slice(1) });
    expect(echoArcComplete()).toBe(false);
  });

  it("has a final memory of its own", () => {
    expect(FINAL_MEMORY_BY_ENDING.answer).toBe("memory-16-answer");
    expect(ENDINGS.map((e) => e.id)).toContain("answer");
  });
});
