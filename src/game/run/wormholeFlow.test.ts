import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createStreams } from "@/services/rng";
import { generateSectorMap } from "@/game/map/generator";
import { nodeById, type MapGraph, type WormholeEdge } from "@/game/map/types";
import { GENTLE_RIDES, throwCost } from "@/game/map/wormhole";
import {
  bypassHole,
  jumpTo,
  openWormhole,
  rideWormhole,
} from "@/game/run/flow";
import { holeTollFor } from "@/game/run/motifs";
import { captureRunSnapshot, restoreRunSnapshot } from "@/game/run/snapshot";
import { scriptedChaos, setChaosSource } from "@/services/chaos";
import { createInitialMetaStats, useMetaStore } from "@/stores/metaStore";
import { useNarrativeStore } from "@/stores/narrativeStore";
import { createInitialRunValues, useRunStore } from "@/stores/runStore";

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
    expect(useNarrativeStore.getState().consequence?.origin).toBe(
      "run:motif.holeScorch",
    );
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
    const roll = rideWormhole(fixture.record.hole);
    expect(roll).not.toBeNull();
    if (roll === null) return;
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
      const roll = rideWormhole(fixture.record.hole);
      expect(roll?.gentle).toBe(true);
      expect(roll?.direction).toBe("forward");
      expect(roll?.budget).toBeLessThanOrEqual(2);
    }
    seat();
    useRunStore.setState((s) => ({
      stats: { ...s.stats, wormholeRides: GENTLE_RIDES },
    }));
    setChaosSource(scriptedChaos({ ints: [5, 1], picks: [0] }));
    openWormhole(fixture.record.hole);
    const wild = rideWormhole(fixture.record.hole);
    expect(wild?.gentle).toBe(false);
    expect(wild?.budget).toBe(5);
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
    const roll = rideWormhole(fixture.record.hole);
    expect(cleared).not.toContain(roll?.landing);
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
    const roll = rideWormhole(fixture.record.hole);
    const snap = captureRunSnapshot();
    useRunStore.getState().reset();
    restoreRunSnapshot(snap);
    expect(useRunStore.getState().lastWormhole).toEqual(roll);
  });

  it("logs the ride with its direction and row delta", () => {
    setChaosSource(scriptedChaos({ ints: [3, 0], picks: [0] }));
    openWormhole(fixture.record.hole);
    const roll = rideWormhole(fixture.record.hole);
    const entry = useNarrativeStore
      .getState()
      .journal.find((row) => row.k === "wormhole");
    expect(entry?.k).toBe("wormhole");
    if (entry?.k !== "wormhole") return;
    expect(entry.branch).toBe("ride");
    expect(entry.rows).toBe(roll?.rows);
    expect(entry.direction).toBe(roll?.direction);
  });
});
