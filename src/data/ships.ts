import type { FeatureId } from "@/data/unlocks";
import type { SlotId, SlotState } from "@/types/battle";
import type { LocKey, School } from "@/types/content";

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

export type BridgeFrame =
  | "hard"
  | "chevron"
  | "round"
  | "sleek"
  | "forge"
  | "prism"
  | "raw";

export interface BridgeTheme {
  tint: School;
  frame: BridgeFrame;
}

export interface ShipDef {
  id: ShipId;
  name: LocKey;
  passiveName?: LocKey;
  passiveDesc?: LocKey;
  hullMax: number;
  slots: Partial<Record<SlotId, Omit<SlotState, "dieUid">>>;
  moduleSlots?: number;
  cargoHold: number;
  bridgeTheme: BridgeTheme;
  passive?: ShipPassive;
  passiveII?: ShipPassive;
  passiveIIName?: LocKey;
  passiveIIDesc?: LocKey;
  price: number;
  unlock?: FeatureId;
  debug?: boolean;
}

export const SHIPS: readonly ShipDef[] = [
  {
    id: "wanderer",
    cargoHold: 1,
    name: "content:ships.wanderer.name",
    passiveName: "content:ships.wanderer.passiveName",
    passiveDesc: "content:ships.wanderer.passiveDesc",
    hullMax: 30,
    price: 0,
    passive: { kind: "scrapper", scrap: 2 },
    passiveII: { kind: "scrapper", scrap: 3 },
    passiveIIName: "content:ships.wanderer.passiveIIName",
    passiveIIDesc: "content:ships.wanderer.passiveIIDesc",
    slots: {
      weaponA: { cap: 8, mk: 1 },
      weaponB: { cap: 8, mk: 1 },
      shields: { cap: 8, mk: 1 },
      engines: { cap: 6, mk: 1 },
      sensors: { cap: 6, mk: 1 },
      reactor: { cap: 10, mk: 1 },
    },
    bridgeTheme: {
      tint: "blue",
      frame: "hard",
    },
  },
  {
    id: "ram",
    cargoHold: 1,
    name: "content:ships.ram.name",
    passiveName: "content:ships.ram.passiveName",
    passiveDesc: "content:ships.ram.passiveDesc",
    hullMax: 34,
    price: 800,
    unlock: "shipRam",
    passive: { kind: "overload", hullCost: 2 },
    passiveII: { kind: "overload", hullCost: 1 },
    passiveIIName: "content:ships.ram.passiveIIName",
    passiveIIDesc: "content:ships.ram.passiveIIDesc",
    slots: {
      weaponA: { cap: 8, mk: 1 },
      weaponB: { cap: 8, mk: 1 },
      spinal: { cap: 20, mk: 1, jamOn: 4 },
      shields: { cap: 8, mk: 1 },
      engines: { cap: 6, mk: 1 },
      reactor: { cap: 10, mk: 1 },
    },
    bridgeTheme: {
      tint: "red",
      frame: "chevron",
    },
  },
  {
    id: "ark",
    cargoHold: 2,
    name: "content:ships.ark.name",
    passiveName: "content:ships.ark.passiveName",
    passiveDesc: "content:ships.ark.passiveDesc",
    hullMax: 28,
    price: 1500,
    unlock: "shipArk",
    passive: { kind: "bulwark", keepPct: 25 },
    passiveII: { kind: "bulwark", keepPct: 40 },
    passiveIIName: "content:ships.ark.passiveIIName",
    passiveIIDesc: "content:ships.ark.passiveIIDesc",
    slots: {
      weaponA: { cap: 8, mk: 1 },
      shields: { cap: 8, mk: 1 },
      shieldsB: { cap: 8, mk: 1 },
      engines: { cap: 6, mk: 1 },
      reactor: { cap: 10, mk: 1 },
      repairBay: { cap: 6, mk: 1 },
    },
    moduleSlots: 3,
    bridgeTheme: {
      tint: "green",
      frame: "round",
    },
  },
  {
    id: "corsair",
    cargoHold: 1,
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
      dodgeCap: 22,
      glancingCap: 38,
      dodgePerValue: 4.5,
      glancingPerValue: 7.5,
    },
    passiveII: {
      kind: "afterburner",
      weapons: 1,
      cap: 3,
      evasionDelta: 8,
      dodgeCap: 22,
      glancingCap: 38,
      dodgePerValue: 4.5,
      glancingPerValue: 7.5,
    },
    passiveIIName: "content:ships.corsair.passiveIIName",
    passiveIIDesc: "content:ships.corsair.passiveIIDesc",
    slots: {
      weaponA: { cap: 8, mk: 1 },
      weaponB: { cap: 8, mk: 1 },
      engines: { cap: 6, mk: 1 },
      enginesB: { cap: 6, mk: 1 },
      sensors: { cap: 6, mk: 1 },
      reactor: { cap: 10, mk: 1 },
    },
    bridgeTheme: {
      tint: "grey",
      frame: "sleek",
    },
  },
  {
    id: "foundry",
    cargoHold: 2,
    name: "content:ships.foundry.name",
    passiveName: "content:ships.foundry.passiveName",
    passiveDesc: "content:ships.foundry.passiveDesc",
    hullMax: 32,
    price: 2600,
    unlock: "shipFoundry",
    passive: { kind: "annealer", tierStep: 1 },
    passiveII: { kind: "annealer", tierStep: 2 },
    passiveIIName: "content:ships.foundry.passiveIIName",
    passiveIIDesc: "content:ships.foundry.passiveIIDesc",
    slots: {
      weaponA: { cap: 8, mk: 1 },
      weaponB: { cap: 8, mk: 1 },
      shields: { cap: 8, mk: 1 },
      engines: { cap: 6, mk: 1 },
      reactor: { cap: 12, mk: 1 },
    },
    moduleSlots: 3,
    bridgeTheme: {
      tint: "yellow",
      frame: "forge",
    },
  },
  {
    id: "prism",
    cargoHold: 1,
    name: "content:ships.prism.name",
    passiveName: "content:ships.prism.passiveName",
    passiveDesc: "content:ships.prism.passiveDesc",
    hullMax: 28,
    price: 2400,
    unlock: "shipPrism",
    passive: { kind: "refractor", censusMult: 2 },
    passiveII: { kind: "refractor", censusMult: 3 },
    passiveIIName: "content:ships.prism.passiveIIName",
    passiveIIDesc: "content:ships.prism.passiveIIDesc",
    slots: {
      weaponA: { cap: 8, mk: 1 },
      weaponB: { cap: 8, mk: 1 },
      shields: { cap: 8, mk: 1 },
      engines: { cap: 6, mk: 1 },
      sensors: { cap: 6, mk: 1 },
      reactor: { cap: 10, mk: 1 },
    },
    bridgeTheme: {
      tint: "prismatic",
      frame: "prism",
    },
  },
  {
    id: "ram-proto",
    cargoHold: 1,
    name: "content:ships.ram-proto.name",
    hullMax: 30,
    price: 0,
    debug: true,
    slots: {
      spinal: { cap: 20, mk: 1, jamOn: 4 },
      shields: { cap: 8, mk: 1 },
      reactor: { cap: 10, mk: 1 },
    },
    bridgeTheme: {
      tint: "black",
      frame: "raw",
    },
  },
];

