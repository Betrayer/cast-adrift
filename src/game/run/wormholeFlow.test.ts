import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { EchoNodeId } from "@/data/echo";
import { createStreams } from "@/services/rng";
import { generateSectorMap } from "@/game/map/generator";
import {
  bandOf,
  nodeById,
  type HoleBand,
  type MapGraph,
  type WormholeEdge,
} from "@/game/map/types";
import {
  GENTLE_RIDES,
  softLandThrow,
  type WormholeThrow,
} from "@/game/map/wormhole";
import {
  bypassHole,
  canSoftLandWormhole,
  endRun,
  jumpTo,
  openWormhole,
  rideWormhole,
  type WormholeRide,
} from "@/game/run/flow";
import {
  bypassPctFor,
  disintegrationPctFor,
  holeTollFor,
} from "@/game/run/motifs";
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

const bandOrThrow = (): HoleBand => {
  const band = bandOf(fixture.map);
  if (band === null) throw new Error("the fixture carries no band");
  return band;
};

const band = bandOrThrow();

const FAR_ROW = band.rows[1] + 1;

const rowOf = (id: string | null): number =>
  id === null ? -1 : (nodeById(fixture.map).get(id)?.row ?? -1);

const laneOf = (id: string | null): number =>
  id === null ? -1 : (nodeById(fixture.map).get(id)?.lane ?? -1);

