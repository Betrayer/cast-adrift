import type { EpilogueContext } from "@/data/narrative/epilogue";
import type { LocKey } from "@/types/content";

export interface BlackBoxContext extends EpilogueContext {
  rides: number;
  bypassed: number;
  hull: number;
  hullMax: number;
}

export interface BlackBoxEpitaph {
  id: string;
  text: LocKey;
  reads: readonly string[];
  applies: (ctx: BlackBoxContext) => boolean;
}

const flag = (ctx: BlackBoxContext, key: string): boolean =>
  ctx.flags[key] !== undefined;

export const VETERAN_RIDES = 5;
export const CAUTIOUS_BYPASSES = 3;
export const THIN_HULL_PARTS = 4;
export const BEYOND_SECTOR = 6;
export const RESONANT_AXIS = -5;

export const BLACK_BOX_EPITAPHS: readonly BlackBoxEpitaph[] = [
  {
    id: "firstRun",
    text: "content:blackbox.firstRun",
    reads: ["prologueRun"],
    applies: (ctx) => flag(ctx, "prologueRun"),
  },
  {
    id: "beyond",
    text: "content:blackbox.beyond",
    reads: [],
    applies: (ctx) => ctx.sector >= BEYOND_SECTOR,
  },
  {
    id: "veteran",
    text: "content:blackbox.veteran",
    reads: [],
    applies: (ctx) => ctx.rides >= VETERAN_RIDES,
  },
  {
    id: "pact",
    text: "content:blackbox.pact",
    reads: ["pactSealed", "choirEnemy"],
    applies: (ctx) => flag(ctx, "pactSealed") || flag(ctx, "choirEnemy"),
  },
  {
    id: "cautious",
    text: "content:blackbox.cautious",
    reads: [],
    applies: (ctx) => ctx.bypassed >= CAUTIOUS_BYPASSES,
  },
  {
    id: "resonant",
    text: "content:blackbox.resonant",
    reads: [],
    applies: (ctx) => ctx.axis <= RESONANT_AXIS,
  },
  {
    id: "thin",
    text: "content:blackbox.thin",
    reads: [],
    applies: (ctx) => ctx.hull * THIN_HULL_PARTS <= ctx.hullMax,
  },
  {
    id: "whole",
    text: "content:blackbox.whole",
    reads: [],
    applies: (ctx) => ctx.hull >= ctx.hullMax,
  },
  {
    id: "quiet",
    text: "content:blackbox.quiet",
    reads: [],
    applies: () => true,
  },
];

export const epitaphFor = (ctx: BlackBoxContext): LocKey =>
  BLACK_BOX_EPITAPHS.find((line) => line.applies(ctx))?.text ??
  "content:blackbox.quiet";
