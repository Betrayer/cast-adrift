import { sectorMotif } from "@/data/sectors";
import { applyEventEffects } from "@/game/events/apply";
import { edgeMarkFor, type MapGraph, type MapNode, type NodeId } from "@/game/map/types";
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
  const motif = sectorMotif(sector, "mineEdges");
  if (motif === undefined) return;
  fire(motif.toll, "mine", `mine:${from}:${to}`);
};

export const bypassPctFor = (sector: number): number =>
  sectorMotif(sector, "blackHoles")?.bypassPct ?? 0;

export const holeTollFor = (sector: number, hullMax: number): number => {
  const pct = bypassPctFor(sector);
  return pct <= 0 ? 0 : Math.ceil(Math.max(0, hullMax) * pct);
};

export const bypassLethal = (hull: number, toll: number): boolean =>
  toll > 0 && hull <= toll;

export const disintegrationPctFor = (sector: number): number =>
  sectorMotif(sector, "blackHoles")?.disintegrationPct ?? 0;

export const applyHoleToll = (
  sector: number,
  from: NodeId,
  hole: NodeId,
): number | null => {
  const run = useRunStore.getState();
  const cost = holeTollFor(sector, run.hullMax);
  if (bypassLethal(run.hull, cost)) return null;
  if (cost <= 0) return 0;
  fire([{ k: "hull", n: -cost }], "bypass", `bypass:${from}:${hole}`);
  return cost;
};

export const applyNodeMotifs = (node: MapNode, sector: number): void => {
  if (node.cache === true) {
    const motif = sectorMotif(sector, "cache");
    if (motif !== undefined) fire(motif.gain, "cache", `cache:${node.id}`);
  }
  if (node.blessing !== undefined) {
    const motif = sectorMotif(sector, "procession");
    if (motif !== undefined) {
      fire(
        node.blessing === "blessed" ? motif.blessed : motif.cursed,
        node.blessing,
        `procession:${node.id}`,
      );
    }
  }
};