export interface ShipPassiveText {
  name: LocKey | undefined;
  desc: LocKey | undefined;
}

export const shipPassiveText = (def: ShipDef, tier: 1 | 2): ShipPassiveText =>
  tier === 2 && def.passiveIIName !== undefined && def.passiveIIDesc !== undefined
    ? { name: def.passiveIIName, desc: def.passiveIIDesc }
    : { name: def.passiveName, desc: def.passiveDesc };

export const SHIP_BY_ID: ReadonlyMap<ShipId, ShipDef> = new Map(
  SHIPS.map((def) => [def.id, def]),
);

export const PLAYABLE_SHIPS: readonly ShipDef[] = SHIPS.filter(
  (s) => s.debug !== true,
);

export const shipBridgeIssues = (defs: readonly ShipDef[]): string[] => {
  const out: string[] = [];
  const tints = new Map<School, ShipId>();
  const frames = new Map<BridgeFrame, ShipId>();
  for (const def of defs) {
    const { tint, frame } = def.bridgeTheme;
    const tintOwner = tints.get(tint);
    if (tintOwner !== undefined) {
      out.push(
        `ships: "${def.id}" shares its bridge tint "${tint}" with "${tintOwner}"`,
      );
    }
    tints.set(tint, def.id);
    const frameOwner = frames.get(frame);
    if (frameOwner !== undefined) {
      out.push(
        `ships: "${def.id}" shares its bridge frame "${frame}" with "${frameOwner}"`,
      );
    }
    frames.set(frame, def.id);
  }
  return out;
};

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
