import { beforeEach, describe, expect, it } from "vitest";
import {
  CARGO,
  CARGO_PREFER_ROWS,
  cargoDef,
  cargoPayout,
  cargoSlotTierDelta,
} from "@/data/cargo";
import { SECTORS, sectorDef } from "@/data/sectors";
import { PLAYABLE_SHIPS } from "@/data/ships";
import { generateSectorMap, START_NODE_ID } from "@/game/map/generator";
import { forwardReach, forwardStations, isStationNode } from "@/game/map/reach";
import {
  nodeById,
  outgoingEdges,
  type MapGraph,
  type MapNode,
  type NodeId,
  type WormholeEdge,
} from "@/game/map/types";
import {
  advanceSector,
  bypassHole,
  completeNode,
  enterNode,
  jumpTo,
  openWormhole,
  resolveRunBattle,
  rideWormhole,
  startRun,
} from "@/game/run/flow";
import {
  cargoOfferable,
  cargoRowsLeft,
  cargoSlotTier,
  dropCargo,
  offeredCargo,
  pickDeliveryTarget,
  takeCargo,
} from "@/game/run/cargo";
import { resetBarkMemory } from "@/game/narrative/barks";
import {
  captureRunSnapshot,
  restoreRunSnapshot,
  RUN_SNAPSHOT_ACCEPTED,
  type RunSnapshotV1,
} from "@/game/run/snapshot";
import { createStream, createStreams } from "@/services/rng";
import { useBattleStore } from "@/stores/battleStore";
import { useNarrativeStore } from "@/stores/narrativeStore";
import { useRunStore, type RunCargo, type RunValues } from "@/stores/runStore";
import type { SlotId } from "@/types/content";

const SEEDS = 25;

const must = <T>(value: T | undefined | null, what: string): T => {
  if (value === undefined || value === null) throw new Error(what);
  return value;
};

const seat = (seed = 7): void => {
  startRun(seed);
  useNarrativeStore.getState().reset();
  resetBarkMemory();
};

const run = (): RunValues => useRunStore.getState();

const liveMap = (): MapGraph => must(run().map, "the run carries no map");

const held = (): readonly RunCargo[] => run().cargo;

const cargoSteps = (): readonly string[] =>
  useNarrativeStore
    .getState()
    .journal.flatMap((entry) => (entry.k === "cargo" ? [entry.step] : []));

const feedKeys = (): readonly string[] =>
  useNarrativeStore.getState().feed.map((message) => message.key);

const barkLines = (): string =>
  useNarrativeStore
    .getState()
    .journal.flatMap((entry) => (entry.k === "bark" ? [entry.line] : []))
    .join(" ");

const openStep = (map: MapGraph, from: NodeId): NodeId | undefined =>
  outgoingEdges(map, from).find(
    (id) => nodeById(map).get(id)?.hole !== true,
  );

const stationEdge = (
  map: MapGraph,
): { from: MapNode; station: MapNode } | undefined => {
  const byId = nodeById(map);
  for (const [from, to] of map.edges) {
    const a = byId.get(from);
    const b = byId.get(to);
    if (a === undefined || b === undefined) continue;
    if (a.hole === true || b.hole === true) continue;
    if (isStationNode(b)) return { from: a, station: b };
  }
  return undefined;
};

const plainEdge = (
  map: MapGraph,
): { from: MapNode; to: MapNode } | undefined => {
  const byId = nodeById(map);
  for (const [from, to] of map.edges) {
    const a = byId.get(from);
    const b = byId.get(to);
    if (a === undefined || b === undefined) continue;
    if (a.hole === true || b.hole === true) continue;
    if (b.type === "battle") return { from: a, to: b };
  }
  return undefined;
};

const standAt = (node: MapNode): void => {
  useRunStore.setState({
    position: node.id,
    depthRow: node.row,
    visited: [node.id],
  });
};

const loadHold = (defId: string, nodeId: NodeId): void => {
  useRunStore.setState({
    cargo: [
      {
        defId,
        nodeId,
        sectorIndex: run().sectorIndex,
        takenRow: run().depthRow,
      },
    ],
  });
};

