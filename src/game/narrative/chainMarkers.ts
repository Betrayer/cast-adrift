import { ALL_EVENTS } from "@/data/events";
import { liveChainEvents } from "@/data/narrative/chains";
import { pickEvent, type EventContext } from "@/game/events/engine";
import type { MapGraph, NodeId } from "@/game/map/types";
import { createStream, deriveSeed } from "@/services/rng";

export const eventPickSeed = (seed: number, nodeId: NodeId): number =>
  deriveSeed(seed, `evpick:${nodeId}`);

export const chainMarkedNodes = (
  map: MapGraph,
  ctx: EventContext,
  seed: number,
): ReadonlySet<NodeId> => {
  const live = liveChainEvents(ctx.flags, ctx.sector);
  if (live.size === 0) return new Set<NodeId>();
  const out = new Set<NodeId>();
  for (const node of map.nodes) {
    if (node.type !== "event" && node.type !== "beacon") continue;
    const kind = node.type === "beacon" ? "beacon" : "event";
    const stream = createStream(eventPickSeed(seed, node.id));
    const picked = pickEvent(ALL_EVENTS, ctx, kind, stream);
    if (picked !== null && live.has(picked.id)) out.add(node.id);
  }
  return out;
};
