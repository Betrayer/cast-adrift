import { sectorDef, type SectorMotif } from "@/data/sectors";
import { applyEventEffects } from "@/game/events/apply";
import { edgeMarkFor, type MapGraph, type MapNode, type NodeId } from "@/game/map/types";
import { createStream, deriveSeed } from "@/services/rng";
import { useNarrativeStore } from "@/stores/narrativeStore";
import { useRunStore } from "@/stores/runStore";
import type { LocKey } from "@/types/content";
import type { EventEffect } from "@/types/events";

export const MOTIF_CONSEQUENCE: Readonly<Record<string, LocKey>> = {
  cache: "run:motif.cache",
  mine: "run:motif.mine",
  blessed: "run:motif.blessed",
  cursed: "run:motif.cursed",
};

const motifOf = <K extends SectorMotif["m"]>(
  sector: number,
  kind: K,
): Extract<SectorMotif, { m: K }> | undefined =>
  sectorDef(sector).shape.motifs.find(
    (motif): motif is Extract<SectorMotif, { m: K }> => motif.m === kind,
  );

const survivable = (
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
  if (line !== undefined) useNarrativeStore.getState().pushConsequence(line);
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
