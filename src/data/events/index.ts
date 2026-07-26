import { BEACON_EVENTS } from "@/data/events/beacons";
import { COMMON_EVENTS } from "@/data/events/common";
import { SECTOR1_EVENTS } from "@/data/events/sector1";
import type { EventDef } from "@/types/events";

export const ALL_EVENTS: readonly EventDef[] = [
  ...SECTOR1_EVENTS,
  ...COMMON_EVENTS,
  ...BEACON_EVENTS,
];

export const EVENT_BY_ID: ReadonlyMap<string, EventDef> = new Map(
  ALL_EVENTS.map((e) => [e.id, e]),
);

export { SECTOR1_EVENTS } from "@/data/events/sector1";
export { COMMON_EVENTS } from "@/data/events/common";
export { BEACON_EVENTS, BEACON_FLAGS, beaconsResolved } from "@/data/events/beacons";
