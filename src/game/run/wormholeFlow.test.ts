import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createStreams } from "@/services/rng";
import { generateSectorMap } from "@/game/map/generator";
import { nodeById, type MapGraph, type WormholeEdge } from "@/game/map/types";
import { GENTLE_RIDES, throwCost, type WormholeThrow } from "@/game/map/wormhole";
import {
  bypassHole,
  endRun,
  jumpTo,
  openWormhole,
  rideWormhole,
  type WormholeRide,
} from "@/game/run/flow";
import { disintegrationPctFor, holeTollFor } from "@/game/run/motifs";
import { readLocalResume } from "@/game/run/resume";
import { captureRunSnapshot, restoreRunSnapshot } from "@/game/run/snapshot";
import {
  scriptedChaos,
  setChaosSource,
  type ChaosScript,
  type ChaosSource,
} from "@/services/chaos";
import { loadRunSnapshot } from "@/services/save";
import { useAppStore } from "@/stores/appStore";
import { createInitialMetaStats, useMetaStore } from "@/stores/metaStore";
import { useNarrativeStore } from "@/stores/narrativeStore";
import { createInitialRunValues, useRunStore } from "@/stores/runStore";
import { useSummaryStore } from "@/stores/summaryStore";

interface Fixture {
  map: MapGraph;
  record: WormholeEdge;
  sector: number;
}

const findWormhole = (): Fixture => {
  for (const sector of [2, 4, 6, 3, 5]) {
    for (let seed = 1; seed <= 60; seed += 1) {
      const map = generateSectorMap(createStreams(seed).map, sector);
      const record = Object.values(map.wormholes)[0];
      if (record !== undefined) return { map, record, sector };
    }
  }
  throw new Error("no seed in the probe range produced a wormhole edge");
};

const fixture = findWormhole();

const landedThrow = (ride: WormholeRide | null): WormholeThrow => {
  if (ride === null) throw new Error("the gate refused the ride");
  if (ride.kind !== "landed") throw new Error("the ride was not survived");
  return ride.throw;
};

const chaotic = (rides = GENTLE_RIDES + 1): void => {
  useRunStore.setState((s) => ({
    stats: { ...s.stats, wormholeRides: rides },
  }));
};

const seat = (hull = 30): void => {
  const node = nodeById(fixture.map).get(fixture.record.from);
  useRunStore.getState().hydrate({
    ...createInitialRunValues(),
    active: true,
    seed: 7,
    sector: fixture.sector,
    sectorIndex: fixture.sector,
    map: fixture.map,
    position: fixture.record.from,
    depthRow: node?.row ?? 0,
    visited: ["r0l1"],
    hull,
    hullMax: 30,
  });
};

beforeEach(() => {
  useMetaStore.setState({ stats: createInitialMetaStats() });
  useNarrativeStore.getState().reset();
  seat();
});

afterEach(() => {
  setChaosSource(null);
});

describe("the wormhole choice", () => {
  it("opens on the marked edge and refuses every other node", () => {
    expect(openWormhole(fixture.record.hole)).toBe(true);
    expect(useRunStore.getState().pendingWormhole).toBe(fixture.record.hole);
    seat();
    expect(openWormhole(fixture.record.bypass)).toBe(false);
    expect(useRunStore.getState().pendingWormhole).toBeNull();
  });

  it("refuses an ordinary jump into the hole", () => {
    expect(jumpTo(fixture.record.hole)).toBe(false);
    expect(useRunStore.getState().position).toBe(fixture.record.from);
  });

  it("refuses both branches when no choice is open", () => {
    expect(bypassHole(fixture.record.hole)).toBe(false);
    expect(rideWormhole(fixture.record.hole)).toBeNull();
  });

  it("survives a snapshot round trip and reopens the card", () => {
    openWormhole(fixture.record.hole);
    const snap = captureRunSnapshot();
    useRunStore.getState().reset();
    expect(restoreRunSnapshot(snap)).toBe(true);
    expect(useRunStore.getState().pendingWormhole).toBe(fixture.record.hole);
    expect(useRunStore.getState().position).toBe(fixture.record.from);
  });
});