const strandedStation = (map: MapGraph, from: NodeId): NodeId | undefined => {
  const reach = forwardReach(map, from);
  return map.nodes.find(
    (node) => isStationNode(node) && node.hole !== true && !reach.has(node.id),
  )?.id;
};

const launchNode = (map: MapGraph): MapNode | undefined =>
  map.nodes.find(
    (node) =>
      node.hole !== true &&
      node.row > 0 &&
      strandedStation(map, node.id) !== undefined &&
      openStep(map, node.id) !== undefined &&
      forwardStations(map, node.id).length > 0,
  );

const deadEndNode = (map: MapGraph): MapNode | undefined =>
  map.nodes.find(
    (node) =>
      node.hole !== true &&
      node.type !== "boss" &&
      forwardStations(map, node.id).length === 0 &&
      openStep(map, node.id) !== undefined &&
      strandedStation(map, node.id) !== undefined,
  );

const findWormhole = (): {
  map: MapGraph;
  record: WormholeEdge;
  sector: number;
} => {
  for (const sector of [2, 4, 6, 3, 5]) {
    for (let seed = 1; seed <= 60; seed += 1) {
      const map = generateSectorMap(createStreams(seed).map, sector);
      const record = Object.values(map.wormholes)[0];
      if (record !== undefined) return { map, record, sector };
    }
  }
  throw new Error("no seed in the probe range produced a wormhole edge");
};

const hole = findWormhole();

const seatAtHole = (): void => {
  seat(11);
  useRunStore.setState({
    sector: hole.sector,
    sectorIndex: hole.sector,
    map: hole.map,
    position: hole.record.from,
    depthRow: nodeById(hole.map).get(hole.record.from)?.row ?? 0,
    visited: [hole.record.from],
    hull: 30,
    hullMax: 30,
  });
};

beforeEach(() => {
  seat();
});

describe("the delivery marker", () => {
  it("always lands on a station the ship can still reach", () => {
    let picked = 0;
    let inWindow = 0;
    for (const sector of SECTORS) {
      for (let seed = 1; seed <= SEEDS; seed += 1) {
        seat(seed * 7 + sector.id);
        useRunStore.setState({
          sector: sector.id,
          sectorIndex: sector.id,
          map: generateSectorMap(createStreams(seed).map, sector.id),
          position: START_NODE_ID,
          depthRow: 0,
          visited: [START_NODE_ID],
        });
        expect(takeCargo("stasisPods")).toBe(true);
        const entry = must(held()[0], "the hold stayed empty");
        const map = liveMap();
        const open = forwardStations(map, START_NODE_ID, run().visited);
        const chosen = must(
          open.find((step) => step.node.id === entry.nodeId),
          `${String(sector.id)}/${String(seed)}: the mark is out of reach`,
        );
        expect(isStationNode(chosen.node)).toBe(true);
        const window = open.filter(
          (step) =>
            step.rows >= CARGO_PREFER_ROWS[0] &&
            step.rows <= CARGO_PREFER_ROWS[1],
        );
        if (window.length > 0) {
          expect(chosen.rows).toBeGreaterThanOrEqual(CARGO_PREFER_ROWS[0]);
          expect(chosen.rows).toBeLessThanOrEqual(CARGO_PREFER_ROWS[1]);
          inWindow += 1;
        }
        picked += 1;
      }
    }
    expect(picked).toBe(SECTORS.length * SEEDS);
    expect(inWindow).toBeGreaterThan(SEEDS);
  });

  it("refuses the offer when no station lies ahead", () => {
    const dead = must(deadEndNode(liveMap()), "no node with nothing ahead");
    standAt(dead);
    expect(cargoOfferable("stasisPods")).toBe(false);
    expect(takeCargo("stasisPods")).toBe(false);
    expect(held()).toHaveLength(0);
  });

  it("never offers a slot drawback the hull cannot feel", () => {
    for (const ship of PLAYABLE_SHIPS) {
      for (const def of CARGO) {
        seat(5);
        useRunStore.setState({ shipId: ship.id });
        const slots = Object.keys(cargoSlotTierDelta(def)) as SlotId[];
        const bites = slots.every((slot) => ship.slots[slot] !== undefined);
        expect(
          cargoOfferable(def.id),
          `${def.id} on ${ship.id}`,
        ).toBe(bites);
        expect(takeCargo(def.id), `${def.id} taken on ${ship.id}`).toBe(bites);
      }
    }
  });

  it("refuses the reliquary on the hull with no shield slot", () => {
    seat(5);
    useRunStore.setState({ shipId: "corsair" });
    expect(cargoOfferable("saintsReliquary")).toBe(false);
    expect(takeCargo("saintsReliquary")).toBe(false);
    expect(held()).toHaveLength(0);
    expect(cargoOfferable("unstableCore")).toBe(true);
  });

  it("refuses a second cargo the hold has no room for", () => {
    expect(takeCargo("stasisPods")).toBe(true);
    expect(cargoOfferable("liveHold")).toBe(false);
    expect(takeCargo("liveHold")).toBe(false);
    expect(held()).toHaveLength(1);
  });

  it("draws an offer the hold can still take", () => {
    const stream = createStream(9);
    expect(offeredCargo(stream, 1, [])).not.toBeNull();
    expect(offeredCargo(stream, 1, ["stasisPods"])).toBeNull();
    expect(offeredCargo(stream, 2, ["stasisPods"])).not.toBe("stasisPods");
    expect(offeredCargo(stream, 8, CARGO.map((def) => def.id))).toBeNull();
  });

  it("finds nothing ahead of the boss row", () => {
    const map = liveMap();
    const boss = must(
      map.nodes.find((node) => node.type === "boss"),
      "no boss node",
    );
    expect(pickDeliveryTarget(map, boss.id, [])).toBeNull();
  });
});

