import type { SlotId, SlotState } from "@/types/battle";
import type { LocKey } from "@/types/content";

export type ShipId = "wanderer" | "ram-proto";

export interface ShipDef {
  id: ShipId;
  name: LocKey;
  hullMax: number;
  slots: Partial<Record<SlotId, Omit<SlotState, "dieUid">>>;
  debug?: boolean;
}

export const SHIPS: readonly ShipDef[] = [
  {
    id: "wanderer",
    name: "content:ships.wanderer",
    hullMax: 30,
    slots: {
      weaponA: { cap: 8, mk: 1 },
      weaponB: { cap: 8, mk: 1 },
      shields: { cap: 8, mk: 1 },
      engines: { cap: 6, mk: 1 },
      sensors: { cap: 6, mk: 1 },
      reactor: { cap: 10, mk: 1 },
    },
  },
  {
    id: "ram-proto",
    name: "content:ships.ram-proto",
    hullMax: 30,
    debug: true,
    slots: {
      spinal: { cap: 20, mk: 1, jamOn: 4 },
      shields: { cap: 8, mk: 1 },
      reactor: { cap: 10, mk: 1 },
    },
  },
];

export const SHIP_BY_ID: ReadonlyMap<ShipId, ShipDef> = new Map(
  SHIPS.map((def) => [def.id, def]),
);
