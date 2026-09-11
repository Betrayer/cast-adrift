import { sectorDef, type SectorMotif } from "@/data/sectors";
import { applyEventEffects } from "@/game/events/apply";
import { edgeMarkFor, type MapGraph, type MapNode, type NodeId } from "@/game/map/types";
import { bypassIsLateral } from "@/game/map/wormhole";
import { createStream, deriveSeed } from "@/services/rng";
import { logConsequence } from "@/game/run/journal";
import { useRunStore } from "@/stores/runStore";
import type { LocKey } from "@/types/content";
import type { EventEffect } from "@/types/events";

export const MOTIF_CONSEQUENCE: Readonly<Record<string, LocKey>> = {
  cache: "run:motif.cache",
  mine: "run:motif.mine",
  blessed: "run:motif.blessed",
  cursed: "run:motif.cursed",
  bypass: "run:motif.bypass",
};

const motifOf = <K extends SectorMotif["m"]>(
  sector: number,
  kind: K,
): Extract<SectorMotif, { m: K }> | undefined =>
  sectorDef(sector).shape.motifs.find(
    (motif): motif is Extract<SectorMotif, { m: K }> => motif.m === kind,
  );

export const survivable = (
  effects: readonly EventEffect[],
  hull: number,
): readonly EventEffect[] =>
  effects.map((effect) =>
    effect.k === "hull" && effect.n < 0
      ? { ...effect, n: Math.max(effect.n, -(hull - 1)) }
      : effect,
  );

const fire = (
  effects: readonly EventEffect[],
  key: string,
  streamKey: string,
): void => {
  if (effects.length === 0) return;
  const run = useRunStore.getState();
  applyEventEffects(
    survivable(effects, run.hull),
    createStream(deriveSeed(run.seed, streamKey)),
  );
  const line = MOTIF_CONSEQUENCE[key];
  if (line !== undefined) logConsequence(line);
};

export const applyEdgeMotifs = (
  map: MapGraph,
  from: NodeId,
  to: NodeId,
  sector: number,
): void => {
  if (edgeMarkFor(map, from, to) !== "mine") return;
  const motif = motifOf(sector, "mineEdges");
  if (motif === undefined) return;
  fire(motif.toll, "mine", `mine:${from}:${to}`);
};

export const holeTollFor = (sector: number, hull: number): number => {
  const motif = motifOf(sector, "blackHoles");
  if (motif === undefined) return 0;
  const toll = motif.toll.reduce(
    (sum, effect) => (effect.k === "hull" && effect.n < 0 ? sum - effect.n : sum),
    0,
  );
  return hull <= toll ? 0 : toll;
};

export const disintegrationPctFor = (sector: number): number =>
  motifOf(sector, "blackHoles")?.disintegrationPct ?? 0;

export const holeTollWaived = (
  map: MapGraph | null,
  from: NodeId,
  hole: NodeId,
  visited: readonly NodeId[],
): boolean => map !== null && !bypassIsLateral(map, from, hole, visited);

export const applyHoleToll = (
  sector: number,
  from: NodeId,
  hole: NodeId,
): number => {
  const run = useRunStore.getState();
  if (holeTollWaived(run.map, from, hole, run.visited)) {
    logConsequence("run:motif.holeDrift");
    return 0;
  }
  const cost = holeTollFor(sector, run.hull);
  if (cost <= 0) {
    logConsequence("run:motif.holeScorch");
    return 0;
  }
  fire([{ k: "hull", n: -cost }], "bypass", `bypass:${from}:${hole}`);
  return cost;
};

export const applyNodeMotifs = (node: MapNode, sector: number): void => {
  if (node.cache === true) {
    const motif = motifOf(sector, "cache");
    if (motif !== undefined) fire(motif.gain, "cache", `cache:${node.id}`);
  }
  if (node.blessing !== undefined) {
    const motif = motifOf(sector, "procession");
    if (motif !== undefined) {
      fire(
        node.blessing === "blessed" ? motif.blessed : motif.cursed,
        node.blessing,
        `procession:${node.id}`,
      );
    }
  }
};