describe("the re-anchor", () => {
  it("moves the mark on an ordinary step", () => {
    const map = liveMap();
    const start = must(launchNode(map), "no launch node");
    standAt(start);
    const stranded = must(
      strandedStation(map, start.id),
      "no stranded station",
    );
    loadHold("stasisPods", stranded);
    const next = must(openStep(map, start.id), "no open step");
    expect(jumpTo(next)).toBe(true);
    const entry = must(held()[0], "the contract lapsed instead of moving");
    expect(entry.nodeId).not.toBe(stranded);
    expect(forwardReach(map, next).has(entry.nodeId)).toBe(true);
    expect(cargoSteps()).toContain("moved");
    expect(feedKeys()).toContain("run:cargo.moved");
  });

  it("moves the mark on a bypass slip", () => {
    seatAtHole();
    const stranded = must(
      strandedStation(hole.map, hole.record.from),
      "no stranded station at the rim",
    );
    loadHold("stasisPods", stranded);
    openWormhole(hole.record.hole);
    expect(bypassHole(hole.record.hole)).toBe(true);
    const entry = must(held()[0], "the contract lapsed instead of moving");
    expect(entry.nodeId).not.toBe(stranded);
    expect(
      forwardReach(hole.map, must(run().position, "no position")).has(
        entry.nodeId,
      ),
    ).toBe(true);
    expect(cargoSteps()).toContain("moved");
  });

  it("moves the mark on a wormhole ride", () => {
    let moved = 0;
    let stale = 0;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      seatAtHole();
      const stranded = must(
        strandedStation(hole.map, hole.record.from),
        "no stranded station at the rim",
      );
      loadHold("stasisPods", stranded);
      openWormhole(hole.record.hole);
      if (rideWormhole(hole.record.hole, false)?.kind !== "landed") continue;
      const entry = held()[0];
      if (entry === undefined) continue;
      const reach = forwardReach(hole.map, must(run().position, "no position"));
      if (entry.nodeId === stranded || !reach.has(entry.nodeId)) {
        stale += 1;
        continue;
      }
      expect(cargoSteps()).toContain("moved");
      moved += 1;
    }
    expect(stale).toBe(0);
    expect(moved).toBeGreaterThan(0);
  });

  it("lapses with a line when nothing ahead will take it", () => {
    const map = liveMap();
    const dead = must(deadEndNode(map), "no node with nothing ahead");
    standAt(dead);
    const stranded = must(strandedStation(map, dead.id), "no stranded station");
    loadHold("stasisPods", stranded);
    const next = must(openStep(map, dead.id), "no open step");
    expect(jumpTo(next)).toBe(true);
    expect(held()).toHaveLength(0);
    expect(cargoSteps()).toContain("lapsed");
    expect(feedKeys()).toContain("run:cargo.stranded");
  });

  it("keeps the mark while the station is still reachable", () => {
    expect(takeCargo("stasisPods")).toBe(true);
    const target = must(held()[0], "the hold stayed empty").nodeId;
    const map = liveMap();
    const next = must(
      outgoingEdges(map, START_NODE_ID).find((id) =>
        forwardReach(map, id).has(target),
      ),
      "no branch keeps the mark",
    );
    expect(jumpTo(next)).toBe(true);
    expect(held()[0]?.nodeId).toBe(target);
    expect(cargoSteps()).not.toContain("moved");
  });
});

