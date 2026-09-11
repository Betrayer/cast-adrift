import {
  CARGO,
  CARGO_PREFER_ROWS,
  cargoAxisShift,
  cargoChargeCapDelta,
  cargoDef,
  cargoHullPerNode,
  cargoPayout,
  cargoSlotTierDelta,
  type CargoDef,
} from "@/data/cargo";
import { sectorDef } from "@/data/sectors";
import { SHIP_BY_ID, type ShipId } from "@/data/ships";
import { forwardReach, forwardStations } from "@/game/map/reach";
import type { MapGraph, MapNode, NodeId } from "@/game/map/types";
import { applyEventEffects } from "@/game/events/apply";
import { applyAxisDelta, logConsequence, logJournal } from "@/game/run/journal";
import { survivable } from "@/game/run/motifs";
import { createStream, deriveSeed, type RngStream } from "@/services/rng";
import { runCargoHold, useRunStore, type RunCargo } from "@/stores/runStore";
import type { LocKey, SlotId } from "@/types/content";

interface CargoLines {
  delivered: LocKey;
  dropped: LocKey;
  droppedAxis: LocKey;
  lapsed: LocKey;
  moved: LocKey;
  stranded: LocKey;
}

export const CARGO_LINE: CargoLines = {
  delivered: "run:cargo.delivered",
  dropped: "run:cargo.dropped",
  droppedAxis: "run:cargo.droppedAxis",
  lapsed: "run:cargo.lapsed",
  moved: "run:cargo.moved",
  stranded: "run:cargo.stranded",
};

export interface CargoTarget {
  nodeId: NodeId;
  rows: number;
}

const preferred = (target: CargoTarget): boolean =>
  target.rows >= CARGO_PREFER_ROWS[0] && target.rows <= CARGO_PREFER_ROWS[1];

export const deliveryCandidates = (
  map: MapGraph,
  from: NodeId,
  visited: readonly NodeId[],
): readonly CargoTarget[] =>
  forwardStations(map, from, visited).map((step) => ({
    nodeId: step.node.id,
    rows: step.rows,
  }));

const rank = (
  open: readonly CargoTarget[],
  taken: readonly NodeId[],
): readonly CargoTarget[] => {
  const free = open.filter((target) => !taken.includes(target.nodeId));
  return free.length > 0 ? free : open;
};

export const pickDeliveryTarget = (
  map: MapGraph,
  from: NodeId,
  visited: readonly NodeId[],
  taken: readonly NodeId[] = [],
): CargoTarget | null => {
  const pool = rank(deliveryCandidates(map, from, visited), taken);
  return pool.find(preferred) ?? pool[0] ?? null;
};

export const nearestDeliveryTarget = (
  map: MapGraph,
  from: NodeId,
  visited: readonly NodeId[],
  taken: readonly NodeId[] = [],
): CargoTarget | null =>
  rank(deliveryCandidates(map, from, visited), taken)[0] ?? null;

export interface CargoReanchor {
  cargo: RunCargo[];
  moved: RunCargo[];
  lapsed: RunCargo[];
}

export const reanchorCargo = (
  held: readonly RunCargo[],
  map: MapGraph,
  from: NodeId,
  visited: readonly NodeId[],
  sectorIndex: number,
): CargoReanchor => {
  const out: CargoReanchor = { cargo: [], moved: [], lapsed: [] };
  if (held.length === 0) return out;
  const reach = forwardReach(map, from, visited);
  for (const entry of held) {
    if (entry.sectorIndex !== sectorIndex) {
      out.lapsed.push(entry);
      continue;
    }
    if (reach.has(entry.nodeId)) {
      out.cargo.push(entry);
      continue;
    }
    const target = nearestDeliveryTarget(
      map,
      from,
      visited,
      out.cargo.map((kept) => kept.nodeId),
    );
    if (target === null) {
      out.lapsed.push(entry);
      continue;
    }
    const moved = { ...entry, nodeId: target.nodeId };
    out.cargo.push(moved);
    out.moved.push(moved);
  }
  return out;
};

export const cargoRowsLeft = (
  map: MapGraph,
  entry: RunCargo,
  positionRow: number,
): number => {
  const node = map.nodes.find((candidate) => candidate.id === entry.nodeId);
  return node === undefined ? 0 : Math.max(0, node.row - positionRow);
};

export const heldCargoDefs = (held: readonly RunCargo[]): readonly CargoDef[] =>
  held.flatMap((entry) => {
    const def = cargoDef(entry.defId);
    return def === undefined ? [] : [def];
  });

export const cargoSlotTier = (
  held: readonly RunCargo[],
): Partial<Record<SlotId, number>> => {
  const out: Partial<Record<SlotId, number>> = {};
  for (const def of heldCargoDefs(held)) {
    for (const [slot, delta] of Object.entries(cargoSlotTierDelta(def))) {
      const key = slot as SlotId;
      out[key] = (out[key] ?? 0) + delta;
    }
  }
  return out;
};

export const cargoChargeCap = (held: readonly RunCargo[]): number =>
  heldCargoDefs(held).reduce((sum, def) => sum + cargoChargeCapDelta(def), 0);