describe("bypassing a hole", () => {
  it("charges the sector toll and reroutes to the alternate", () => {
    const toll = holeTollFor(fixture.sector, 30);
    expect(toll).toBeGreaterThan(0);
    openWormhole(fixture.record.hole);
    bypassHole(fixture.record.hole);
    const run = useRunStore.getState();
    expect(run.hull).toBe(30 - toll);
    expect(run.pendingWormhole).toBeNull();
    expect(run.stats.holesBypassed).toBe(1);
    expect(useMetaStore.getState().stats.holesBypassed).toBe(1);
    expect(run.stats.jumps).toBe(1);
  });

  it("is free and scorches when the hull cannot pay", () => {
    const toll = holeTollFor(fixture.sector, 30);
    seat(toll);
    expect(holeTollFor(fixture.sector, toll)).toBe(0);
    openWormhole(fixture.record.hole);
    bypassHole(fixture.record.hole);
    expect(useRunStore.getState().hull).toBe(toll);
    expect(
      useNarrativeStore.getState().feed.find((m) => m.source === "consequence")
        ?.key,
    ).toBe("run:motif.holeScorch");
  });

  it("never leaves the hull at zero", () => {
    for (const hull of [1, 2, 3, 4]) {
      seat(hull);
      openWormhole(fixture.record.hole);
      bypassHole(fixture.record.hole);
      expect(useRunStore.getState().hull).toBeGreaterThan(0);
    }
  });

  it("writes a journal entry", () => {
    openWormhole(fixture.record.hole);
    bypassHole(fixture.record.hole);
    const entry = useNarrativeStore
      .getState()
      .journal.find((row) => row.k === "wormhole");
    expect(entry?.k).toBe("wormhole");
    if (entry?.k !== "wormhole") return;
    expect(entry.branch).toBe("bypass");
  });
});

