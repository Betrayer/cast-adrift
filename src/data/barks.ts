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

// Echo barks. Triggers: resume · sectorEnter:<n> · lowHull · firstKill:<enemyId>
// · setComplete · rareLoot · tideUp · eventOutcome:negative|positive · idleMap
// · battleWin · nearDeathWin.
export const BARKS: readonly BarkDef[] = [
  { id: "resume", trigger: "resume", lines: lines("resume", 2), weight: 1, cooldownSec: 120 },
  { id: "sectorEnter1", trigger: "sectorEnter:1", lines: lines("sectorEnter1", 2), weight: 1, cooldownSec: 300 },
  { id: "lowHull", trigger: "lowHull", lines: lines("lowHull", 3), weight: 1, cooldownSec: 60 },
  { id: "battleWin", trigger: "battleWin", lines: lines("battleWin", 3), weight: 1, cooldownSec: 45 },
  { id: "nearDeathWin", trigger: "nearDeathWin", lines: lines("nearDeathWin", 2), weight: 1, cooldownSec: 60 },
  { id: "tideUp", trigger: "tideUp", lines: lines("tideUp", 2), weight: 1, cooldownSec: 90 },
  { id: "rareLoot", trigger: "rareLoot", lines: lines("rareLoot", 2), weight: 1, cooldownSec: 60 },
  { id: "eventNeg", trigger: "eventOutcome:negative", lines: lines("eventNeg", 3), weight: 1, cooldownSec: 45 },
  { id: "eventPos", trigger: "eventOutcome:positive", lines: lines("eventPos", 2), weight: 1, cooldownSec: 45 },
  { id: "idleMap", trigger: "idleMap", lines: lines("idleMap", 2), weight: 1, cooldownSec: 120 },
  { id: "setComplete", trigger: "setComplete", lines: lines("setComplete", 2), weight: 1, cooldownSec: 90 },
  { id: "killJammer", trigger: "firstKill:jammerCorvette", lines: lines("killJammer", 2), weight: 1, cooldownSec: 30 },
  { id: "killLeech", trigger: "firstKill:leechSkiff", lines: lines("killLeech", 2), weight: 1, cooldownSec: 30 },
  { id: "killRaider", trigger: "firstKill:raider", lines: lines("killRaider", 2), weight: 1, cooldownSec: 30 },
  { id: "killChoir", trigger: "firstKill:choirZealot", lines: lines("killChoir", 2), weight: 1, cooldownSec: 30 },
  { id: "killWasp", trigger: "firstKill:riftWasp", lines: lines("killWasp", 2), weight: 1, cooldownSec: 30 },
  { id: "killWarden", trigger: "firstKill:shieldWarden", lines: lines("killWarden", 2), weight: 1, cooldownSec: 30 },
  { id: "killScav", trigger: "firstKill:scavDrone", lines: lines("killScav", 2), weight: 1, cooldownSec: 30 },
];
