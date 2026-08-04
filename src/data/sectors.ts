import type { NodeType } from "@/game/map/types";
import type { LocKey } from "@/types/content";
import type { EventEffect } from "@/types/events";

export type SectorId = 1 | 2 | 3 | 4 | 5;

export interface NodeQuotas {
  elites: readonly [number, number];
  events: readonly [number, number];
  shops: number;
  shipyards: number;
  anomalies: number;
  beacons: number;
}

export interface SectorScaling {
  hpPct: number;
  pocketPct: number;
}

export type SectorMotif =
  | { m: "cache"; count: number; gain: readonly EventEffect[] }
  | { m: "mineEdges"; count: number; toll: readonly EventEffect[] }
  | { m: "riftSplit"; from: number; to: number }
  | {
      m: "procession";
      blessed: readonly EventEffect[];
      cursed: readonly EventEffect[];
    }
  | { m: "collapse"; rows: number; chance: number };

export type MotifKind = SectorMotif["m"];

export interface EncounterMix {
  bespokeWeight: number;
  threatCap: number;
  sizeWeights: readonly number[];
}

export interface SectorShape {
  bossRow: number;
  gateRow: number;
  lanes: 3 | 4;
  branchiness: number;
  quotas: NodeQuotas;
  motifs: readonly SectorMotif[];
  pockets: readonly [number, number];
  pocketTable: readonly (readonly [NodeType, number])[];
  anomalyTiers: readonly [number, number];
}

export interface SectorDef {
  id: SectorId;
  name: LocKey;
  accent: string;
  wash: string;
  enemyPool: readonly (readonly [string, number])[];
  pairPool: readonly (readonly [string, string])[];
  elitePool: readonly string[];
  minibossPool: readonly string[];
  bossPool: readonly string[];
  tideCap: number;
  encounter: EncounterMix;
  shape: SectorShape;
  scaling: SectorScaling;
  scrapMult: number;
  beaconId: string;
}

const SHAPES: Readonly<Record<SectorId, SectorShape>> = {
  1: {
    bossRow: 15,
    gateRow: 8,
    lanes: 3,
    branchiness: 0.35,
    quotas: {
      elites: [2, 2],
      events: [5, 6],
      shops: 2,
      shipyards: 2,
      anomalies: 2,
      beacons: 1,
    },
    motifs: [{ m: "cache", count: 2, gain: [{ k: "scrap", n: 10 }] }],
    pockets: [1, 1],
    pocketTable: [
      ["event", 3],
      ["anomaly", 2],
      ["shop", 1],
    ],
    anomalyTiers: [1, 2],
  },
  2: {
    bossRow: 15,
    gateRow: 8,
    lanes: 4,
    branchiness: 0.7,
    quotas: {
      elites: [2, 3],
      events: [4, 5],
      shops: 3,
      shipyards: 2,
      anomalies: 2,
      beacons: 1,
    },
    motifs: [{ m: "mineEdges", count: 4, toll: [{ k: "hull", n: -2 }] }],
    pockets: [2, 2],
    pocketTable: [
      ["shop", 3],
      ["event", 2],
      ["anomaly", 2],
    ],
    anomalyTiers: [1, 3],
  },
  3: {
    bossRow: 14,
    gateRow: 7,
    lanes: 4,
    branchiness: 0.55,
    quotas: {
      elites: [2, 3],
      events: [4, 4],
      shops: 2,
      shipyards: 2,
      anomalies: 2,
      beacons: 1,
    },
    motifs: [{ m: "riftSplit", from: 3, to: 6 }],
    pockets: [1, 1],
    pocketTable: [
      ["anomaly", 3],
      ["event", 2],
      ["shipyard", 1],
    ],
    anomalyTiers: [2, 4],
  },
  4: {
    bossRow: 15,
    gateRow: 9,
    lanes: 4,
    branchiness: 0.6,
    quotas: {
      elites: [2, 3],
      events: [5, 6],
      shops: 2,
      shipyards: 3,
      anomalies: 2,
      beacons: 1,
    },
    motifs: [
      {
        m: "procession",
        blessed: [{ k: "nodeMod", mod: "shipyardDiscount", n: 12 }],
        cursed: [{ k: "tide", n: 1 }],
      },
    ],
    pockets: [2, 2],
    pocketTable: [
      ["event", 3],
      ["anomaly", 2],
      ["shipyard", 2],
    ],
    anomalyTiers: [2, 4],
  },
  5: {
    bossRow: 14,
    gateRow: 7,
    lanes: 3,
    branchiness: 0.45,
    quotas: {
      elites: [3, 4],
      events: [3, 4],
      shops: 2,
      shipyards: 2,
      anomalies: 2,
      beacons: 1,
    },
    motifs: [{ m: "collapse", rows: 2, chance: 0.5 }],
    pockets: [1, 1],
    pocketTable: [
      ["anomaly", 3],
      ["event", 2],
      ["shop", 2],
    ],
    anomalyTiers: [3, 5],
  },
};

