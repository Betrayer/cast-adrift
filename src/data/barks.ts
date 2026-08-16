import type { LocKey } from "@/types/content";

export interface BarkDef {
  id: string;
  trigger: string;
  lines: readonly LocKey[];
  weight: number;
  cooldownSec: number;
}

const lines = (id: string, n: number): LocKey[] =>
  Array.from({ length: n }, (_, i) => `content:bark.${id}.${String(i + 1)}`);

// The twenty enemies worth a first-kill line: the ones a player meets as a
// named threat rather than as chaff.
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

const firstKillBarks: readonly BarkDef[] = FIRST_KILL_ENEMIES.map((id) => ({
  id: `kill-${id}`,
  trigger: `firstKill:${id}`,
  lines: [`content:bark.kill-${id}.1`],
  weight: 1,
  cooldownSec: 30,
}));

// Echo barks (DESIGN §2.1 target: 150 lines). Quota per trigger:
// resume 10 · sectorEnter 18 · lowHull 10 · firstKill 20 · bossPhase 10 ·
// minibossIntro 6 · setComplete 7 · rareLoot 12 · tideUp 6 · eventOutcome 10+10 ·
// idleMap 6 · battleWin 12 · nearDeathWin 6 · levelUp 6 · memory 4 ·
// threshold 4 = 157.
export const BARKS: readonly BarkDef[] = [
  { id: "levelUp", trigger: "levelUp", lines: lines("levelUp", 6), weight: 1, cooldownSec: 30 },
  { id: "resume", trigger: "resume", lines: lines("resume", 10), weight: 1, cooldownSec: 120 },
  { id: "memory", trigger: "memory", lines: lines("memory", 4), weight: 1, cooldownSec: 20 },
  { id: "bossPhase", trigger: "bossPhase", lines: lines("bossPhase", 10), weight: 1, cooldownSec: 15 },
  { id: "minibossIntro", trigger: "minibossIntro", lines: lines("minibossIntro", 6), weight: 1, cooldownSec: 20 },
  { id: "sectorEnter1", trigger: "sectorEnter:1", lines: lines("sectorEnter1", 3), weight: 1, cooldownSec: 300 },
  { id: "sectorEnter2", trigger: "sectorEnter:2", lines: lines("sectorEnter2", 3), weight: 1, cooldownSec: 300 },
  { id: "sectorEnter3", trigger: "sectorEnter:3", lines: lines("sectorEnter3", 3), weight: 1, cooldownSec: 300 },
  { id: "sectorEnter4", trigger: "sectorEnter:4", lines: lines("sectorEnter4", 3), weight: 1, cooldownSec: 300 },
  { id: "sectorEnter5", trigger: "sectorEnter:5", lines: lines("sectorEnter5", 3), weight: 1, cooldownSec: 300 },
  { id: "sectorEnter6", trigger: "sectorEnter:6", lines: lines("sectorEnter6", 3), weight: 1, cooldownSec: 300 },
  { id: "threshold", trigger: "threshold", lines: lines("threshold", 4), weight: 1, cooldownSec: 600 },
  { id: "lowHull", trigger: "lowHull", lines: lines("lowHull", 10), weight: 1, cooldownSec: 60 },
  { id: "battleWin", trigger: "battleWin", lines: lines("battleWin", 12), weight: 1, cooldownSec: 45 },
  { id: "nearDeathWin", trigger: "nearDeathWin", lines: lines("nearDeathWin", 6), weight: 1, cooldownSec: 60 },
  { id: "tideUp", trigger: "tideUp", lines: lines("tideUp", 6), weight: 1, cooldownSec: 90 },
  { id: "rareLoot", trigger: "rareLoot", lines: lines("rareLoot", 12), weight: 1, cooldownSec: 60 },
  { id: "eventNeg", trigger: "eventOutcome:negative", lines: lines("eventNeg", 10), weight: 1, cooldownSec: 45 },
  { id: "eventPos", trigger: "eventOutcome:positive", lines: lines("eventPos", 10), weight: 1, cooldownSec: 45 },
  { id: "idleMap", trigger: "idleMap", lines: lines("idleMap", 6), weight: 1, cooldownSec: 120 },
  { id: "setComplete", trigger: "setComplete", lines: lines("setComplete", 7), weight: 1, cooldownSec: 90 },
  ...firstKillBarks,
];

export const BARK_LINE_TOTAL = BARKS.reduce((n, b) => n + b.lines.length, 0);

// Per-trigger quota the content lint enforces, so a trimmed pool fails CI
// instead of quietly making Echo repetitive.
export const BARK_QUOTA: Readonly<Record<string, number>> = {
  resume: 10,
  sectorEnter: 18,
  lowHull: 10,
  firstKill: 20,
  bossPhase: 10,
  minibossIntro: 6,
  setComplete: 7,
  rareLoot: 12,
  tideUp: 6,
  "eventOutcome:negative": 10,
  "eventOutcome:positive": 10,
  idleMap: 6,
  battleWin: 12,
  nearDeathWin: 6,
  levelUp: 6,
  memory: 4,
  threshold: 4,
};