const HULL_MAX = 30;

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
  it("pays the ceiling of the sector's share of max hull and lands on the far rim", () => {
    const toll = holeTollFor(fixture.sector, HULL_MAX);
    expect(toll).toBe(Math.ceil(HULL_MAX * bypassPctFor(fixture.sector)));
    expect(toll).toBeGreaterThan(0);
    openWormhole(fixture.record.hole);
    expect(bypassHole(fixture.record.hole)).toBe(true);
    const run = useRunStore.getState();
    expect(run.hull).toBe(HULL_MAX - toll);
    expect(run.position).toBe(fixture.record.bypass);
    expect(rowOf(run.position)).toBe(FAR_ROW);
    expect(run.pendingWormhole).toBeNull();
    expect(run.stats.holesBypassed).toBe(1);
    expect(useMetaStore.getState().stats.holesBypassed).toBe(1);
    expect(run.stats.jumps).toBe(1);
    expect(run.stats.wormholeRides).toBe(0);
  });

  it("charges max hull's share even on a worn hull", () => {
    const toll = holeTollFor(fixture.sector, HULL_MAX);
    seat(toll + 2);
    openWormhole(fixture.record.hole);
    expect(bypassHole(fixture.record.hole)).toBe(true);
    expect(useRunStore.getState().hull).toBe(2);
  });

  it("refuses a lethal bypass and changes nothing", () => {
    const toll = holeTollFor(fixture.sector, HULL_MAX);
    for (const hull of [toll, toll - 1, 1]) {
      seat(hull);
      useNarrativeStore.getState().reset();
      openWormhole(fixture.record.hole);
      const before = useRunStore.getState();
      expect(bypassHole(fixture.record.hole), `hull ${String(hull)}`).toBe(false);
      const after = useRunStore.getState();
      expect(after.hull).toBe(hull);
      expect(after.position).toBe(before.position);
      expect(after.depthRow).toBe(before.depthRow);
      expect(after.visited).toEqual(before.visited);
      expect(after.pendingWormhole).toBe(fixture.record.hole);
      expect(after.stats.holesBypassed).toBe(0);
      expect(after.stats.jumps).toBe(0);
      expect(useMetaStore.getState().stats.holesBypassed).toBe(0);
      expect(
        useNarrativeStore.getState().journal.some((row) => row.k === "wormhole"),
      ).toBe(false);
    }
  });

  it("leaves the ride open after a refused bypass", () => {
    seat(holeTollFor(fixture.sector, HULL_MAX));
    openWormhole(fixture.record.hole);
    expect(bypassHole(fixture.record.hole)).toBe(false);
    setChaosSource(scriptedChaos({ ints: [1, 1], picks: [0] }));
    const roll = landedThrow(rideWormhole(fixture.record.hole));
    expect(roll.landing).toBe(fixture.record.bypass);
    expect(useRunStore.getState().position).toBe(fixture.record.bypass);
  });

  it("never leaves the hull at zero", () => {
    const toll = holeTollFor(fixture.sector, HULL_MAX);
    for (let hull = 1; hull <= toll + 1; hull += 1) {
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
  it("lands past the band and counts one jump", () => {
    setChaosSource(scriptedChaos({ ints: [2, 0], picks: [0] }));
    openWormhole(fixture.record.hole);
    const roll = landedThrow(rideWormhole(fixture.record.hole));
    const run = useRunStore.getState();
    expect(run.position).toBe(roll.landing);
    expect(rowOf(roll.landing)).toBeGreaterThan(band.rows[1]);
    expect(run.depthRow).toBe(rowOf(roll.landing));
    expect(run.stats.wormholeRides).toBe(1);
    expect(useMetaStore.getState().stats.wormholeRides).toBe(1);
    expect(run.stats.jumps).toBe(1);
    expect(run.stats.holesBypassed).toBe(0);
    expect(run.hull).toBe(HULL_MAX);
    expect(run.pendingWormhole).toBeNull();
  });

  it("stays gentle for the first two rides and opens up after", () => {
    for (let ride = 0; ride < GENTLE_RIDES; ride += 1) {
      seat();
      useRunStore.setState((s) => ({
        stats: { ...s.stats, wormholeRides: ride },
      }));
      setChaosSource(scriptedChaos({ ints: [6, 9], picks: [0] }));
      openWormhole(fixture.record.hole);
      const roll = landedThrow(rideWormhole(fixture.record.hole));
      expect(roll.gentle).toBe(true);
      expect(roll.direction).toBe("forward");
      expect(roll.extra).toBe(0);
      expect(roll.laneShift).toBe(0);
      expect(roll.landing).toBe(fixture.record.bypass);
      expect(rowOf(roll.landing)).toBe(FAR_ROW);
    }
    seat();
    chaotic(GENTLE_RIDES);
    setChaosSource(scriptedChaos({ ints: [6, 9], picks: [0] }));
    openWormhole(fixture.record.hole);
    const wild = landedThrow(rideWormhole(fixture.record.hole));
    expect(wild.gentle).toBe(false);
    expect(wild.extra).toBe(2);
    expect(wild.laneShift).toBe(2);
    expect(rowOf(wild.landing)).toBe(FAR_ROW + 2);
    expect(wild.rows).toBe(FAR_ROW + 2 - rowOf(fixture.record.from));
  });

  it("never reads the tape on a gentle ride", () => {
    for (let ride = 0; ride < GENTLE_RIDES; ride += 1) {
      seat();
      useRunStore.setState((s) => ({
        stats: { ...s.stats, wormholeRides: ride },
      }));
      const counted = echoCountingChaos();
      setChaosSource(counted.source);
      openWormhole(fixture.record.hole);
      expect(rideWormhole(fixture.record.hole, false)?.kind).toBe("landed");
      expect({ ints: counted.ints, picks: counted.picks, rolls: counted.rolls }).toEqual({
        ints: 0,
        picks: 0,
        rolls: 0,
      });
    }
  });

  it("lands a chaotic ride one to three rows past the band on the shifted lane", () => {
    const origin = laneOf(fixture.record.from);
    for (let e = 1; e <= 6; e += 1) {
      for (const s of [1, 4, 6, 8, 9]) {
        seat();
        chaotic();
        setChaosSource(scriptedChaos({ ints: [e, s], picks: [0], rolls: [false] }));
        openWormhole(fixture.record.hole);
        const roll = landedThrow(rideWormhole(fixture.record.hole, false));
        const label = `faces ${String(e)}/${String(s)}`;
        const past = rowOf(roll.landing) - band.rows[1];
        expect(past, label).toBeGreaterThanOrEqual(1);
        expect(past, label).toBeLessThanOrEqual(3);
        if (roll.fallback === "none") {
          expect(rowOf(roll.landing), label).toBe(FAR_ROW + roll.extra);
          const aim = origin + roll.laneShift;
          const lanes = fixture.map.nodes
            .filter((n) => n.row === FAR_ROW + roll.extra && n.pocket !== true)
            .map((n) => Math.abs(n.lane - aim));
          expect(Math.abs(laneOf(roll.landing) - aim), label).toBe(Math.min(...lanes));
        }
      }
    }
  });

  it("never lands on a node the run has already cleared", () => {
    const cleared = [...band.farRim];
    seat();
    useRunStore.setState({ visited: ["r0l1", ...cleared] });
    setChaosSource(scriptedChaos({ ints: [1, 1], picks: [0] }));
    openWormhole(fixture.record.hole);
    const roll = landedThrow(rideWormhole(fixture.record.hole));
    expect(cleared).not.toContain(roll.landing);
    expect(rowOf(roll.landing)).toBe(FAR_ROW + 1);
    expect(roll.fallback).toBe("nearest");
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


interface EchoCountedChaos {
  ints: number;
  picks: number;
  rolls: number;
  source: ChaosSource;
}

const echoCountingChaos = (): EchoCountedChaos => {
  const tape = scriptedChaos(RIDE_TAPE);
  const counted: EchoCountedChaos = {
    ints: 0,
    picks: 0,
    rolls: 0,
    source: {
      int: (min, max) => {
        counted.ints += 1;
        return tape.int(min, max);
      },
      pick: (arr) => {
        counted.picks += 1;
        return tape.pick(arr);
      },
      roll: (pct) => {
        counted.rolls += 1;
        return tape.roll(pct);
      },
    },
  };
  return counted;
};

const seatEcho = (echo: EchoNodeId | null, rides = GENTLE_RIDES + 7): void => {
  seat();
  useRunStore.setState({ echo });
  chaotic(rides);
};

describe("Soft Landing rides a wormhole without touching chaos", () => {
  it("asks the chaos source for nothing at all", () => {
    seatEcho("softLanding");
    const counted = echoCountingChaos();
    setChaosSource(counted.source);
    expect(canSoftLandWormhole()).toBe(true);
    openWormhole(fixture.record.hole);
    const ride = rideWormhole(fixture.record.hole, false, true);
    expect(ride?.kind).toBe("landed");
    expect({
      ints: counted.ints,
      picks: counted.picks,
      rolls: counted.rolls,
    }).toEqual({ ints: 0, picks: 0, rolls: 0 });
    expect(useRunStore.getState().echoUsed).toBe(true);
    expect(canSoftLandWormhole()).toBe(false);
  });

  it("lands forward, gently, on the far rim in its own lane", () => {
    seatEcho("softLanding");
    setChaosSource(echoCountingChaos().source);
    openWormhole(fixture.record.hole);
    const landed = landedThrow(rideWormhole(fixture.record.hole, false, true));
    expect(landed.gentle).toBe(true);
    expect(landed.direction).toBe("forward");
    expect(landed.rows).toBeGreaterThan(0);
    expect(landed).toEqual(
      softLandThrow(fixture.map, fixture.record.from, fixture.record.hole, [
        "r0l1",
      ]),
    );
    expect(landed.landing).toBe(fixture.record.bypass);
    expect(useRunStore.getState().position).toBe(landed.landing);
  });

  it("never disintegrates, even past the gentle window", () => {
    seatEcho("softLanding");
    setChaosSource(scriptedChaos({ ints: [6, 9], picks: [0], rolls: [true] }));
    openWormhole(fixture.record.hole);
    expect(rideWormhole(fixture.record.hole, false, true)?.kind).toBe("landed");
    expect(useRunStore.getState().active).toBe(true);
    expect(useRunStore.getState().position).toBe(fixture.record.bypass);
  });

  it("still consumes chaos on an ordinary ride of the same hole", () => {
    seatEcho("softLanding");
    const counted = echoCountingChaos();
    setChaosSource(counted.source);
    openWormhole(fixture.record.hole);
    rideWormhole(fixture.record.hole, false, false);
    expect(counted.ints).toBeGreaterThan(0);
    expect(counted.rolls).toBeGreaterThan(0);
    expect(useRunStore.getState().echoUsed).toBe(false);
  });

  it("refuses the soft landing once the run charge is spent", () => {
    seatEcho("softLanding");
    useRunStore.getState().spendEcho();
    const counted = echoCountingChaos();
    setChaosSource(counted.source);
    openWormhole(fixture.record.hole);
    rideWormhole(fixture.record.hole, false, true);
    expect(counted.ints).toBeGreaterThan(0);
  });

  it("refuses the soft landing when a different node is equipped", () => {
    seatEcho("veto");
    expect(canSoftLandWormhole()).toBe(false);
    const counted = echoCountingChaos();
    setChaosSource(counted.source);
    openWormhole(fixture.record.hole);
    rideWormhole(fixture.record.hole, false, true);
    expect(counted.ints).toBeGreaterThan(0);
    expect(useRunStore.getState().echoUsed).toBe(false);
  });

  it("never spends Veto on the hole that ends a run without reducing hull", () => {
    seatEcho("veto");
    setChaosSource(scriptedChaos({ ints: [2, 0], picks: [0], rolls: [true] }));
    openWormhole(fixture.record.hole);
    expect(rideWormhole(fixture.record.hole, false, false)?.kind).toBe("fatal");
    expect(useRunStore.getState().active).toBe(false);
    expect(useRunStore.getState().hull).toBe(30);
  });
});

describe("Soft Landing keeps its charge when it cannot keep its promise", () => {
  const blockEverythingAhead = (): void => {
    const origin = nodeById(fixture.map).get(fixture.record.from);
    if (origin === undefined) throw new Error("the fixture has no origin node");
    const ahead = fixture.map.nodes
      .filter((node) => node.row > origin.row)
      .map((node) => node.id);
    useRunStore.setState((s) => ({ visited: [...s.visited, ...ahead] }));
  };

  it("does not spend the run charge on a stalled landing", () => {
    seatEcho("softLanding");
    blockEverythingAhead();
    setChaosSource(echoCountingChaos().source);
    openWormhole(fixture.record.hole);

    const ride = rideWormhole(fixture.record.hole, false, true);

    expect(landedThrow(ride).landing).toBeNull();
    expect(useRunStore.getState().echoUsed).toBe(false);
    expect(canSoftLandWormhole()).toBe(true);
  });

  it("leaves the ship where it stood rather than taking a bypass it did not choose", () => {
    seatEcho("softLanding");
    blockEverythingAhead();
    setChaosSource(echoCountingChaos().source);
    openWormhole(fixture.record.hole);

    rideWormhole(fixture.record.hole, false, true);

    expect(useRunStore.getState().position).toBe(fixture.record.from);
  });
});
