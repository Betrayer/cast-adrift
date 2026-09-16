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
  crossedThreshold?: boolean;
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

export const flag = (ctx: EpilogueContext, key: string): boolean =>
  ctx.flags[key] !== undefined;

const epi = (
  id: string,
  body: Omit<EpilogueEntry, "id" | "text">,
): EpilogueEntry => ({
  id,
  text: `content:epilogue.${id}`,
  ...body,
});

const whenFlag = (id: string): EpilogueEntry =>
  epi(id, { reads: [id], applies: (ctx) => flag(ctx, id) });

export const DEATH_TALLY_LINES = 3;

export const EPILOGUE_ENTRIES: readonly EpilogueEntry[] = [
  epi("deathDeep", {
    reads: [],
    scope: "deathOnly",
    applies: (ctx) => ctx.sector >= 4,
    values: (ctx) => ({ sector: ctx.sector, depth: ctx.depth }),
  }),
  epi("deathShallow", {
    reads: [],
    scope: "deathOnly",
    applies: (ctx) => ctx.sector <= 2,
    values: (ctx) => ({ sector: ctx.sector, depth: ctx.depth }),
  }),
  epi("deathMidway", {
    reads: [],
    scope: "deathOnly",
    applies: (ctx) => ctx.sector === 3,
    values: (ctx) => ({ sector: ctx.sector, depth: ctx.depth }),
  }),
  epi("maraFriend", {
    reads: ["maraFriend", "maraGrudge"],
    applies: (ctx) => flag(ctx, "maraFriend") && !flag(ctx, "maraGrudge"),
  }),
  whenFlag("maraGrudge"),
  whenFlag("maraDebt"),
  epi("yusufFriend", {
    reads: ["yusufFriend", "yusufGrudge"],
    applies: (ctx) => flag(ctx, "yusufFriend") && !flag(ctx, "yusufGrudge"),
  }),
  whenFlag("yusufGrudge"),
  whenFlag("fleetTruthKept"),
  whenFlag("fleetTruthLost"),
  whenFlag("fleetAnswered"),
  whenFlag("crewSaved"),
  whenFlag("courierFreed"),
  whenFlag("defectorSold"),
  epi("hunterCleared", {
    reads: ["hunterEngaged", "hunterMark"],
    applies: (ctx) => flag(ctx, "hunterEngaged") && !flag(ctx, "hunterMark"),
  }),
  whenFlag("refusedChoir"),
  epi("pactSealed", {
    reads: ["pactSealed", "pactBroken"],
    applies: (ctx) => flag(ctx, "pactSealed") && !flag(ctx, "pactBroken"),
  }),
  whenFlag("pactBroken"),
  whenFlag("choirEnemy"),
  whenFlag("hereticFleetLed"),
  whenFlag("keeperRepaid"),
  epi("keeperSlighted", {
    reads: ["keeperSlighted", "keeperRepaid"],
    applies: (ctx) => flag(ctx, "keeperSlighted") && !flag(ctx, "keeperRepaid"),
  }),
  whenFlag("beaconRebuilt"),
  whenFlag("lighthouseLit"),
  whenFlag("mirrorBound"),
  epi("mirrorBroken", {
    reads: ["mirrorBroken", "mirrorBound"],
    applies: (ctx) => flag(ctx, "mirrorBroken") && !flag(ctx, "mirrorBound"),
  }),
  whenFlag("turnWritten"),
  whenFlag("coreAnswered"),
  whenFlag("coreSilenced"),
  whenFlag("coreListened"),
  epi("picket", {
    reads: ["picketHeld", "picketStood"],
    applies: (ctx) => flag(ctx, "picketHeld") || flag(ctx, "picketStood"),
  }),
  epi("lastPost", {
    reads: ["lastPostCleared", "lastPostRelieved", "lastPostRun"],
    applies: (ctx) =>
      flag(ctx, "lastPostCleared") ||
      flag(ctx, "lastPostRelieved") ||
      flag(ctx, "lastPostRun"),
  }),
  epi("convoyKept", {
    reads: ["convoyCovered", "convoyMoved"],
    applies: (ctx) => flag(ctx, "convoyCovered") || flag(ctx, "convoyMoved"),
  }),
  whenFlag("theatreTaken"),
  epi("riftAudit", {
    reads: ["auditAccepted", "auditBeaten", "auditBurned"],
    applies: (ctx) =>
      flag(ctx, "auditAccepted") || flag(ctx, "auditBeaten") || flag(ctx, "auditBurned"),
  }),
  epi("doubleAtDoor", {
    reads: ["doubleAhead", "doubleNamed", "doubleJoined"],
    applies: (ctx) =>
      flag(ctx, "doubleAhead") || flag(ctx, "doubleNamed") || flag(ctx, "doubleJoined"),
  }),
  epi("choirChildren", {
    reads: ["childrenTaken", "childrenJoined"],
    applies: (ctx) => flag(ctx, "childrenTaken") || flag(ctx, "childrenJoined"),
  }),
  epi("tallyCarried", {
    reads: ["namesRead", "namesKept"],
    applies: (ctx) => flag(ctx, "namesRead") || flag(ctx, "namesKept"),
  }),
  epi("tallyBurned", {
    reads: ["namesBurned"],
    applies: (ctx) => flag(ctx, "namesBurned"),
  }),
  epi("coreSilence", {
    reads: ["silenceAnswered", "silenceRefused"],
    applies: (ctx) => flag(ctx, "silenceAnswered") || flag(ctx, "silenceRefused"),
  }),
  epi("lastYard", {
    reads: ["lastYardUsed", "lastYardWarned", "lastYardCrew"],
    applies: (ctx) =>
      flag(ctx, "lastYardUsed") || flag(ctx, "lastYardWarned") || flag(ctx, "lastYardCrew"),
  }),
  epi("thresholdStall", {
    reads: ["thresholdBought", "thresholdAsked", "thresholdStocked"],
    applies: (ctx) =>
      flag(ctx, "thresholdBought") ||
      flag(ctx, "thresholdAsked") ||
      flag(ctx, "thresholdStocked"),
  }),
  whenFlag("ledgerTorn"),
  epi("beacons", {
    reads: [],
    applies: (ctx) => ctx.beaconsResolved > 0,
    values: (ctx) => ({ n: ctx.beaconsResolved }),
  }),
  epi("axisResonant", {
    reads: [],
    applies: (ctx) => ctx.axis <= -6,
    values: (ctx) => ({ n: -ctx.axis }),
  }),
  epi("axisStable", {
    reads: [],
    applies: (ctx) => ctx.axis >= 6,
    values: (ctx) => ({ n: ctx.axis }),
  }),
  epi("ascension", {
    reads: [],
    applies: (ctx) => ctx.ascension > 0,
    values: (ctx) => ({ n: ctx.ascension }),
  }),
  epi("lastBreath", {
    reads: ["survivedLethal"],
    applies: (ctx) => ctx.survivedLethal,
  }),
  epi("thresholdCrossed", {
    reads: ["crossedThreshold"],
    scope: "clearOnly",
    applies: (ctx) => ctx.crossedThreshold === true,
  }),
  epi("thresholdLost", {
    reads: ["crossedThreshold"],
    scope: "deathOnly",
    applies: (ctx) => ctx.crossedThreshold === true,
  }),
  epi("hushHeard", {
    reads: ["hushHeard", "hushRefused"],
    applies: (ctx) => flag(ctx, "hushHeard") || flag(ctx, "hushRefused"),
  }),
  whenFlag("fleetRemembered"),
  whenFlag("thresholdHeard"),
  epi("balanceHeld", {
    reads: [],
    scope: "clearOnly",
    applies: (ctx) => ctx.crossedThreshold === true && Math.abs(ctx.axis) <= 2,
    values: (ctx) => ({ n: Math.abs(ctx.axis) }),
  }),
  epi("deepSalvage", {
    reads: ["retroTaken", "retroLeft"],
    applies: (ctx) => flag(ctx, "retroTaken") || flag(ctx, "retroLeft"),
  }),
  epi("deepYard", {
    reads: ["maraBeyond", "yardStripped"],
    applies: (ctx) => flag(ctx, "maraBeyond") || flag(ctx, "yardStripped"),
  }),
  epi("deepAudit", {
    reads: ["auditFolded", "auditForged", "auditRefused"],
    applies: (ctx) =>
      flag(ctx, "auditFolded") ||
      flag(ctx, "auditForged") ||
      flag(ctx, "auditRefused"),
  }),
  epi("deepChoir", {
    reads: ["choirQuieted", "choirHeard", "choirCut"],
    applies: (ctx) =>
      flag(ctx, "choirQuieted") || flag(ctx, "choirHeard") || flag(ctx, "choirCut"),
  }),
  epi("deepLog", {
    reads: ["logRead", "logWritten", "logBurned"],
    applies: (ctx) =>
      flag(ctx, "logRead") || flag(ctx, "logWritten") || flag(ctx, "logBurned"),
  }),
  epi("deepStorm", {
    reads: ["stormRidden", "stormAnchored", "stormWaited"],
    applies: (ctx) =>
      flag(ctx, "stormRidden") ||
      flag(ctx, "stormAnchored") ||
      flag(ctx, "stormWaited"),
  }),
  epi("deepTwin", {
    reads: ["twinTraded", "twinWarned", "twinFought", "twinBeaten"],
    applies: (ctx) =>
      flag(ctx, "twinTraded") || flag(ctx, "twinWarned") || flag(ctx, "twinFought"),
  }),
  epi("deepBorrowed", {
    reads: ["turnBorrowed", "turnRepaid", "turnDeclined"],
    applies: (ctx) =>
      flag(ctx, "turnBorrowed") ||
      flag(ctx, "turnRepaid") ||
      flag(ctx, "turnDeclined"),
  }),
  epi("deepKeeper", {
    reads: ["keeperCarried", "keeperRelieved", "keeperLeft"],
    applies: (ctx) =>
      flag(ctx, "keeperCarried") ||
      flag(ctx, "keeperRelieved") ||
      flag(ctx, "keeperLeft"),
  }),
  epi("deepRemainder", {
    reads: ["remainderMeasured", "remainderKept", "remainderReturned"],
    applies: (ctx) =>
      flag(ctx, "remainderMeasured") ||
      flag(ctx, "remainderKept") ||
      flag(ctx, "remainderReturned"),
  }),
  epi("deepFleetLog", {
    reads: ["fleetRecorded", "fleetSilenced"],
    applies: (ctx) => flag(ctx, "fleetRecorded") || flag(ctx, "fleetSilenced"),
  }),
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
