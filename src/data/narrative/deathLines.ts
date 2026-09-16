import { flag, type EpilogueContext } from "@/data/narrative/epilogue";
import type { LocKey } from "@/types/content";

export interface DeathLine {
  id: string;
  text: LocKey;
  reads: readonly string[];
  applies: (ctx: EpilogueContext) => boolean;
}

const death = (
  id: string,
  body: Omit<DeathLine, "id" | "text">,
): DeathLine => ({
  id,
  text: `content:death.${id}`,
  ...body,
});

export const DEATH_LINES: readonly DeathLine[] = [
  death("pact", {
    reads: ["pactSealed", "pactStep1"],
    applies: (ctx) => flag(ctx, "pactSealed") || flag(ctx, "pactStep1"),
  }),
  death("beacons", {
    reads: [],
    applies: (ctx) => ctx.beaconsResolved >= 3,
  }),
  death("resonant", {
    reads: [],
    applies: (ctx) => ctx.axis <= -5,
  }),
  death("stable", {
    reads: [],
    applies: (ctx) => ctx.axis >= 5,
  }),
  death("alone", {
    reads: ["maraGrudge", "yusufGrudge", "choirEnemy"],
    applies: (ctx) =>
      flag(ctx, "maraGrudge") || flag(ctx, "yusufGrudge") || flag(ctx, "choirEnemy"),
  }),
  death("friends", {
    reads: ["maraFriend", "yusufFriend"],
    applies: (ctx) => flag(ctx, "maraFriend") || flag(ctx, "yusufFriend"),
  }),
  death("deep", {
    reads: [],
    applies: (ctx) => ctx.sector >= 4,
  }),
  death("firstRun", {
    reads: ["prologueRun"],
    applies: (ctx) => flag(ctx, "prologueRun"),
  }),
  death("quiet", {
    reads: [],
    applies: () => true,
  }),
];

export const deathLineFor = (ctx: EpilogueContext): LocKey =>
  DEATH_LINES.find((line) => line.applies(ctx))?.text ?? "content:death.quiet";