describe("the contract", () => {
  it("lapses at the act boundary", () => {
    expect(takeCargo("stasisPods")).toBe(true);
    const before = run().scrap;
    advanceSector();
    expect(held()).toHaveLength(0);
    expect(run().scrap).toBe(before);
    expect(cargoSteps()).toContain("lapsed");
    expect(feedKeys()).toContain("run:cargo.lapsed");
  });

  it("pays at the marked station exactly once", () => {
    const edge = must(stationEdge(liveMap()), "no edge into a station");
    standAt(edge.from);
    loadHold("unstableCore", edge.station.id);
    const before = run().scrap;
    const due = cargoPayout(
      must(cargoDef("unstableCore"), "no such cargo"),
      sectorDef(run().sector).scrapMult,
    );
    expect(due).toBeGreaterThan(0);
    expect(jumpTo(edge.station.id)).toBe(true);
    expect(run().scrap).toBe(before + due);
    expect(held()).toHaveLength(0);
    expect(cargoSteps()).toContain("delivered");
    expect(feedKeys()).toContain("run:cargo.delivered");
    enterNode(edge.station.id);
    expect(run().scrap).toBe(before + due);
  });

  it("says the delivery line at the node's completion, not at its arrival", () => {
    const edge = must(stationEdge(liveMap()), "no edge into a station");
    standAt(edge.from);
    loadHold("unstableCore", edge.station.id);
    resetBarkMemory();
    expect(jumpTo(edge.station.id)).toBe(true);
    expect(barkLines()).not.toContain("content:bark.cargoDelivered.");
    expect(run().pendingCargoBark).toBe(true);
    resetBarkMemory();
    completeNode({ outcome: "cleared" });
    expect(barkLines()).toContain("content:bark.cargoDelivered.");
    expect(run().pendingCargoBark).toBe(false);
  });

  it("drops from the hold, forfeits the payout and ends the drawback", () => {
    expect(takeCargo("unstableCore")).toBe(true);
    expect(cargoSlotTier(held()).reactor).toBe(-1);
    const before = run().scrap;
    expect(dropCargo("unstableCore")).toBe(true);
    expect(held()).toHaveLength(0);
    expect(cargoSlotTier(held()).reactor).toBeUndefined();
    expect(run().scrap).toBe(before);
    expect(cargoSteps()).toContain("dropped");
    expect(feedKeys()).toContain("run:cargo.dropped");
    expect(dropCargo("unstableCore")).toBe(false);
  });

  it("charges the per-node hull cost at the node boundary and never to zero", () => {
    const edge = must(plainEdge(liveMap()), "no edge into a plain fight");
    standAt(edge.from);
    loadHold("liveHold", edge.to.id);
    useRunStore.setState({ hull: 20, hullMax: 30 });
    completeNode({ outcome: "cleared" });
    expect(run().hull).toBe(18);
    useRunStore.setState({ hull: 1 });
    completeNode({ outcome: "cleared" });
    expect(run().hull).toBe(1);
  });

  it("charges the per-node hull cost on a fight node the battle resolves", () => {
    const edge = must(plainEdge(liveMap()), "no edge into a plain fight");
    const station = must(stationEdge(liveMap()), "no edge into a station");
    standAt(edge.to);
    loadHold("liveHold", station.station.id);
    useRunStore.setState({ hull: 20, hullMax: 30 });
    useBattleStore.setState({
      outcome: "victory",
      enemies: [],
      turn: 1,
      hull: 17,
    });
    resolveRunBattle();
    expect(run().hull).toBe(15);
  });

  it("leaves a fight node's survivor at one hull instead of killing them", () => {
    const edge = must(plainEdge(liveMap()), "no edge into a plain fight");
    const station = must(stationEdge(liveMap()), "no edge into a station");
    standAt(edge.to);
    loadHold("liveHold", station.station.id);
    useRunStore.setState({ hull: 20, hullMax: 30 });
    useBattleStore.setState({
      outcome: "victory",
      enemies: [],
      turn: 1,
      hull: 1,
    });
    resolveRunBattle();
    expect(run().hull).toBe(1);
  });

  it("counts the rows left from the ship's own row", () => {
    expect(takeCargo("stasisPods")).toBe(true);
    const entry = must(held()[0], "the hold stayed empty");
    const map = liveMap();
    const node = must(
      map.nodes.find((candidate) => candidate.id === entry.nodeId),
      "the mark names no node",
    );
    expect(cargoRowsLeft(map, entry, 0)).toBe(node.row);
    expect(cargoRowsLeft(map, entry, node.row)).toBe(0);
  });

  it("promises no ending for a drawback already spent at pickup", () => {
    const before = run().axis;
    expect(takeCargo("choirContraband")).toBe(true);
    const moved = run().axis;
    expect(moved).toBe(before - 3);
    expect(dropCargo("choirContraband")).toBe(true);
    expect(run().axis).toBe(moved);
    expect(feedKeys()).toContain("run:cargo.droppedAxis");
    expect(feedKeys()).not.toContain("run:cargo.dropped");
  });

  it("moves the axis once on pickup and never again", () => {
    const before = run().axis;
    expect(takeCargo("choirContraband")).toBe(true);
    expect(run().axis).toBe(before - 3);
    const after = run().axis;
    const next = must(openStep(liveMap(), START_NODE_ID), "no open step");
    expect(jumpTo(next)).toBe(true);
    expect(run().axis).toBe(after);
  });
});

