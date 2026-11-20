import { ALL_EVENTS, EVENT_BY_ID } from "@/data/events";
import { pickEvent, type EventContext } from "@/game/events/engine";
import { eventPickSeed } from "@/game/narrative/chainMarkers";
import { createStream, deriveSeed } from "@/services/rng";
import { useRunStore, type EventRunState } from "@/stores/runStore";
import type { EventDef, EventKind, ForcedBattle } from "@/types/events";

export interface EventStreams {
  outcome: ReturnType<typeof createStream>;
  check: ReturnType<typeof createStream>;
  loot: ReturnType<typeof createStream>;
}

export interface Resolved {
  nodeId: string;
  event: EventDef | null;
  streams: EventStreams;
  replay: EventRunState | null;
}

const buildStreams = (seed: number, key: string): EventStreams => ({
  outcome: createStream(deriveSeed(seed, `evout:${key}`)),
  check: createStream(deriveSeed(seed, `evcheck:${key}`)),
  loot: createStream(deriveSeed(seed, `evloot:${key}`)),
});

export const resolveEventForNode = (
  nodeId: string,
  kind: EventKind,
  forcedId?: string,
): Resolved => {
  const s = useRunStore.getState();
  if (forcedId !== undefined) {
    return {
      nodeId: `dbg:${forcedId}`,
      event: EVENT_BY_ID.get(forcedId) ?? null,
      streams: buildStreams(s.seed, `dbg:${forcedId}`),
      replay: null,
    };
  }
  const replay = s.eventRuns?.[nodeId] ?? null;
  if (replay !== null) {
    return {
      nodeId,
      event: EVENT_BY_ID.get(replay.eventId) ?? null,
      streams: buildStreams(s.seed, nodeId),
      replay,
    };
  }
  const pickStream = createStream(eventPickSeed(s.seed, nodeId));
  const ctx: EventContext = {
    sector: s.sector,
    axis: s.axis,
    flags: s.flags,
    seenEvents: s.seenEvents,
  };
  const event = pickEvent(ALL_EVENTS, ctx, kind, pickStream);
  return { nodeId, event, streams: buildStreams(s.seed, nodeId), replay: null };
};

export type EventExit = "death" | "battle" | "map" | "complete";

export const eventExit = (
  hull: number,
  follow: ForcedBattle | null,
  forced: boolean,
): EventExit => {
  if (hull <= 0) return "death";
  if (follow !== null) return "battle";
  if (forced) return "map";
  return "complete";
};
