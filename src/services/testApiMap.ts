import {
  areConnected,
  bandOf,
  edgeKey,
  nodeById,
} from "@/game/map/types";
import { farRimRowFor, MAX_EXTRA_ROWS } from "@/game/map/wormhole";
import { cargoRowsLeft } from "@/game/run/cargo";
import { openWormhole, rideWormhole } from "@/game/run/flow";
import type { TestApi } from "@/services/testApi";
import { useAppStore } from "@/stores/appStore";
import { useRunStore } from "@/stores/runStore";

export const mapProbes = (): Pick<
  TestApi,
  | "mapNodes"
  | "standAt"
  | "cargo"
  | "deliveryApproach"
  | "holes"
  | "spots"
  | "band"
  | "landings"
  | "ride"
  | "rideOutcome"
> => ({
  mapNodes: () => {
    const run = useRunStore.getState();
    const map = run.map;
    if (map === null) return [];
    const outgoing = new Set(
      map.edges
        .filter(([a]) => a === run.position)
        .map(([, b]) => b),
    );
    return map.nodes.map((node) => {
      const record =
        run.position === null
          ? undefined
          : map.wormholes[edgeKey(run.position, node.id)];
      return {
        id: node.id,
        type: node.type,
        row: node.row,
        lane: node.lane,
        visited: run.visited.includes(node.id),
        reachable: outgoing.has(node.id) && !run.visited.includes(node.id),
        hole: node.hole === true,
        pocket: node.pocket === true,
        spot: node.spot ?? null,
        wormhole: record !== undefined,
        bypass: record?.bypass ?? null,
      };
    });
  },

  standAt: (nodeId) => {
    const run = useRunStore.getState();
    const node = run.map === null ? undefined : nodeById(run.map).get(nodeId);
    if (node === undefined) return false;
    useRunStore.setState({
      position: nodeId,
      depthRow: node.row,
      pendingWormhole: null,
    });
    useAppStore.getState().go("map");
    return true;
  },

  cargo: () => {
    const run = useRunStore.getState();
    if (run.map === null) return [];
    const map = run.map;
    const row =
      run.position === null
        ? run.depthRow
        : (nodeById(map).get(run.position)?.row ?? run.depthRow);
    return run.cargo.map((entry) => ({
      defId: entry.defId,
      nodeId: entry.nodeId,
      sectorIndex: entry.sectorIndex,
      rows: cargoRowsLeft(map, entry, row),
    }));
  },

  deliveryApproach: (nodeId) => {
    const run = useRunStore.getState();
    if (run.map === null) return null;
    const map = run.map;
    const from = map.nodes.find(
      (node) =>
        !run.visited.includes(node.id) &&
        node.hole !== true &&
        areConnected(map, node.id, nodeId),
    );
    return from?.id ?? null;
  },

  holes: () => {
    const map = useRunStore.getState().map;
    if (map === null) return [];
    return Object.values(map.wormholes).map((record) => ({ ...record }));
  },

  spots: () => {
    const map = useRunStore.getState().map;
    if (map === null) return [];
    return map.spots.map((spot) => ({
      id: spot.id,
      nodes: [...spot.nodes],
      entries: Object.entries(map.wormholes)
        .filter(([, record]) => spot.nodes.includes(record.hole))
        .map(([key]) => key),
    }));
  },

  band: () => {
    const map = useRunStore.getState().map;
    const band = map === null ? null : bandOf(map);
    return band === null
      ? null
      : {
          rows: [band.rows[0], band.rows[1]],
          rim: [...band.rim],
          farRim: [...band.farRim],
        };
  },

  landings: (hole) => {
    const run = useRunStore.getState();
    if (run.map === null) return [];
    const base = farRimRowFor(run.map, hole);
    if (base === null) return [];
    const cleared = new Set(run.visited);
    return run.map.nodes
      .filter(
        (node) =>
          node.row >= base &&
          node.row <= base + MAX_EXTRA_ROWS &&
          node.pocket !== true &&
          node.hole !== true &&
          !cleared.has(node.id),
      )
      .map((node) => node.id);
  },

  ride: (holeId) => {
    openWormhole(holeId);
    const ride = rideWormhole(holeId, false);
    return ride === null || ride.kind === "fatal" ? null : ride.throw;
  },

  rideOutcome: (holeId) => {
    openWormhole(holeId);
    const ride = rideWormhole(holeId, false);
    return ride === null ? "refused" : ride.kind;
  },
});
