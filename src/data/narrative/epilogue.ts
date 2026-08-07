import type { LocKey } from "@/types/content";
import type { FlagValue } from "@/types/events";

export interface EpilogueContext {
  flags: Record<string, FlagValue>;
  beaconsResolved: number;
  ascension: number;
  survivedLethal: boolean;
  axis: number;
  sector: number;
  depth: number;
  death: boolean;
}

export interface EpilogueLine {
  id: string;
  text: LocKey;
  values?: Record<string, number>;
}

export type EpilogueScope = "any" | "deathOnly" | "clearOnly";

export interface EpilogueEntry {
  id: string;
  text: LocKey;
  reads: readonly string[];
  scope?: EpilogueScope;
  applies: (ctx: EpilogueContext) => boolean;
  values?: (ctx: EpilogueContext) => Record<string, number>;
}

const flag = (ctx: EpilogueContext, key: string): boolean =>
  ctx.flags[key] !== undefined;

export const DEATH_TALLY_LINES = 3;

// Nexus-style tally: deed → line, resolved against the run's flag set at the
// epilogue. `reads` is what the flag lint sees, so an entry can never quietly
// stop consuming the flag it was written for. Order here is the order they
// slide in, and the death epilogue takes the first DEATH_TALLY_LINES of them.
export const EPILOGUE_ENTRIES: readonly EpilogueEntry[] = [
  {
    id: "deathDeep",
    text: "content:epilogue.deathDeep",
    reads: [],
    scope: "deathOnly",
    applies: (ctx) => ctx.sector >= 4,
    values: (ctx) => ({ sector: ctx.sector, depth: ctx.depth }),
  },
  {
    id: "deathShallow",
    text: "content:epilogue.deathShallow",
    reads: [],
    scope: "deathOnly",
    applies: (ctx) => ctx.sector <= 2,
    values: (ctx) => ({ sector: ctx.sector, depth: ctx.depth }),
  },
  {
    id: "deathMidway",
    text: "content:epilogue.deathMidway",
    reads: [],
    scope: "deathOnly",
    applies: (ctx) => ctx.sector === 3,
    values: (ctx) => ({ sector: ctx.sector, depth: ctx.depth }),
  },
  {
    id: "maraFriend",
    text: "content:epilogue.maraFriend",
    reads: ["maraFriend", "maraGrudge"],
    applies: (ctx) => flag(ctx, "maraFriend") && !flag(ctx, "maraGrudge"),
  },
  {
    id: "maraGrudge",
    text: "content:epilogue.maraGrudge",
    reads: ["maraGrudge"],
    applies: (ctx) => flag(ctx, "maraGrudge"),
  },
  {
    id: "maraDebt",
    text: "content:epilogue.maraDebt",
    reads: ["maraDebt"],
    applies: (ctx) => flag(ctx, "maraDebt"),
  },
  {
    id: "yusufFriend",
    text: "content:epilogue.yusufFriend",
    reads: ["yusufFriend", "yusufGrudge"],
    applies: (ctx) => flag(ctx, "yusufFriend") && !flag(ctx, "yusufGrudge"),
  },
  {
    id: "yusufGrudge",
    text: "content:epilogue.yusufGrudge",
    reads: ["yusufGrudge"],
    applies: (ctx) => flag(ctx, "yusufGrudge"),
  },
  {
    id: "fleetTruthKept",
    text: "content:epilogue.fleetTruthKept",
    reads: ["fleetTruthKept"],
    applies: (ctx) => flag(ctx, "fleetTruthKept"),
  },
  {
    id: "fleetTruthLost",
    text: "content:epilogue.fleetTruthLost",
    reads: ["fleetTruthLost"],
    applies: (ctx) => flag(ctx, "fleetTruthLost"),
  },
  {
    id: "fleetAnswered",
    text: "content:epilogue.fleetAnswered",
    reads: ["fleetAnswered"],
    applies: (ctx) => flag(ctx, "fleetAnswered"),
  },
  {
    id: "crewSaved",
    text: "content:epilogue.crewSaved",
    reads: ["crewSaved"],
    applies: (ctx) => flag(ctx, "crewSaved"),
  },
  {
    id: "courierFreed",
    text: "content:epilogue.courierFreed",
    reads: ["courierFreed"],
    applies: (ctx) => flag(ctx, "courierFreed"),
  },
  {
    id: "defectorSold",
    text: "content:epilogue.defectorSold",
    reads: ["defectorSold"],
    applies: (ctx) => flag(ctx, "defectorSold"),
  },
  {
    id: "hunterCleared",
    text: "content:epilogue.hunterCleared",
    reads: ["hunterEngaged", "hunterMark"],
    applies: (ctx) => flag(ctx, "hunterEngaged") && !flag(ctx, "hunterMark"),
  },
  {
    id: "refusedChoir",
    text: "content:epilogue.refusedChoir",
    reads: ["refusedChoir"],
    applies: (ctx) => flag(ctx, "refusedChoir"),
  },
  {
    id: "pactSealed",
    text: "content:epilogue.pactSealed",
    reads: ["pactSealed", "pactBroken"],
    applies: (ctx) => flag(ctx, "pactSealed") && !flag(ctx, "pactBroken"),
  },
  {
    id: "pactBroken",
    text: "content:epilogue.pactBroken",
    reads: ["pactBroken"],
    applies: (ctx) => flag(ctx, "pactBroken"),
  },
  {
    id: "choirEnemy",
    text: "content:epilogue.choirEnemy",
    reads: ["choirEnemy"],
    applies: (ctx) => flag(ctx, "choirEnemy"),
  },
  {
    id: "hereticFleetLed",
    text: "content:epilogue.hereticFleetLed",
    reads: ["hereticFleetLed"],
    applies: (ctx) => flag(ctx, "hereticFleetLed"),
  },
  {
    id: "keeperRepaid",
    text: "content:epilogue.keeperRepaid",
    reads: ["keeperRepaid"],
    applies: (ctx) => flag(ctx, "keeperRepaid"),
  },
  {
    id: "keeperSlighted",
    text: "content:epilogue.keeperSlighted",
    reads: ["keeperSlighted", "keeperRepaid"],
    applies: (ctx) => flag(ctx, "keeperSlighted") && !flag(ctx, "keeperRepaid"),
  },
  {
    id: "beaconRebuilt",
    text: "content:epilogue.beaconRebuilt",
    reads: ["beaconRebuilt"],
    applies: (ctx) => flag(ctx, "beaconRebuilt"),
  },
  {
    id: "lighthouseLit",
    text: "content:epilogue.lighthouseLit",
    reads: ["lighthouseLit"],
    applies: (ctx) => flag(ctx, "lighthouseLit"),
  },
  {
    id: "mirrorBound",
    text: "content:epilogue.mirrorBound",
    reads: ["mirrorBound"],
    applies: (ctx) => flag(ctx, "mirrorBound"),
  },
  {
    id: "mirrorBroken",
    text: "content:epilogue.mirrorBroken",
    reads: ["mirrorBroken", "mirrorBound"],
    applies: (ctx) => flag(ctx, "mirrorBroken") && !flag(ctx, "mirrorBound"),
  },
  {
    id: "turnWritten",
    text: "content:epilogue.turnWritten",
    reads: ["turnWritten"],
    applies: (ctx) => flag(ctx, "turnWritten"),
  },
  {
    id: "coreAnswered",
    text: "content:epilogue.coreAnswered",
    reads: ["coreAnswered"],
    applies: (ctx) => flag(ctx, "coreAnswered"),
  },
  {
    id: "coreSilenced",
    text: "content:epilogue.coreSilenced",
    reads: ["coreSilenced"],
    applies: (ctx) => flag(ctx, "coreSilenced"),
  },
  {
    id: "coreListened",
    text: "content:epilogue.coreListened",
    reads: ["coreListened"],
    applies: (ctx) => flag(ctx, "coreListened"),
  },
  {
    id: "picket",
    text: "content:epilogue.picket",
    reads: ["picketHeld", "picketStood"],
    applies: (ctx) => flag(ctx, "picketHeld") || flag(ctx, "picketStood"),
  },
  {
    id: "lastPost",
    text: "content:epilogue.lastPost",
    reads: ["lastPostCleared", "lastPostRelieved", "lastPostRun"],
    applies: (ctx) =>
      flag(ctx, "lastPostCleared") ||
      flag(ctx, "lastPostRelieved") ||
      flag(ctx, "lastPostRun"),
  },
  {
    id: "convoyKept",
    text: "content:epilogue.convoyKept",
    reads: ["convoyCovered", "convoyMoved"],
    applies: (ctx) => flag(ctx, "convoyCovered") || flag(ctx, "convoyMoved"),
  },
  {
    id: "theatreTaken",
    text: "content:epilogue.theatreTaken",
    reads: ["theatreTaken"],
    applies: (ctx) => flag(ctx, "theatreTaken"),
  },
  {
    id: "riftAudit",
    text: "content:epilogue.riftAudit",
    reads: ["auditAccepted", "auditBeaten", "auditBurned"],
    applies: (ctx) =>
      flag(ctx, "auditAccepted") || flag(ctx, "auditBeaten") || flag(ctx, "auditBurned"),
  },
  {
    id: "doubleAtDoor",
    text: "content:epilogue.doubleAtDoor",
    reads: ["doubleAhead", "doubleNamed", "doubleJoined"],
    applies: (ctx) =>
      flag(ctx, "doubleAhead") || flag(ctx, "doubleNamed") || flag(ctx, "doubleJoined"),
  },
  {
    id: "choirChildren",
    text: "content:epilogue.choirChildren",
    reads: ["childrenTaken", "childrenJoined"],
    applies: (ctx) => flag(ctx, "childrenTaken") || flag(ctx, "childrenJoined"),
  },
  {
    id: "tallyCarried",
    text: "content:epilogue.tallyCarried",
    reads: ["namesRead", "namesKept"],
    applies: (ctx) => flag(ctx, "namesRead") || flag(ctx, "namesKept"),
  },
  {
    id: "tallyBurned",
    text: "content:epilogue.tallyBurned",
    reads: ["namesBurned"],
    applies: (ctx) => flag(ctx, "namesBurned"),
  },
  {
    id: "coreSilence",
    text: "content:epilogue.coreSilence",
    reads: ["silenceAnswered", "silenceRefused"],
    applies: (ctx) => flag(ctx, "silenceAnswered") || flag(ctx, "silenceRefused"),
  },
  {
    id: "lastYard",
    text: "content:epilogue.lastYard",
    reads: ["lastYardUsed", "lastYardWarned", "lastYardCrew"],
    applies: (ctx) =>
      flag(ctx, "lastYardUsed") || flag(ctx, "lastYardWarned") || flag(ctx, "lastYardCrew"),
  },
  {
    id: "thresholdStall",
    text: "content:epilogue.thresholdStall",
    reads: ["thresholdBought", "thresholdAsked", "thresholdStocked"],
    applies: (ctx) =>
      flag(ctx, "thresholdBought") ||
      flag(ctx, "thresholdAsked") ||
      flag(ctx, "thresholdStocked"),
  },
  {
    id: "ledgerTorn",
    text: "content:epilogue.ledgerTorn",
    reads: ["ledgerTorn"],
    applies: (ctx) => flag(ctx, "ledgerTorn"),
  },
  {
    id: "beacons",
    text: "content:epilogue.beacons",
    reads: [],
    applies: (ctx) => ctx.beaconsResolved > 0,
    values: (ctx) => ({ n: ctx.beaconsResolved }),
  },
  {
    id: "axisResonant",
    text: "content:epilogue.axisResonant",
    reads: [],
    applies: (ctx) => ctx.axis <= -6,
    values: (ctx) => ({ n: -ctx.axis }),
  },
  {
    id: "axisStable",
    text: "content:epilogue.axisStable",
    reads: [],
    applies: (ctx) => ctx.axis >= 6,
    values: (ctx) => ({ n: ctx.axis }),
  },
  {
    id: "ascension",
    text: "content:epilogue.ascension",
    reads: [],
    applies: (ctx) => ctx.ascension > 0,
    values: (ctx) => ({ n: ctx.ascension }),
  },
  {
    id: "lastBreath",
    text: "content:epilogue.lastBreath",
    reads: ["survivedLethal"],
    applies: (ctx) => ctx.survivedLethal,
  },
];

export const EPILOGUE_EMPTY: LocKey = "content:epilogue.quiet";
export const EPILOGUE_DEATH_EMPTY: LocKey = "content:epilogue.deathQuiet";

const inScope = (entry: EpilogueEntry, death: boolean): boolean => {
  const scope = entry.scope ?? "any";
  if (scope === "any") return true;
  return scope === "deathOnly" ? death : !death;
};

export const buildEpilogue = (
  ctx: EpilogueContext,
  limit?: number,
): EpilogueLine[] => {
  const lines = EPILOGUE_ENTRIES.filter(
    (entry) => inScope(entry, ctx.death) && entry.applies(ctx),
  ).map((entry) => ({
    id: entry.id,
    text: entry.text,
    values: entry.values?.(ctx),
  }));
  const capped = limit === undefined ? lines : lines.slice(0, limit);
  return capped.length > 0
    ? capped
    : [{ id: "quiet", text: ctx.death ? EPILOGUE_DEATH_EMPTY : EPILOGUE_EMPTY }];
};
