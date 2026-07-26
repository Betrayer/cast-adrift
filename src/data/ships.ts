import type { SlotId, SlotState } from "@/types/battle";
import type { LocKey } from "@/types/content";

export type ShipId = "wanderer" | "ram" | "ark" | "ram-proto";

export type ShipPassive =
  | { kind: "scrapper"; scrap: number }
  | { kind: "overload"; hullCost: number }
  | { kind: "bulwark"; keepPct: number };

export interface ShipDef {
  id: ShipId;
  name: LocKey;
  hullMax: number;
  slots: Partial<Record<SlotId, Omit<SlotState, "dieUid">>>;
  passive?: ShipPassive;
  price: number;
  unlockLevel: number;
  debug?: boolean;
}

export const SHIPS: readonly ShipDef[] = [
  {
    id: "wanderer",
    name: "content:ships.wanderer",
    hullMax: 30,
    price: 0,
    unlockLevel: 1,
    passive: { kind: "scrapper", scrap: 2 },
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
    id: "ram",
    name: "content:ships.ram",
    hullMax: 34,
    price: 800,
    unlockLevel: 10,
    passive: { kind: "overload", hullCost: 2 },
    slots: {
      weaponA: { cap: 8, mk: 1 },
      weaponB: { cap: 8, mk: 1 },
      spinal: { cap: 20, mk: 1, jamOn: 4 },
      shields: { cap: 8, mk: 1 },
      engines: { cap: 6, mk: 1 },
      reactor: { cap: 10, mk: 1 },
    },
  },
  {
    id: "ark",
    name: "content:ships.ark",
    hullMax: 28,
    price: 1500,
    unlockLevel: 25,
    passive: { kind: "bulwark", keepPct: 25 },
    slots: {
      weaponA: { cap: 8, mk: 1 },
      shields: { cap: 8, mk: 1 },
      shieldsB: { cap: 8, mk: 1 },
      engines: { cap: 6, mk: 1 },
      reactor: { cap: 10, mk: 1 },
      repairBay: { cap: 6, mk: 1 },
    },
  },
  {
    id: "ram-proto",
    name: "content:ships.ram-proto",
    hullMax: 30,
    price: 0,
    unlockLevel: 1,
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

export const PLAYABLE_SHIPS: readonly ShipDef[] = SHIPS.filter(
  (s) => s.debug !== true,
);

export const shipHasPassive = (
  shipId: ShipId,
  kind: ShipPassive["kind"],
): boolean => SHIP_BY_ID.get(shipId)?.passive?.kind === kind;
