import type { NodeType } from "@/game/map/types";
import type { LocKey } from "@/types/content";
import type { EventEffect } from "@/types/events";

export type SectorId = 1 | 2 | 3 | 4 | 5 | 6;

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
  dmgPct: number;
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
  | { m: "collapse"; rows: number; chance: number }
  | { m: "inversion"; rows: number }
  | { m: "storm"; rows: number }
  | { m: "blackHoles"; count: number; toll: readonly EventEffect[] };

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
      shipyards: 3,
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
    motifs: [
      { m: "mineEdges", count: 4, toll: [{ k: "hull", n: -2 }] },
      { m: "blackHoles", count: 1, toll: [{ k: "hull", n: -1 }] },
    ],
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
    motifs: [
      { m: "riftSplit", from: 3, to: 6 },
      { m: "blackHoles", count: 1, toll: [{ k: "hull", n: -1 }] },
    ],
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
      shipyards: 2,
      anomalies: 2,
      beacons: 1,
    },
    motifs: [
      {
        m: "procession",
        blessed: [{ k: "nodeMod", mod: "shipyardDiscount", n: 12 }],
        cursed: [{ k: "tide", n: 1 }],
      },
      { m: "blackHoles", count: 2, toll: [{ k: "hull", n: -2 }] },
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
      elites: [4, 4],
      events: [3, 4],
      shops: 2,
      shipyards: 2,
      anomalies: 2,
      beacons: 1,
    },
    motifs: [
      { m: "collapse", rows: 2, chance: 0.5 },
      { m: "blackHoles", count: 1, toll: [{ k: "hull", n: -2 }] },
    ],
    pockets: [1, 1],
    pocketTable: [
      ["anomaly", 3],
      ["event", 2],
      ["shop", 2],
    ],
    anomalyTiers: [3, 5],
  },
  6: {
    bossRow: 16,
    gateRow: 9,
    lanes: 3,
    branchiness: 0.65,
    quotas: {
      elites: [2, 2],
      events: [10, 12],
      shops: 1,
      shipyards: 1,
      anomalies: 2,
      beacons: 1,
    },
    motifs: [
      { m: "inversion", rows: 3 },
      { m: "storm", rows: 3 },
      { m: "blackHoles", count: 2, toll: [{ k: "hull", n: -2 }] },
    ],
    pockets: [2, 2],
    pocketTable: [
      ["anomaly", 3],
      ["event", 3],
      ["shipyard", 2],
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
      ["anchorHulk", 2],
      ["tetherDrone", 2],
      ["salvageWarden", 2],
      ["hullGnat", 1],
    ],
    pairPool: [
      ["choirZealot", "riftWasp"],
      ["jammerCorvette", "leechSkiff"],
      ["shieldWarden", "scavDrone"],
      ["scavDrone", "scavDrone"],
      ["leechSkiff", "riftWasp"],
      ["anchorHulk", "tetherDrone"],
      ["salvageWarden", "scavDrone"],
      ["tetherDrone", "hullGnat"],
    ],
    elitePool: ["raiderAlpha", "bountyHuntress", "slagGolem"],
    minibossPool: [
      "convoyAlpha",
      "wardenFragment",
      "mirrorHull",
      "quarantineTwin",
    ],
    bossPool: ["quarantineWarden", "beaconTrap"],
    tideCap: 3,
    encounter: {
      bespokeWeight: 14,
      threatCap: 26,
      sizeWeights: [4, 1],
    },
    shape: SHAPES[1],
    scaling: { hpPct: 0, dmgPct: 0, pocketPct: 20 },
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
      ["hookTug", 3],
      ["slagHauler", 2],
      ["scrapKite", 2],
      ["convoyShell", 2],
      ["tollBarge", 2],
      ["ripperTug", 2],
      ["mineTender", 2],
      ["raider", 1],
      ["chaffSwarm", 2],
    ],
    pairPool: [
      ["breakerDrone", "magnetTug"],
      ["minelayer", "breakerDrone"],
      ["convoyShell", "hookTug"],
      ["breakerDrone", "breakerDrone"],
      ["hookTug", "chaffSwarm"],
      ["slagHauler", "scrapKite"],
      ["tollBarge", "ripperTug"],
      ["mineTender", "magnetTug"],
    ],
    elitePool: ["raiderAlpha", "clanBreaker", "mineBaron", "bailiff"],
    minibossPool: ["mineTyrant", "leechQueen", "convoyAlpha", "usurer"],
    bossPool: ["breakerBarge", "auctionCorvette"],
    tideCap: 3,
    encounter: {
      bespokeWeight: 12,
      threatCap: 30,
      sizeWeights: [4, 1.4, 0.2],
    },
    shape: SHAPES[2],
    scaling: { hpPct: 3, dmgPct: 10, pocketPct: 25 },
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
      ["foldWorm", 3],
      ["nullEcho", 2],
      ["riftAnchor", 2],
      ["capWraith", 2],
      ["slotMirror", 2],
      ["paradoxHusk", 2],
      ["riftWidow", 2],
      ["riftWasp", 1],
      ["breakerDrone", 1],
      ["breachDrone", 1],
    ],
    pairPool: [
      ["riftling", "unstableCore"],
      ["echoShade", "riftWasp"],
      ["capWraith", "riftAnchor"],
      ["unstableCore", "unstableCore"],
      ["foldWorm", "riftAnchor"],
      ["nullEcho", "breachDrone"],
      ["slotMirror", "foldWorm"],
      ["riftWidow", "paradoxHusk"],
    ],
    elitePool: ["riftTyrant", "bountyHuntress", "leechPrince", "blightVine"],
    minibossPool: [
      "mirrorHull",
      "leechQueen",
      "wardenFragment",
      "coreSliver",
      "resonator",
    ],
    bossPool: ["riftMaw", "riftBranch"],
    tideCap: 3,
    encounter: {
      bespokeWeight: 12,
      threatCap: 38,
      sizeWeights: [3.6, 2.1, 0.45],
    },
    shape: SHAPES[3],
    scaling: { hpPct: 19, dmgPct: 44, pocketPct: 25 },
    scrapMult: 1.25,
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
      ["hymnCantor", 3],
      ["pyreDeacon", 2],
      ["reliquary", 2],
      ["antiphonChoir", 2],
      ["censerDrone", 2],
      ["litanyWarden", 2],
      ["martyrThurible", 2],
      ["choirZealot", 1],
      ["echoShade", 1],
    ],
    pairPool: [
      ["choirAcolyte", "hymnTurret"],
      ["zealotRam", "choirZealot"],
      ["litanyWarden", "censerDrone"],
      ["choirAcolyte", "zealotRam"],
      ["reliquary", "hymnCantor"],
      ["pyreDeacon", "choirAcolyte"],
      ["antiphonChoir", "martyrThurible"],
      ["hymnCantor", "litanyWarden"],
    ],
    elitePool: ["choirCantor", "bountyHuntress", "leechPrince", "tollmaster"],
    minibossPool: [
      "choirHerald",
      "convoyAlpha",
      "mineTyrant",
      "silencer",
      "dragnet",
    ],
    bossPool: ["choirFlagship", "cantorColossus"],
    tideCap: 3,
    encounter: {
      bespokeWeight: 12,
      threatCap: 46,
      sizeWeights: [3.1, 2.9, 0.9],
    },
    shape: SHAPES[4],
    scaling: { hpPct: 38, dmgPct: 60, pocketPct: 30 },
    scrapMult: 1.2,
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
      ["causalityLoop", 3],
      ["voidWarden", 2],
      ["quietEngine", 2],
      ["echoOfTheHeart", 2],
      ["retrocausalMote", 2],
      ["stormChanter", 2],
      ["causalWard", 2],
      ["zealotRam", 1],
      ["sparkMote", 1],
    ],
    pairPool: [
      ["coreFragment", "nullDrone"],
      ["probabilityKnot", "nullDrone"],
      ["causalWard", "stormChanter"],
      ["nullDrone", "nullDrone"],
      ["causalityLoop", "quietEngine"],
      ["voidWarden", "sparkMote"],
      ["echoOfTheHeart", "retrocausalMote"],
      ["stormChanter", "causalityLoop"],
    ],
    elitePool: [
      "coreSentinel",
      "riftTyrant",
      "choirCantor",
      "capacitorWraith",
      "brineSiphon",
    ],
    minibossPool: [
      "mirrorHull",
      "choirHerald",
      "leechQueen",
      "resonator",
      "coreSliver",
    ],
    bossPool: ["coreHeart", "mirrorHeart"],
    tideCap: 3,
    encounter: {
      bespokeWeight: 12,
      threatCap: 54,
      sizeWeights: [2.85, 3.25, 0.9],
    },
    shape: SHAPES[5],
    scaling: { hpPct: 126, dmgPct: 92, pocketPct: 30 },
    scrapMult: 1.25,
    beaconId: "coreThreshold",
  },
  {
    id: 6,
    name: "content:sectors.6",
    accent: "#B9C6D6",
    wash: "#141A21",
    enemyPool: [
      ["retroEcho", 3],
      ["foldWraith", 3],
      ["slowStrider", 2],
      ["oddsEater", 2],
      ["causalSplinter", 3],
      ["preEcho", 2],
      ["hushHerald", 2],
      ["paradoxLoom", 2],
      ["causalityLoop", 1],
      ["probabilityKnot", 1],
      ["voidWarden", 1],
      ["retrocausalMote", 1],
    ],
    pairPool: [
      ["retroEcho", "foldWraith"],
      ["hushHerald", "oddsEater"],
      ["paradoxLoom", "causalSplinter"],
      ["preEcho", "retroEcho"],
      ["slowStrider", "causalSplinter"],
      ["foldWraith", "probabilityKnot"],
      ["oddsEater", "retrocausalMote"],
      ["hushHerald", "causalityLoop"],
    ],
    elitePool: [
      "coreSentinel",
      "riftTyrant",
      "capacitorWraith",
      "choirCantor",
      "brineSiphon",
    ],
    minibossPool: ["foldTyrant", "hushWarden", "resonator"],
    bossPool: ["theHush", "echoFleet"],
    tideCap: 5,
    encounter: {
      bespokeWeight: 14,
      threatCap: 46,
      sizeWeights: [4, 2, 0.5],
    },
    shape: SHAPES[6],
    scaling: { hpPct: 138, dmgPct: 0, pocketPct: 30 },
    scrapMult: 1.5,
    beaconId: "thresholdBeacon",
  },
];

export const CAMPAIGN_SECTORS = 5;

export const SECTOR_COUNT = CAMPAIGN_SECTORS;

export const SECTOR_BY_ID: ReadonlyMap<number, SectorDef> = new Map(
  SECTORS.map((def) => [def.id, def]),
);

export const sectorDef = (sector: number): SectorDef => {
  const clamped = Math.max(1, Math.min(SECTORS.length, Math.round(sector)));
  const def = SECTOR_BY_ID.get(clamped);
  if (def === undefined) throw new Error(`sectorDef: unknown sector ${String(sector)}`);
  return def;
};