describe("riding a wormhole", () => {
  it("lands inside the rolled budget and counts one jump", () => {
    setChaosSource(scriptedChaos({ ints: [2, 0], picks: [0] }));
    openWormhole(fixture.record.hole);
    const roll = landedThrow(rideWormhole(fixture.record.hole));
    const run = useRunStore.getState();
    expect(run.position).toBe(roll.landing);
    expect(run.stats.wormholeRides).toBe(1);
    expect(useMetaStore.getState().stats.wormholeRides).toBe(1);
    expect(run.stats.jumps).toBe(1);
    expect(run.pendingWormhole).toBeNull();
    const origin = nodeById(fixture.map).get(fixture.record.from);
    const landed =
      roll.landing === null ? undefined : nodeById(fixture.map).get(roll.landing);
    expect(origin).toBeDefined();
    expect(landed).toBeDefined();
    if (origin === undefined || landed === undefined) return;
    if (roll.fallback === "none") {
      expect(throwCost(origin, landed)).toBeLessThanOrEqual(roll.budget);
    }
  });

  it("stays gentle for the first two rides and opens up after", () => {
    setChaosSource(scriptedChaos({ ints: [5, 1], picks: [0] }));
    for (let ride = 0; ride < GENTLE_RIDES; ride += 1) {
      seat();
      useRunStore.setState((s) => ({
        stats: { ...s.stats, wormholeRides: ride },
      }));
      openWormhole(fixture.record.hole);
      const roll = landedThrow(rideWormhole(fixture.record.hole));
      expect(roll.gentle).toBe(true);
      expect(roll.direction).toBe("forward");
      expect(roll.budget).toBeLessThanOrEqual(2);
    }
    seat();
    chaotic(GENTLE_RIDES);
    setChaosSource(scriptedChaos({ ints: [5, 1], picks: [0] }));
    openWormhole(fixture.record.hole);
    const wild = landedThrow(rideWormhole(fixture.record.hole));
    expect(wild.gentle).toBe(false);
    expect(wild.budget).toBe(5);
  });

  it("never lands on a node the run has already cleared", () => {
    const cleared = fixture.map.nodes
      .filter((n) => n.hole !== true && n.row > 0 && n.row < 20)
      .slice(0, 6)
      .map((n) => n.id)
      .filter((id) => id !== fixture.record.from);
    seat();
    useRunStore.setState({ visited: ["r0l1", ...cleared] });
    setChaosSource(scriptedChaos({ ints: [4, 0], picks: [0] }));
    openWormhole(fixture.record.hole);
    const roll = landedThrow(rideWormhole(fixture.record.hole));
    expect(cleared).not.toContain(roll.landing);
  });

  it("grants one fog row on landing", () => {
    setChaosSource(scriptedChaos({ ints: [2, 0], picks: [0] }));
    openWormhole(fixture.record.hole);
    rideWormhole(fixture.record.hole);
    expect(useRunStore.getState().bonusReveal).toBe(1);
  });

  it("records the throw for the resumed run", () => {
    setChaosSource(scriptedChaos({ ints: [2, 0], picks: [0] }));
    openWormhole(fixture.record.hole);
    const roll = landedThrow(rideWormhole(fixture.record.hole));
    const snap = captureRunSnapshot();
    useRunStore.getState().reset();
    restoreRunSnapshot(snap);
    expect(useRunStore.getState().lastWormhole).toEqual(roll);
  });

  it("logs the ride with its direction and row delta", () => {
    setChaosSource(scriptedChaos({ ints: [3, 0], picks: [0] }));
    openWormhole(fixture.record.hole);
    const roll = landedThrow(rideWormhole(fixture.record.hole));
    const entry = useNarrativeStore
      .getState()
      .journal.find((row) => row.k === "wormhole");
    expect(entry?.k).toBe("wormhole");
    if (entry?.k !== "wormhole") return;
    expect(entry.branch).toBe("ride");
    expect(entry.rows).toBe(roll.rows);
    expect(entry.direction).toBe(roll.direction);
  });
});

