import { BEACON_EVENTS } from "@/data/events/beacons";
import { COMMON_EVENTS } from "@/data/events/common";
import { PHASE10_COMMON_EVENTS } from "@/data/events/phase10Common";
import { SECTOR1_EVENTS } from "@/data/events/sector1";
import { SECTOR2_EVENTS } from "@/data/events/sector2";
import { SECTOR3_EVENTS } from "@/data/events/sector3";
import { SECTOR4_EVENTS } from "@/data/events/sector4";
import { SECTOR5_EVENTS } from "@/data/events/sector5";
import type { EventDef } from "@/types/events";

export const ALL_EVENTS: readonly EventDef[] = [
  ...SECTOR1_EVENTS,
  ...SECTOR2_EVENTS,
  ...SECTOR3_EVENTS,
  ...SECTOR4_EVENTS,
  ...SECTOR5_EVENTS,
  ...COMMON_EVENTS,
  ...PHASE10_COMMON_EVENTS,
  ...BEACON_EVENTS,
];

export const EVENT_BY_ID: ReadonlyMap<string, EventDef> = new Map(
  ALL_EVENTS.map((e) => [e.id, e]),
);

export { SECTOR1_EVENTS } from "@/data/events/sector1";
export { SECTOR2_EVENTS } from "@/data/events/sector2";
export { SECTOR3_EVENTS } from "@/data/events/sector3";
export { SECTOR4_EVENTS } from "@/data/events/sector4";
export { SECTOR5_EVENTS } from "@/data/events/sector5";
export { PHASE10_COMMON_EVENTS } from "@/data/events/phase10Common";
export { COMMON_EVENTS } from "@/data/events/common";
export { BEACON_EVENTS, BEACON_FLAGS, beaconsResolved } from "@/data/events/beacons";
