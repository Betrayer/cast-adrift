import type { LocKey } from "@/types/content";

export interface BarkDef {
  id: string;
  trigger: string;
  lines: readonly LocKey[];
  weight: number;
  cooldownSec: number;
}

export interface BarkReservation {
  trigger: string;
  phase: string;
  lines: number;
}

const lines = (id: string, n: number): LocKey[] =>
  Array.from({ length: n }, (_, i) => `content:bark.${id}.${String(i + 1)}`);

const FIRST_KILL_ENEMIES: readonly string[] = [
  "raider",
  "scavDrone",
  "shieldWarden",
  "jammerCorvette",
  "leechSkiff",
  "choirZealot",
  "riftWasp",
  "breakerDrone",
  "magnetTug",
  "minelayer",
  "hookTug",
  "riftling",
  "echoShade",
  "foldWorm",
  "choirAcolyte",
  "hymnTurret",
  "hymnCantor",
  "coreFragment",
  "probabilityKnot",
  "causalityLoop",
];

const FIRST_KILL_LINES = 3;

const firstKillBarks: readonly BarkDef[] = FIRST_KILL_ENEMIES.map((id) => ({
  id: `kill-${id}`,
  trigger: `firstKill:${id}`,
  lines: lines(`kill-${id}`, FIRST_KILL_LINES),
  weight: 1,
  cooldownSec: 30,
}));

export const BARKS: readonly BarkDef[] = [
  { id: "levelUp", trigger: "levelUp", lines: lines("levelUp", 6), weight: 1, cooldownSec: 30 },
  { id: "resume", trigger: "resume", lines: lines("resume", 10), weight: 1, cooldownSec: 120 },
  { id: "memory", trigger: "memory", lines: lines("memory", 7), weight: 1, cooldownSec: 20 },
  { id: "bossPhase", trigger: "bossPhase", lines: lines("bossPhase", 10), weight: 1, cooldownSec: 15 },
  { id: "minibossIntro", trigger: "minibossIntro", lines: lines("minibossIntro", 6), weight: 1, cooldownSec: 20 },
  { id: "sectorEnter1", trigger: "sectorEnter:1", lines: lines("sectorEnter1", 4), weight: 1, cooldownSec: 300 },
  { id: "sectorEnter2", trigger: "sectorEnter:2", lines: lines("sectorEnter2", 4), weight: 1, cooldownSec: 300 },
  { id: "sectorEnter3", trigger: "sectorEnter:3", lines: lines("sectorEnter3", 4), weight: 1, cooldownSec: 300 },
  { id: "sectorEnter4", trigger: "sectorEnter:4", lines: lines("sectorEnter4", 4), weight: 1, cooldownSec: 300 },
  { id: "sectorEnter5", trigger: "sectorEnter:5", lines: lines("sectorEnter5", 4), weight: 1, cooldownSec: 300 },
  { id: "sectorEnter6", trigger: "sectorEnter:6", lines: lines("sectorEnter6", 4), weight: 1, cooldownSec: 300 },
  { id: "threshold", trigger: "threshold", lines: lines("threshold", 4), weight: 1, cooldownSec: 600 },
  { id: "lowHull", trigger: "lowHull", lines: lines("lowHull", 10), weight: 1, cooldownSec: 60 },
  { id: "battleWin", trigger: "battleWin", lines: lines("battleWin", 12), weight: 1, cooldownSec: 45 },
  { id: "nearDeathWin", trigger: "nearDeathWin", lines: lines("nearDeathWin", 6), weight: 1, cooldownSec: 60 },
  { id: "tideUp", trigger: "tideUp", lines: lines("tideUp", 6), weight: 1, cooldownSec: 90 },
  { id: "rareLoot", trigger: "rareLoot", lines: lines("rareLoot", 12), weight: 1, cooldownSec: 60 },
  { id: "eventNeg", trigger: "eventOutcome:negative", lines: lines("eventNeg", 10), weight: 1, cooldownSec: 45 },
  { id: "eventPos", trigger: "eventOutcome:positive", lines: lines("eventPos", 10), weight: 1, cooldownSec: 45 },
  { id: "idleMap", trigger: "idleMap", lines: lines("idleMap", 8), weight: 1, cooldownSec: 120 },
  { id: "setComplete", trigger: "setComplete", lines: lines("setComplete", 9), weight: 1, cooldownSec: 90 },
  { id: "wormholeRide", trigger: "wormholeRide", lines: lines("wormholeRide", 5), weight: 1, cooldownSec: 45 },
  { id: "holeBypass", trigger: "holeBypass", lines: lines("holeBypass", 5), weight: 1, cooldownSec: 45 },
  { id: "cargoDelivered", trigger: "cargoDelivered", lines: lines("cargoDelivered", 3), weight: 1, cooldownSec: 60 },
  { id: "officerRescued", trigger: "officerRescued", lines: lines("officerRescued", 3), weight: 1, cooldownSec: 300 },
  ...firstKillBarks,
];

export const BARK_QUOTA: Readonly<Record<string, number>> = {
  resume: 10,
  sectorEnter: 24,
  lowHull: 10,
  firstKill: 60,
  bossPhase: 10,
  minibossIntro: 6,
  setComplete: 9,
  rareLoot: 12,
  tideUp: 6,
  "eventOutcome:negative": 10,
  "eventOutcome:positive": 10,
  idleMap: 8,
  battleWin: 12,
  nearDeathWin: 6,
  levelUp: 6,
  memory: 7,
  threshold: 4,
  wormholeRide: 5,
  holeBypass: 5,
  cargoDelivered: 3,
  officerRescued: 3,
};

export const BARK_RESERVATIONS: readonly BarkReservation[] = [
  { trigger: "bossPartDown", phase: "U7", lines: 3 },
];