export const cargoNodeHull = (held: readonly RunCargo[]): number =>
  heldCargoDefs(held).reduce((sum, def) => sum + cargoHullPerNode(def), 0);

export const cargoDrawbackLands = (def: CargoDef, shipId: ShipId): boolean => {
  const ship = SHIP_BY_ID.get(shipId);
  return Object.keys(cargoSlotTierDelta(def)).every(
    (slot) => ship?.slots[slot as SlotId] !== undefined,
  );
};

export const cargoOfferable = (defId: string): boolean => {
  const run = useRunStore.getState();
  if (!run.active || run.map === null || run.position === null) return false;
  const def = cargoDef(defId);
  if (def === undefined) return false;
  if (!cargoDrawbackLands(def, run.shipId)) return false;
  if (run.cargo.some((held) => held.defId === defId)) return false;
  if (run.cargo.length >= runCargoHold(run)) return false;
  return deliveryCandidates(run.map, run.position, run.visited).length > 0;
};

export const offeredCargo = (
  stream: RngStream,
  hold: number,
  held: readonly string[],
): string | null => {
  if (held.length >= hold) return null;
  const pool = CARGO.filter((def) => !held.includes(def.id));
  if (pool.length === 0) return null;
  return stream.weighted(pool.map((def) => [def.id, def.weight] as const));
};

export const takeCargo = (defId: string): boolean => {
  if (!cargoOfferable(defId)) return false;
  const run = useRunStore.getState();
  const def = cargoDef(defId);
  if (run.map === null || run.position === null || def === undefined)
    return false;
  const target = pickDeliveryTarget(
    run.map,
    run.position,
    run.visited,
    run.cargo.map((held) => held.nodeId),
  );
  if (target === null) return false;
  const positionRow =
    run.map.nodes.find((node) => node.id === run.position)?.row ?? run.depthRow;
  const added = useRunStore.getState().addCargo({
    defId,
    nodeId: target.nodeId,
    sectorIndex: run.sectorIndex,
    takenRow: positionRow,
  });
  if (!added) return false;
  logJournal({ k: "cargo", step: "taken", cargo: defId, n: target.rows });
  applyAxisDelta(cargoAxisShift(def), "choice");
  return true;
};

export const dropCargo = (defId: string): boolean => {
  const run = useRunStore.getState();
  if (!run.cargo.some((held) => held.defId === defId)) return false;
  const def = cargoDef(defId);
  useRunStore.getState().removeCargo(defId);
  logJournal({ k: "cargo", step: "dropped", cargo: defId, n: 0 });
  logConsequence(
    def?.drawback === "axisShift" ? CARGO_LINE.droppedAxis : CARGO_LINE.dropped,
  );
  return true;
};

export const lapseCargo = (): number => {
  const held = useRunStore.getState().cargo;
  if (held.length === 0) return 0;
  for (const entry of held) {
    logJournal({ k: "cargo", step: "lapsed", cargo: entry.defId, n: 0 });
  }
  useRunStore.setState({ cargo: [] });
  logConsequence(CARGO_LINE.lapsed);
  return held.length;
};

export const releaseCargo = (): void => {
  useRunStore.setState({ cargo: [], pendingCargoBark: false });
};

export const announceReanchor = (settled: CargoReanchor): void => {
  for (const entry of settled.moved) {
    logJournal({ k: "cargo", step: "moved", cargo: entry.defId, n: 0 });
  }
  for (const entry of settled.lapsed) {
    logJournal({ k: "cargo", step: "lapsed", cargo: entry.defId, n: 0 });
  }
  if (settled.lapsed.length > 0) {
    logConsequence(CARGO_LINE.stranded);
    return;
  }
  if (settled.moved.length > 0) logConsequence(CARGO_LINE.moved);
};

export const cargoNodeToll = (node: MapNode): number => {
  const run = useRunStore.getState();
  const cost = cargoNodeHull(run.cargo);
  if (cost <= 0) return 0;
  applyEventEffects(
    survivable([{ k: "hull", n: -cost }], run.hull),
    createStream(deriveSeed(run.seed, `cargo:${node.id}`)),
  );
  return cost;
};

export const deliverCargo = (node: MapNode): number => {
  const run = useRunStore.getState();
  const due = run.cargo.filter(
    (held) => held.nodeId === node.id && held.sectorIndex === run.sectorIndex,
  );
  if (due.length === 0) return 0;
  const mult = sectorDef(run.sector).scrapMult;
  let paid = 0;
  for (const entry of due) {
    const def = cargoDef(entry.defId);
    if (def === undefined) continue;
    const scrap = cargoPayout(def, mult);
    useRunStore.getState().removeCargo(entry.defId);
    useRunStore.getState().addScrap(scrap);
    logJournal({ k: "cargo", step: "delivered", cargo: entry.defId, n: scrap });
    paid += scrap;
  }
  if (paid > 0) {
    useRunStore.getState().setCargoBark(true);
    logConsequence(CARGO_LINE.delivered);
  }
  return paid;
};

export const spendCargoBark = (): boolean => {
  if (!useRunStore.getState().pendingCargoBark) return false;
  useRunStore.getState().setCargoBark(false);
  return true;
};
