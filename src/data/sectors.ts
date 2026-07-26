import type { LocKey } from "@/types/content";

export type SectorId = 1 | 2 | 3 | 4 | 5;

export interface NodeQuotas {
  elites: readonly [number, number];
  events: readonly [number, number];
  shops: number;
  shipyards: number;
  anomalies: number;
  beacons: number;
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
  bossId: string;
  tideCap: number;
  nodeQuotas: NodeQuotas;
  scrapMult: number;
  beaconId: string;
}

const QUOTAS: NodeQuotas = {
  elites: [2, 3],
  events: [4, 5],
  shops: 2,
  shipyards: 2,
  anomalies: 2,
  beacons: 1,
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
    ],
    pairPool: [
      ["choirZealot", "riftWasp"],
      ["jammerCorvette", "leechSkiff"],
      ["shieldWarden", "scavDrone"],
      ["scavDrone", "scavDrone"],
      ["leechSkiff", "riftWasp"],
      ["choirZealot", "scavDrone"],
    ],
    elitePool: ["raiderAlpha", "bountyHuntress"],
    minibossPool: ["convoyAlpha", "wardenFragment", "mirrorHull"],
    bossId: "quarantineWarden",
    tideCap: 3,
    nodeQuotas: QUOTAS,
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
    ],
    pairPool: [
      ["breakerDrone", "magnetTug"],
      ["minelayer", "breakerDrone"],
      ["magnetTug", "scavDrone"],
      ["breakerDrone", "breakerDrone"],
    ],
    elitePool: ["raiderAlpha", "bountyHuntress"],
    minibossPool: ["mineTyrant", "leechQueen", "convoyAlpha"],
    bossId: "breakerBarge",
    tideCap: 3,
    nodeQuotas: QUOTAS,
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
    ],
    pairPool: [
      ["riftling", "unstableCore"],
      ["echoShade", "riftWasp"],
      ["riftling", "riftWasp"],
      ["unstableCore", "unstableCore"],
    ],
    elitePool: ["raiderAlpha", "bountyHuntress"],
    minibossPool: ["mirrorHull", "leechQueen", "wardenFragment"],
    bossId: "riftMaw",
    tideCap: 3,
    nodeQuotas: QUOTAS,
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
    ],
    pairPool: [
      ["choirAcolyte", "hymnTurret"],
      ["zealotRam", "choirZealot"],
      ["hymnTurret", "choirZealot"],
      ["choirAcolyte", "zealotRam"],
    ],
    elitePool: ["raiderAlpha", "bountyHuntress"],
    minibossPool: ["choirHerald", "convoyAlpha", "mineTyrant"],
    bossId: "choirFlagship",
    tideCap: 3,
    nodeQuotas: QUOTAS,
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
    ],
    pairPool: [
      ["coreFragment", "nullDrone"],
      ["probabilityKnot", "nullDrone"],
      ["coreFragment", "probabilityKnot"],
      ["nullDrone", "nullDrone"],
    ],
    elitePool: ["raiderAlpha", "bountyHuntress"],
    minibossPool: ["mirrorHull", "choirHerald", "leechQueen"],
    bossId: "coreHeart",
    tideCap: 3,
    nodeQuotas: QUOTAS,
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