describe("the hold across a save", () => {
  it("restores a v13 snapshot with an empty hold", () => {
    expect(RUN_SNAPSHOT_ACCEPTED).toContain(13);
    expect(takeCargo("stasisPods")).toBe(true);
    const snapshot = captureRunSnapshot();
    const stripped = Object.fromEntries(
      Object.entries(snapshot.run).filter(
        ([key]) => key !== "cargo" && key !== "pendingCargoBark",
      ),
    ) as unknown as RunValues;
    const old: RunSnapshotV1 = { ...snapshot, v: 13, run: stripped };
    useRunStore.getState().reset();
    expect(restoreRunSnapshot(old)).toBe(true);
    expect(useRunStore.getState().cargo).toEqual([]);
    expect(useRunStore.getState().pendingCargoBark).toBe(false);
    expect(useRunStore.getState().scrap).toBe(snapshot.run.scrap);
  });

  it("carries the hold and its mark through a round trip", () => {
    expect(takeCargo("stasisPods")).toBe(true);
    const target = must(held()[0], "the hold stayed empty").nodeId;
    const snapshot = captureRunSnapshot();
    useRunStore.getState().reset();
    expect(restoreRunSnapshot(snapshot)).toBe(true);
    expect(useRunStore.getState().cargo[0]?.nodeId).toBe(target);
  });
});
