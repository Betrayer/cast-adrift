import type { LocKey } from "@/types/content";
import type { FlagValue } from "@/types/events";

export type EndingId = "seal" | "merge" | "bargain" | "silent";

export interface EndingContext {
  axis: number;
  flags: Record<string, FlagValue>;
  beaconsResolved: number;
}

export interface EndingDef {
  id: EndingId;
  title: LocKey;
  label: LocKey;
  requirement: LocKey;
  beats: readonly LocKey[];
  echoLine: LocKey;
  qualifies: (ctx: EndingContext) => boolean;
}

const has = (ctx: EndingContext, key: string): boolean =>
  ctx.flags[key] !== undefined;

const beats = (id: string, n: number): LocKey[] =>
  Array.from({ length: n }, (_, i) => `content:ending.${id}.beat${String(i + 1)}`);

export const ENDINGS: readonly EndingDef[] = [
  {
    id: "seal",
    title: "content:ending.seal.title",
    label: "content:ending.seal.label",
    requirement: "content:ending.seal.req",
    beats: beats("seal", 4),
    echoLine: "content:ending.seal.echo",
    qualifies: (ctx) => ctx.axis >= 3,
  },
  {
    id: "merge",
    title: "content:ending.merge.title",
    label: "content:ending.merge.label",
    requirement: "content:ending.merge.req",
    beats: beats("merge", 4),
    echoLine: "content:ending.merge.echo",
    qualifies: (ctx) => ctx.axis <= -3,
  },
  {
    id: "bargain",
    title: "content:ending.bargain.title",
    label: "content:ending.bargain.label",
    requirement: "content:ending.bargain.req",
    beats: beats("bargain", 3),
    echoLine: "content:ending.bargain.echo",
    qualifies: (ctx) => has(ctx, "pactSealed"),
  },
  {
    id: "silent",
    title: "content:ending.silent.title",
    label: "content:ending.silent.label",
    requirement: "content:ending.silent.req",
    beats: beats("silent", 4),
    echoLine: "content:ending.silent.echo",
    qualifies: (ctx) =>
      has(ctx, "silentReady") &&
      ctx.beaconsResolved >= 5 &&
      (has(ctx, "crewSaved") || has(ctx, "courierFreed")),
  },
];

export const ENDING_BY_ID: ReadonlyMap<string, EndingDef> = new Map(
  ENDINGS.map((e) => [e.id, e]),
);

export const earnedEndings = (ctx: EndingContext): EndingDef[] =>
  ENDINGS.filter((e) => e.qualifies(ctx));

// Rare fallback (Task 6 step 1): nobody qualified, so the axis sign decides the
// fork and Echo says out loud how thin the margin was.
export const fallbackEndings = (ctx: EndingContext): EndingDef[] => {
  const seal = ENDING_BY_ID.get("seal");
  const merge = ENDING_BY_ID.get("merge");
  if (seal === undefined || merge === undefined) return [];
  return ctx.axis >= 0 ? [seal, merge] : [merge, seal];
};

export const finaleOptions = (
  ctx: EndingContext,
): { options: EndingDef[]; thin: boolean } => {
  const earned = earnedEndings(ctx);
  if (earned.length > 0) return { options: earned, thin: false };
  return { options: fallbackEndings(ctx), thin: true };
};