export const SECTORS: readonly SectorDef[] = [
  {
    id: 1,
    name: "content:sectors.1",
    accent: "#8C7BFF",
    wash: "#1A1630",
    enemyPool: [
      ["scavDrone", 2],
      ["raider", 2],
      ["shieldWarden", 2],
      ["jammerCorvette", 2],
      ["leechSkiff", 2],
      ["choirZealot", 2],
      ["riftWasp", 2],
      ["hullGnat", 2],
    ],
    pairPool: [
      ["choirZealot", "riftWasp"],
      ["jammerCorvette", "leechSkiff"],
      ["shieldWarden", "scavDrone"],
      ["scavDrone", "scavDrone"],
      ["leechSkiff", "riftWasp"],
      ["choirZealot", "scavDrone"],
      ["hullGnat", "scavDrone"],
    ],
    elitePool: ["raiderAlpha", "bountyHuntress"],
    minibossPool: ["convoyAlpha", "wardenFragment", "mirrorHull"],
    bossPool: ["quarantineWarden"],
    tideCap: 3,
    encounter: {
      bespokeWeight: 14,
      threatCap: 26,
      sizeWeights: [4, 1],
    },
    shape: SHAPES[1],
    scaling: { hpPct: 0, pocketPct: 20 },
    scrapMult: 1,
    beaconId: "beaconKeeperIntro",
  },
  {
    id: 2,
    name: "content:sectors.2",
    accent: "#E0A46A",
    wash: "#2A2116",
    enemyPool: [
      ["breakerDrone", 3],
      ["magnetTug", 2],
      ["minelayer", 2],
      ["raider", 2],
      ["jammerCorvette", 1],
      ["hookTug", 3],
      ["slagHauler", 2],
      ["chaffSwarm", 2],
    ],
    pairPool: [
      ["breakerDrone", "magnetTug"],
      ["minelayer", "breakerDrone"],
      ["magnetTug", "scavDrone"],
      ["breakerDrone", "breakerDrone"],
      ["hookTug", "chaffSwarm"],
      ["slagHauler", "hookTug"],
    ],
    elitePool: ["raiderAlpha", "clanBreaker", "mineBaron"],
    minibossPool: ["mineTyrant", "leechQueen", "convoyAlpha"],
    bossPool: ["breakerBarge"],
    tideCap: 3,
    encounter: {
      bespokeWeight: 12,
      threatCap: 30,
      sizeWeights: [4, 2, 0.4],
    },
    shape: SHAPES[2],
    scaling: { hpPct: 6, pocketPct: 25 },
    scrapMult: 1.1,
    beaconId: "fleetBlackbox",
  },
  {
    id: 3,
    name: "content:sectors.3",
    accent: "#5FD4C2",
    wash: "#12292B",
    enemyPool: [
      ["riftling", 3],
      ["echoShade", 2],
      ["unstableCore", 2],
      ["riftWasp", 2],
      ["breakerDrone", 1],
      ["foldWorm", 3],
      ["nullEcho", 2],
      ["riftAnchor", 2],
    ],
    pairPool: [
      ["riftling", "unstableCore"],
      ["echoShade", "riftWasp"],
      ["riftling", "riftWasp"],
      ["unstableCore", "unstableCore"],
      ["foldWorm", "riftAnchor"],
      ["nullEcho", "breachDrone"],
    ],
    elitePool: ["riftTyrant", "bountyHuntress", "leechPrince"],
    minibossPool: ["mirrorHull", "leechQueen", "wardenFragment"],
    bossPool: ["riftMaw"],
    tideCap: 3,
    encounter: {
      bespokeWeight: 12,
      threatCap: 34,
      sizeWeights: [4, 2, 0.4],
    },
    shape: SHAPES[3],
    scaling: { hpPct: 20, pocketPct: 25 },
    scrapMult: 1.2,
    beaconId: "choirInvitation",
  },
  {
    id: 4,
    name: "content:sectors.4",
    accent: "#F0CE7E",
    wash: "#2E2415",
    enemyPool: [
      ["choirAcolyte", 3],
      ["hymnTurret", 2],
      ["zealotRam", 2],
      ["choirZealot", 2],
      ["echoShade", 1],
      ["hymnCantor", 3],
      ["pyreDeacon", 2],
      ["reliquary", 2],
    ],
    pairPool: [
      ["choirAcolyte", "hymnTurret"],
      ["zealotRam", "choirZealot"],
      ["hymnTurret", "choirZealot"],
      ["choirAcolyte", "zealotRam"],
      ["reliquary", "hymnCantor"],
      ["pyreDeacon", "choirAcolyte"],
    ],
    elitePool: ["choirCantor", "bountyHuntress", "leechPrince"],
    minibossPool: ["choirHerald", "convoyAlpha", "mineTyrant"],
    bossPool: ["choirFlagship"],
    tideCap: 3,
    encounter: {
      bespokeWeight: 12,
      threatCap: 38,
      sizeWeights: [4, 2, 0.4],
    },
    shape: SHAPES[4],
    scaling: { hpPct: 32, pocketPct: 30 },
    scrapMult: 1.3,
    beaconId: "pactSeal",
  },
  {
    id: 5,
    name: "content:sectors.5",
    accent: "#F0A09A",
    wash: "#2E1517",
    enemyPool: [
      ["coreFragment", 2],
      ["probabilityKnot", 3],
      ["nullDrone", 3],
      ["echoShade", 1],
      ["zealotRam", 1],
      ["causalityLoop", 3],
      ["voidWarden", 2],
      ["quietEngine", 2],
    ],
    pairPool: [
      ["coreFragment", "nullDrone"],
      ["probabilityKnot", "nullDrone"],
      ["coreFragment", "probabilityKnot"],
      ["nullDrone", "nullDrone"],
      ["causalityLoop", "quietEngine"],
      ["voidWarden", "sparkMote"],
    ],
    elitePool: ["coreSentinel", "riftTyrant", "choirCantor"],
    minibossPool: ["mirrorHull", "choirHerald", "leechQueen"],
    bossPool: ["coreHeart"],
    tideCap: 3,
    encounter: {
      bespokeWeight: 12,
      threatCap: 42,
      sizeWeights: [4, 2, 0.4],
    },
    shape: SHAPES[5],
    scaling: { hpPct: 56, pocketPct: 30 },
    scrapMult: 1.4,
    beaconId: "coreThreshold",
  },
];

export const SECTOR_COUNT = SECTORS.length;

export const SECTOR_BY_ID: ReadonlyMap<number, SectorDef> = new Map(
  SECTORS.map((def) => [def.id, def]),
);

export const sectorDef = (sector: number): SectorDef => {
  const clamped = Math.max(1, Math.min(SECTOR_COUNT, Math.round(sector)));
  const def = SECTOR_BY_ID.get(clamped);
  if (def === undefined) throw new Error(`sectorDef: unknown sector ${String(sector)}`);
  return def;
};
