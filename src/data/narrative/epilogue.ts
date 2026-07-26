import type { LocKey } from "@/types/content";
import type { FlagValue } from "@/types/events";

export interface EpilogueContext {
  flags: Record<string, FlagValue>;
  beaconsResolved: number;
  ascension: number;
  survivedLethal: boolean;
  axis: number;
}

export interface EpilogueLine {
  id: string;
  text: LocKey;
  values?: Record<string, number>;
}

export interface EpilogueEntry {
  id: string;
  text: LocKey;
  applies: (ctx: EpilogueContext) => boolean;
  values?: (ctx: EpilogueContext) => Record<string, number>;
}

const flag = (ctx: EpilogueContext, key: string): boolean =>
  ctx.flags[key] !== undefined;

// Nexus-style tally: twelve deed→line mappings, resolved against the run's flag
// set at the epilogue. Order here is the order they slide in.
export const EPILOGUE_ENTRIES: readonly EpilogueEntry[] = [
  {
    id: "maraFriend",
    text: "content:epilogue.maraFriend",
    applies: (ctx) => flag(ctx, "maraFriend"),
  },
  {
    id: "yusufFriend",
    text: "content:epilogue.yusufFriend",
    applies: (ctx) => flag(ctx, "yusufFriend") && !flag(ctx, "yusufGrudge"),
  },
  {
    id: "yusufGrudge",
    text: "content:epilogue.yusufGrudge",
    applies: (ctx) => flag(ctx, "yusufGrudge"),
  },
  {
    id: "crewSaved",
    text: "content:epilogue.crewSaved",
    applies: (ctx) => flag(ctx, "crewSaved"),
  },
  {
    id: "courierFreed",
    text: "content:epilogue.courierFreed",
    applies: (ctx) => flag(ctx, "courierFreed"),
  },
  {
    id: "hunterCleared",
    text: "content:epilogue.hunterCleared",
    applies: (ctx) => flag(ctx, "hunterEngaged") && !flag(ctx, "hunterMark"),
  },
  {
    id: "refusedChoir",
    text: "content:epilogue.refusedChoir",
    applies: (ctx) => flag(ctx, "refusedChoir"),
  },
  {
    id: "pactSealed",
    text: "content:epilogue.pactSealed",
    applies: (ctx) => flag(ctx, "pactSealed"),
  },
  {
    id: "choirEnemy",
    text: "content:epilogue.choirEnemy",
    applies: (ctx) => flag(ctx, "choirEnemy"),
  },
  {
    id: "beacons",
    text: "content:epilogue.beacons",
    applies: (ctx) => ctx.beaconsResolved > 0,
    values: (ctx) => ({ n: ctx.beaconsResolved }),
  },
  {
    id: "ascension",
    text: "content:epilogue.ascension",
    applies: (ctx) => ctx.ascension > 0,
    values: (ctx) => ({ n: ctx.ascension }),
  },
  {
    id: "lastBreath",
    text: "content:epilogue.lastBreath",
    applies: (ctx) => ctx.survivedLethal,
  },
];

export const EPILOGUE_EMPTY: LocKey = "content:epilogue.quiet";

export const buildEpilogue = (ctx: EpilogueContext): EpilogueLine[] => {
  const lines = EPILOGUE_ENTRIES.filter((entry) => entry.applies(ctx)).map(
    (entry) => ({
      id: entry.id,
      text: entry.text,
      values: entry.values?.(ctx),
    }),
  );
  return lines.length > 0
    ? lines
    : [{ id: "quiet", text: EPILOGUE_EMPTY }];
};
