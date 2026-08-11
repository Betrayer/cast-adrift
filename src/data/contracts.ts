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
  shieldsDisabled?: boolean;
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

const MIXED_DECK: readonly string[] = [
  "red-d6",
  "blue-d6",
  "green-d4",
  "yellow-d6",
  "black-d6",
  "grey-d4",
];

const PRISM_DECK: readonly string[] = [
  "glimmer",
  "prismChip",
  "red-d6",
  "blue-d6",
  "green-d4",
  "yellow-d6",
  "black-d6",
  "grey-d4",
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
  {
    id: "keeper",
    name: "content:contracts.keeper.name",
    desc: "content:contracts.keeper.desc",
    setup: { sector: 1 },
    goals: [
      { g: "win" },
      { g: "allBeaconsResolved" },
      { g: "anomaliesSolvedAtLeast", n: 2 },
    ],
  },
  {
    id: "bareArmor",
    name: "content:contracts.bareArmor.name",
    desc: "content:contracts.bareArmor.desc",
    setup: { shieldsDisabled: true },
    goals: [
      { g: "win" },
      { g: "hullNeverBelowPct", n: 25 },
      { g: "elitesAtLeast", n: 2 },
    ],
  },
  {
    id: "collector",
    name: "content:contracts.collector.name",
    desc: "content:contracts.collector.desc",
    setup: { deckPreset: MIXED_DECK },
    goals: [
      { g: "win" },
      { g: "deckSchoolsAtLeast", n: 5 },
      { g: "depthWithDeckAtLeast", depth: 15, deck: 9 },
    ],
  },
  {
    id: "quietRun",
    name: "content:contracts.quietRun.name",
    desc: "content:contracts.quietRun.desc",
    setup: { sector: 3 },
    goals: [
      { g: "win" },
      { g: "dicePlacedAtMost", n: 20 },
      { g: "jumpsAtMost", n: 14 },
    ],
  },
  {
    id: "deadReckoning",
    name: "content:contracts.deadReckoning.name",
    desc: "content:contracts.deadReckoning.desc",
    setup: { chartDisabled: true, mutators: ["fog"] },
    goals: [
      { g: "win" },
      { g: "jumpsAtMost", n: 13 },
      { g: "noShipyardVisits" },
    ],
  },
  {
    id: "ironTide",
    name: "content:contracts.ironTide.name",
    desc: "content:contracts.ironTide.desc",
    setup: { tideStart: 3 },
    goals: [
      { g: "win" },
      { g: "hullNeverBelowPct", n: 30 },
      { g: "fullHullBattleEndsAtLeast", n: 2 },
    ],
  },
  {
    id: "prismWork",
    name: "content:contracts.prismWork.name",
    desc: "content:contracts.prismWork.desc",
    setup: { deckPreset: PRISM_DECK },
    goals: [
      { g: "win" },
      { g: "deckSchoolsAtLeast", n: 6 },
      { g: "dicePlacedAtMost", n: 26 },
    ],
  },
  {
    id: "ghostLane",
    name: "content:contracts.ghostLane.name",
    desc: "content:contracts.ghostLane.desc",
    setup: { sector: 2, mutators: ["radioSilence"] },
    goals: [
      { g: "win" },
      { g: "elitesAtMost", n: 1 },
      { g: "jumpsAtMost", n: 12 },
    ],
  },
  {
    id: "voidTithe",
    name: "content:contracts.voidTithe.name",
    desc: "content:contracts.voidTithe.desc",
    setup: { sector: 5, mutators: ["resonantStorm"], shopPricePct: 75 },
    goals: [
      { g: "win" },
      { g: "axisAtLeast", n: 3 },
      { g: "scrapAtLeast", n: 120 },
    ],
  },
  {
    id: "gauntlet",
    name: "content:contracts.gauntlet.name",
    desc: "content:contracts.gauntlet.desc",
    setup: {
      forcedTraits: ["obsidianPact"],
      perksDisabled: true,
      chartDisabled: true,
    },
    goals: [
      { g: "win" },
      { g: "elitesAtLeast", n: 4 },
      { g: "hullPctAtLeast", n: 25 },
    ],
  },
];

export const CONTRACT_BY_ID: ReadonlyMap<string, ContractDef> = new Map(
  CONTRACTS.map((def) => [def.id, def]),
);

export const contractDef = (id: string | null): ContractDef | undefined =>
  id === null ? undefined : CONTRACT_BY_ID.get(id);
