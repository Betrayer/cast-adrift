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

const contract = (
  id: string,
  body: Omit<ContractDef, "id" | "name" | "desc">,
): ContractDef => ({
  id,
  name: `content:contracts.${id}.name`,
  desc: `content:contracts.${id}.desc`,
  ...body,
});

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
  contract("bareHull", {
    setup: { ship: "wanderer", perksDisabled: true },
    goals: [
      { g: "win" },
      { g: "hullPctAtLeast", n: 50 },
      { g: "noShipyardVisits" },
    ],
  }),
  contract("redHeat", {
    setup: { deckPreset: RED_DECK },
    goals: [
      { g: "win" },
      { g: "burnKillElite" },
      { g: "jumpsAtMost", n: 12 },
    ],
  }),
  contract("iceWall", {
    setup: { deckPreset: BLUE_DECK },
    goals: [
      { g: "win" },
      { g: "shieldAbsorbedAtLeast", n: 60 },
      { g: "hullNeverBelowPct", n: 50 },
    ],
  }),
  contract("tightVoyage", {
    setup: { shopPricePct: 50 },
    goals: [
      { g: "win" },
      { g: "scrapAtLeast", n: 100 },
      { g: "boughtNothing" },
    ],
  }),
  contract("batteringRam", {
    setup: { ship: "ram" },
    goals: [
      { g: "win" },
      { g: "spinalHitAtLeast", n: 15 },
      { g: "fastBattleTurnsAtMost", n: 2 },
    ],
  }),
  contract("ark", {
    setup: { ship: "ark" },
    goals: [
      { g: "win" },
      { g: "repairBayHealAtLeast", n: 40 },
      { g: "fullHullBattleEndsAtLeast", n: 3 },
    ],
  }),
  contract("singleCast", {
    setup: { sector: 1, forcedTraits: ["singleCast"], chartDisabled: true },
    goals: [{ g: "win" }, { g: "minibossKilled" }, { g: "noRerolls" }],
  }),
  contract("storm", {
    setup: { tideStart: 2 },
    goals: [
      { g: "win" },
      { g: "elitesAtLeast", n: 2 },
      { g: "depthWithDeckAtLeast", depth: 15, deck: 5 },
    ],
  }),
  contract("blindJump", {
    setup: { mutators: ["fog"], sensorsDisabled: true },
    goals: [
      { g: "win" },
      { g: "beaconResolved" },
      { g: "anomaliesSolvedAtLeast", n: 1 },
    ],
  }),
  contract("choirShadow", {
    setup: { sector: 4, mutators: ["resonantStorm"] },
    goals: [
      { g: "win" },
      { g: "blackPlacedInWinAtLeast", n: 3 },
      { g: "axisAtMost", n: -2 },
    ],
  }),
  contract("keeper", {
    setup: { sector: 1 },
    goals: [
      { g: "win" },
      { g: "allBeaconsResolved" },
      { g: "anomaliesSolvedAtLeast", n: 2 },
    ],
  }),
  contract("bareArmor", {
    setup: { shieldsDisabled: true },
    goals: [
      { g: "win" },
      { g: "hullNeverBelowPct", n: 25 },
      { g: "elitesAtLeast", n: 2 },
    ],
  }),
  contract("collector", {
    setup: { deckPreset: MIXED_DECK },
    goals: [
      { g: "win" },
      { g: "deckSchoolsAtLeast", n: 5 },
      { g: "depthWithDeckAtLeast", depth: 15, deck: 9 },
    ],
  }),
  contract("quietRun", {
    setup: { sector: 3 },
    goals: [
      { g: "win" },
      { g: "dicePlacedAtMost", n: 20 },
      { g: "jumpsAtMost", n: 14 },
    ],
  }),
  contract("deadReckoning", {
    setup: { chartDisabled: true, mutators: ["fog"] },
    goals: [
      { g: "win" },
      { g: "jumpsAtMost", n: 13 },
      { g: "noShipyardVisits" },
    ],
  }),
  contract("ironTide", {
    setup: { tideStart: 3 },
    goals: [
      { g: "win" },
      { g: "hullNeverBelowPct", n: 30 },
      { g: "fullHullBattleEndsAtLeast", n: 2 },
    ],
  }),
  contract("prismWork", {
    setup: { deckPreset: PRISM_DECK },
    goals: [
      { g: "win" },
      { g: "deckSchoolsAtLeast", n: 6 },
      { g: "dicePlacedAtMost", n: 26 },
    ],
  }),
  contract("ghostLane", {
    setup: { sector: 2, mutators: ["radioSilence"] },
    goals: [
      { g: "win" },
      { g: "elitesAtMost", n: 1 },
      { g: "jumpsAtMost", n: 12 },
    ],
  }),
  contract("voidTithe", {
    setup: { sector: 5, mutators: ["resonantStorm"], shopPricePct: 75 },
    goals: [
      { g: "win" },
      { g: "axisAtLeast", n: 3 },
      { g: "scrapAtLeast", n: 120 },
    ],
  }),
  contract("gauntlet", {
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
  }),
];

export const CONTRACT_BY_ID: ReadonlyMap<string, ContractDef> = new Map(
  CONTRACTS.map((def) => [def.id, def]),
);

export const contractDef = (id: string | null): ContractDef | undefined =>
  id === null ? undefined : CONTRACT_BY_ID.get(id);
