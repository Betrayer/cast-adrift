import type { MutatorId } from "@/data/mutators";
import type { ShipId } from "@/data/ships";
import type { PerkTrait } from "@/data/perks/types";
import type { GoalSpec } from "@/game/run/goals";
import type { LocKey } from "@/types/content";

export interface ContractSetup {
  ship?: ShipId;
  deckPreset?: readonly string[];
  mutators?: readonly MutatorId[];
  sector?: number;
  tideStart?: number;
  chartDisabled?: boolean;
  perksDisabled?: boolean;
  sensorsDisabled?: boolean;
  shopPricePct?: number;
  forcedTraits?: readonly PerkTrait[];
}

export interface ContractDef {
  id: string;
  name: LocKey;
  desc: LocKey;
  setup: ContractSetup;
  goals: readonly [GoalSpec, GoalSpec, GoalSpec];
}

export const CONTRACT_STAR_COUNT = 3;

const RED_DECK: readonly string[] = [
  "red-d6",
  "red-d6",
  "ember",
  "cinder",
  "slug",
  "fused-emberforge",
];

const BLUE_DECK: readonly string[] = [
  "blue-d6",
  "blue-d6",
  "frostplate",
  "bulwark",
  "gyro",
  "fused-frostwall",
];

export const CONTRACTS: readonly ContractDef[] = [
  {
    id: "bareHull",
    name: "content:contracts.bareHull.name",
    desc: "content:contracts.bareHull.desc",
    setup: { ship: "wanderer", perksDisabled: true },
    goals: [
      { g: "win" },
      { g: "hullPctAtLeast", n: 50 },
      { g: "noShipyardVisits" },
    ],
  },
  {
    id: "redHeat",
    name: "content:contracts.redHeat.name",
    desc: "content:contracts.redHeat.desc",
    setup: { deckPreset: RED_DECK },
    goals: [
      { g: "win" },
      { g: "burnKillElite" },
      { g: "jumpsAtMost", n: 12 },
    ],
  },
  {
    id: "iceWall",
    name: "content:contracts.iceWall.name",
    desc: "content:contracts.iceWall.desc",
    setup: { deckPreset: BLUE_DECK },
    goals: [
      { g: "win" },
      { g: "shieldAbsorbedAtLeast", n: 60 },
      { g: "hullNeverBelowPct", n: 50 },
    ],
  },
  {
    id: "tightVoyage",
    name: "content:contracts.tightVoyage.name",
    desc: "content:contracts.tightVoyage.desc",
    setup: { shopPricePct: 50 },
    goals: [
      { g: "win" },
      { g: "scrapAtLeast", n: 100 },
      { g: "boughtNothing" },
    ],
  },
  {
    id: "batteringRam",
    name: "content:contracts.batteringRam.name",
    desc: "content:contracts.batteringRam.desc",
    setup: { ship: "ram" },
    goals: [
      { g: "win" },
      { g: "spinalHitAtLeast", n: 15 },
      { g: "fastBattleTurnsAtMost", n: 2 },
    ],
  },
  {
    id: "ark",
    name: "content:contracts.ark.name",
    desc: "content:contracts.ark.desc",
    setup: { ship: "ark" },
    goals: [
      { g: "win" },
      { g: "repairBayHealAtLeast", n: 40 },
      { g: "fullHullBattleEndsAtLeast", n: 3 },
    ],
  },
  {
    id: "singleCast",
    name: "content:contracts.singleCast.name",
    desc: "content:contracts.singleCast.desc",
    setup: { sector: 1, forcedTraits: ["singleCast"], chartDisabled: true },
    goals: [{ g: "win" }, { g: "minibossKilled" }, { g: "noRerolls" }],
  },
  {
    id: "storm",
    name: "content:contracts.storm.name",
    desc: "content:contracts.storm.desc",
    setup: { tideStart: 2 },
    goals: [
      { g: "win" },
      { g: "elitesAtLeast", n: 2 },
      { g: "depthWithDeckAtLeast", depth: 15, deck: 5 },
    ],
  },
  {
    id: "blindJump",
    name: "content:contracts.blindJump.name",
    desc: "content:contracts.blindJump.desc",
    setup: { mutators: ["fog"], sensorsDisabled: true },
    goals: [
      { g: "win" },
      { g: "beaconResolved" },
      { g: "anomaliesSolvedAtLeast", n: 1 },
    ],
  },
  {
    id: "choirShadow",
    name: "content:contracts.choirShadow.name",
    desc: "content:contracts.choirShadow.desc",
    setup: { sector: 4, mutators: ["resonantStorm"] },
    goals: [
      { g: "win" },
      { g: "blackPlacedInWinAtLeast", n: 3 },
      { g: "axisAtMost", n: -2 },
    ],
  },
];

export const CONTRACT_BY_ID: ReadonlyMap<string, ContractDef> = new Map(
  CONTRACTS.map((def) => [def.id, def]),
);

export const contractDef = (id: string | null): ContractDef | undefined =>
  id === null ? undefined : CONTRACT_BY_ID.get(id);
