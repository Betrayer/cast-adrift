import type { FeatureId } from "@/data/unlocks";
import type { SlotId, SlotState } from "@/types/battle";
import type { LocKey } from "@/types/content";

export type ShipId =
  | "wanderer"
  | "ram"
  | "ark"
  | "corsair"
  | "foundry"
  | "prism"
  | "ram-proto";

export type ShipPassive =
  | { kind: "scrapper"; scrap: number }
  | { kind: "overload"; hullCost: number }
  | { kind: "bulwark"; keepPct: number }
  | {
      kind: "afterburner";
      weapons: number;
      cap: number;
      evasionDelta: number;
      dodgeCap: number;
      glancingCap: number;
      dodgePerValue: number;
      glancingPerValue: number;
    }
  | { kind: "annealer"; tierStep: number }
  | { kind: "refractor"; censusMult: number };

export interface ShipDef {
  id: ShipId;
  name: LocKey;
  passiveName?: LocKey;
  passiveDesc?: LocKey;
  hullMax: number;
  slots: Partial<Record<SlotId, Omit<SlotState, "dieUid">>>;
  passive?: ShipPassive;
  price: number;
  unlock?: FeatureId;
  debug?: boolean;
}

export const SHIPS: readonly ShipDef[] = [
  {
    id: "wanderer",
    name: "content:ships.wanderer.name",
    passiveName: "content:ships.wanderer.passiveName",
    passiveDesc: "content:ships.wanderer.passiveDesc",
    hullMax: 30,
    price: 0,
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
    name: "content:ships.ram.name",
    passiveName: "content:ships.ram.passiveName",
    passiveDesc: "content:ships.ram.passiveDesc",
    hullMax: 34,
    price: 800,
    unlock: "shipRam",
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
    name: "content:ships.ark.name",
    passiveName: "content:ships.ark.passiveName",
    passiveDesc: "content:ships.ark.passiveDesc",
    hullMax: 28,
    price: 1500,
    unlock: "shipArk",
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
    id: "corsair",
    name: "content:ships.corsair.name",
    passiveName: "content:ships.corsair.passiveName",
    passiveDesc: "content:ships.corsair.passiveDesc",
    hullMax: 30,
    price: 2200,
    unlock: "shipCorsair",
    passive: {
      kind: "afterburner",
      weapons: 1,
      cap: 2,
      evasionDelta: 8,
      dodgeCap: 40,
      glancingCap: 55,
      dodgePerValue: 4.5,
      glancingPerValue: 7.5,
    },
    slots: {
      weaponA: { cap: 8, mk: 1 },
      weaponB: { cap: 8, mk: 1 },
      engines: { cap: 6, mk: 1 },
      enginesB: { cap: 6, mk: 1 },
      sensors: { cap: 6, mk: 1 },
      reactor: { cap: 10, mk: 1 },
    },
  },
  {
    id: "foundry",
    name: "content:ships.foundry.name",
    passiveName: "content:ships.foundry.passiveName",
    passiveDesc: "content:ships.foundry.passiveDesc",
    hullMax: 32,
    price: 2600,
    unlock: "shipFoundry",
    passive: { kind: "annealer", tierStep: 1 },
    slots: {
      weaponA: { cap: 8, mk: 1 },
      weaponB: { cap: 8, mk: 1 },
      shields: { cap: 8, mk: 1 },
      engines: { cap: 6, mk: 1 },
      reactor: { cap: 12, mk: 1 },
    },
  },
  {
    id: "prism",
    name: "content:ships.prism.name",
    passiveName: "content:ships.prism.passiveName",
    passiveDesc: "content:ships.prism.passiveDesc",
    hullMax: 28,
    price: 2400,
    unlock: "shipPrism",
    passive: { kind: "refractor", censusMult: 2 },
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
    name: "content:ships.ram-proto.name",
    hullMax: 30,
    price: 0,
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

export const shipTextIssues = (defs: readonly ShipDef[]): string[] => {
  const out: string[] = [];
  for (const def of defs) {
    if (def.passive === undefined) continue;
    if (def.passiveName === undefined || def.passiveDesc === undefined) {
      out.push(
        `ships: "${def.id}" carries a ${def.passive.kind} passive with no authored text`,
      );
    }
  }
  return out;
};
