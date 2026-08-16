import type { EpilogueContext } from "@/data/narrative/epilogue";
import type { LocKey } from "@/types/content";

export interface DeathLine {
  id: string;
  text: LocKey;
  reads: readonly string[];
  applies: (ctx: EpilogueContext) => boolean;
}

const flag = (ctx: EpilogueContext, key: string): boolean =>
  ctx.flags[key] !== undefined;

export const DEATH_LINES: readonly DeathLine[] = [
  {
    id: "pact",
    text: "content:death.pact",
    reads: ["pactSealed", "pactStep1"],
    applies: (ctx) => flag(ctx, "pactSealed") || flag(ctx, "pactStep1"),
  },
  {
    id: "beacons",
    text: "content:death.beacons",
    reads: [],
    applies: (ctx) => ctx.beaconsResolved >= 3,
  },
  {
    id: "resonant",
    text: "content:death.resonant",
    reads: [],
    applies: (ctx) => ctx.axis <= -5,
  },
  {
    id: "stable",
    text: "content:death.stable",
    reads: [],
    applies: (ctx) => ctx.axis >= 5,
  },
  {
    id: "alone",
    text: "content:death.alone",
    reads: ["maraGrudge", "yusufGrudge", "choirEnemy"],
    applies: (ctx) =>
      flag(ctx, "maraGrudge") || flag(ctx, "yusufGrudge") || flag(ctx, "choirEnemy"),
  },
  {
    id: "friends",
    text: "content:death.friends",
    reads: ["maraFriend", "yusufFriend"],
    applies: (ctx) => flag(ctx, "maraFriend") || flag(ctx, "yusufFriend"),
  },
  {
    id: "deep",
    text: "content:death.deep",
    reads: [],
    applies: (ctx) => ctx.sector >= 4,
  },
  {
    id: "firstRun",
    text: "content:death.firstRun",
    reads: ["prologueRun"],
    applies: (ctx) => flag(ctx, "prologueRun"),
  },
  {
    id: "quiet",
    text: "content:death.quiet",
    reads: [],
    applies: () => true,
  },
];

export const deathLineFor = (ctx: EpilogueContext): LocKey =>
  DEATH_LINES.find((line) => line.applies(ctx))?.text ?? "content:death.quiet";