describe("a chaotic ride can unmake the ship", () => {
  const rideAt = (rides: number, fatal: boolean): WormholeRide | null => {
    seat();
    chaotic(rides);
    setChaosSource(scriptedChaos({ ints: [2, 0], picks: [0], rolls: [fatal] }));
    openWormhole(fixture.record.hole);
    return rideWormhole(fixture.record.hole, false);
  };

  it("declares a percentage on every sector that carries a hole", () => {
    expect(disintegrationPctFor(fixture.sector)).toBeGreaterThan(0);
  });

  it("leaves the two gentle rides branded safe", () => {
    for (const rides of [0, 1]) {
      expect(rideAt(rides, true)?.kind).toBe("landed");
      expect(useRunStore.getState().active).toBe(true);
    }
  });

  it("can fire from the third ride on", () => {
    for (const rides of [GENTLE_RIDES, GENTLE_RIDES + 1]) {
      expect(rideAt(rides, true)).toEqual({ kind: "fatal" });
      expect(useRunStore.getState().active).toBe(false);
    }
  });

  it("lands as usual when the chaotic roll misses", () => {
    expect(rideAt(GENTLE_RIDES, false)?.kind).toBe("landed");
    expect(useRunStore.getState().active).toBe(true);
  });

  it("never commits a landing", () => {
    seat();
    chaotic();
    const before = useRunStore.getState();
    const position = before.position;
    const depthRow = before.depthRow;
    const hull = before.hull;
    setChaosSource(scriptedChaos({ ints: [2, 0], picks: [0], rolls: [true] }));
    openWormhole(fixture.record.hole);
    expect(rideWormhole(fixture.record.hole, false)).toEqual({ kind: "fatal" });
    const after = useRunStore.getState();
    expect(after.position).toBe(position);
    expect(after.depthRow).toBe(depthRow);
    expect(after.hull).toBe(hull);
    expect(after.visited).not.toContain(fixture.record.hole);
    expect(after.pendingWormhole).toBeNull();
    expect(after.lastWormhole).toBeNull();
    expect(after.bonusReveal).toBe(0);
    expect(after.stats.jumps).toBe(0);
    expect(after.stats.wormholeRides).toBe(GENTLE_RIDES + 1);
  });

  it("ends the run on the singularity branch of the death route", () => {
    rideAt(GENTLE_RIDES, true);
    expect(useAppStore.getState().screen).toBe("ending");
    expect(useAppStore.getState().params).toEqual({
      death: "1",
      cause: "singularity",
    });
    const result = useSummaryStore.getState().result;
    expect(result?.win).toBe(false);
    expect(result?.cause).toBe("singularity");
  });

  it("leaves the two ordinary death causes exactly as they were", () => {
    seat(0);
    endRun(false);
    expect(useSummaryStore.getState().result?.cause).toBe("hull");
    expect(useAppStore.getState().params).toEqual({ death: "1" });
    seat();
    endRun(false);
    expect(useSummaryStore.getState().result?.cause).toBe("abandon");
    expect(useAppStore.getState().params).toEqual({ death: "1" });
  });

  it("writes the singularity journal line", () => {
    rideAt(GENTLE_RIDES, true);
    const entry = useNarrativeStore
      .getState()
      .journal.find((row) => row.k === "singularity");
    expect(entry?.k).toBe("singularity");
    expect(entry?.sector).toBe(fixture.sector);
    expect(
      useNarrativeStore.getState().journal.some((row) => row.k === "wormhole"),
    ).toBe(false);
  });

  it("counts one lifetime disintegration and opens the family", () => {
    useMetaStore.setState({ achievements: [], achievementsSeen: [] });
    rideAt(GENTLE_RIDES, true);
    expect(useMetaStore.getState().stats.disintegrations).toBe(1);
    expect(useMetaStore.getState().stats.wormholeRides).toBe(0);
    expect(useMetaStore.getState().achievements).toContain("horizonTester-1");
  });

  it("cannot be resurrected by a reload", () => {
    rideAt(GENTLE_RIDES, true);
    expect(loadRunSnapshot()).not.toBeNull();
    expect(readLocalResume()).toBeNull();
    useRunStore.getState().reset();
    expect(useRunStore.getState().active).toBe(false);
  });
});

interface CountedChaos {
  pcts: number[];
  source: ChaosSource;
}

const RIDE_TAPE: ChaosScript = { ints: [2, 0], picks: [0] };

const countingChaos = (): CountedChaos => {
  const tape = scriptedChaos(RIDE_TAPE);
  const pcts: number[] = [];
  return {
    pcts,
    source: {
      int: (min, max) => tape.int(min, max),
      pick: (arr) => tape.pick(arr),
      roll: (pct) => {
        pcts.push(pct);
        return false;
      },
    },
  };
};

const countedRide = (rides: number): CountedChaos => {
  const counted = countingChaos();
  seat();
  chaotic(rides);
  setChaosSource(counted.source);
  openWormhole(fixture.record.hole);
  expect(rideWormhole(fixture.record.hole, false)?.kind).toBe("landed");
  return counted;
};

describe("the chaos source the ride reaches for without a mock in the way", () => {
  it("asks it once, at the percentage the sector motif declares", () => {
    expect(countedRide(GENTLE_RIDES).pcts).toEqual([
      disintegrationPctFor(fixture.sector),
    ]);
  });

  it("keeps asking on every ride past the gentle window", () => {
    expect(countedRide(GENTLE_RIDES + 4).pcts).toEqual([
      disintegrationPctFor(fixture.sector),
    ]);
  });

  it("never asks it during the two gentle rides", () => {
    for (const rides of [0, 1]) {
      expect(countedRide(rides).pcts).toEqual([]);
    }
  });
});
