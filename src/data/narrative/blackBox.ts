import { flag, type EpilogueContext } from "@/data/narrative/epilogue";
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

const epitaph = (
  id: string,
  body: Omit<BlackBoxEpitaph, "id" | "text">,
): BlackBoxEpitaph => ({
  id,
  text: `content:blackbox.${id}`,
  ...body,
});

export const VETERAN_RIDES = 5;
export const CAUTIOUS_BYPASSES = 3;
export const THIN_HULL_PARTS = 4;
export const BEYOND_SECTOR = 6;
export const RESONANT_AXIS = -5;

export const BLACK_BOX_EPITAPHS: readonly BlackBoxEpitaph[] = [
  epitaph("firstRun", {
    reads: ["prologueRun"],
    applies: (ctx) => flag(ctx, "prologueRun"),
  }),
  epitaph("beyond", {
    reads: [],
    applies: (ctx) => ctx.sector >= BEYOND_SECTOR,
  }),
  epitaph("veteran", {
    reads: [],
    applies: (ctx) => ctx.rides >= VETERAN_RIDES,
  }),
  epitaph("pact", {
    reads: ["pactSealed", "choirEnemy"],
    applies: (ctx) => flag(ctx, "pactSealed") || flag(ctx, "choirEnemy"),
  }),
  epitaph("cautious", {
    reads: [],
    applies: (ctx) => ctx.bypassed >= CAUTIOUS_BYPASSES,
  }),
  epitaph("resonant", {
    reads: [],
    applies: (ctx) => ctx.axis <= RESONANT_AXIS,
  }),
  epitaph("thin", {
    reads: [],
    applies: (ctx) => ctx.hull * THIN_HULL_PARTS <= ctx.hullMax,
  }),
  epitaph("whole", {
    reads: [],
    applies: (ctx) => ctx.hull >= ctx.hullMax,
  }),
  epitaph("quiet", {
    reads: [],
    applies: () => true,
  }),
];

export const epitaphFor = (ctx: BlackBoxContext): LocKey =>
  BLACK_BOX_EPITAPHS.find((line) => line.applies(ctx))?.text ??
  "content:blackbox.quiet";
