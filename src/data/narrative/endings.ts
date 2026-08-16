import type { LocKey } from "@/types/content";
import type { FlagValue } from "@/types/events";

export type EndingId = "seal" | "merge" | "bargain" | "silent" | "answer";

export interface EndingContext {
  axis: number;
  flags: Record<string, FlagValue>;
  beaconsResolved: number;
  crossedThreshold?: boolean;
  echoArcComplete?: boolean;
}

export interface EndingVariant {
  id: string;
  at: number;
  text: LocKey;
  reads: readonly string[];
  when: (ctx: EndingContext) => boolean;
}

export interface EndingDef {
  id: EndingId;
  title: LocKey;
  label: LocKey;
  requirement: LocKey;
  beats: readonly LocKey[];
  deepBeats?: readonly LocKey[];
  echoLine: LocKey;
  reads: readonly string[];
  variants?: readonly EndingVariant[];
  qualifies: (ctx: EndingContext) => boolean;
}

const has = (ctx: EndingContext, key: string): boolean =>
  ctx.flags[key] !== undefined;

const beats = (id: string, n: number): LocKey[] =>
  Array.from({ length: n }, (_, i) => `content:ending.${id}.beat${String(i + 1)}`);

const deepBeats = (id: string, n: number): LocKey[] =>
  Array.from({ length: n }, (_, i) => `content:ending.${id}.deep${String(i + 1)}`);

const variant = (
  ending: string,
  id: string,
  at: number,
  key: string,
): EndingVariant => ({
  id: `${ending}-${id}`,
  at,
  text: `content:ending.${ending}.var.${id}`,
  reads: [key],
  when: (ctx) => has(ctx, key),
});

export const TRUE_ENDING_AXIS = 2;

export const answerQualifies = (ctx: EndingContext): boolean =>
  ctx.crossedThreshold === true &&
  ctx.echoArcComplete === true &&
  ctx.beaconsResolved >= 5 &&
  Math.abs(ctx.axis) <= TRUE_ENDING_AXIS;

export const ENDINGS: readonly EndingDef[] = [
  {
    id: "seal",
    title: "content:ending.seal.title",
    label: "content:ending.seal.label",
    requirement: "content:ending.seal.req",
    beats: beats("seal", 4),
    deepBeats: deepBeats("seal", 4),
    echoLine: "content:ending.seal.echo",
    reads: [],
    variants: [
      variant("seal", "silenced", 2, "coreSilenced"),
      variant("seal", "answered", 2, "coreAnswered"),
    ],
    qualifies: (ctx) => ctx.axis >= 3,
  },
  {
    id: "merge",
    title: "content:ending.merge.title",
    label: "content:ending.merge.label",
    requirement: "content:ending.merge.req",
    beats: beats("merge", 4),
    deepBeats: deepBeats("merge", 4),
    echoLine: "content:ending.merge.echo",
    reads: [],
    variants: [
      variant("merge", "answered", 2, "coreAnswered"),
      variant("merge", "silenced", 2, "coreSilenced"),
      variant("merge", "bound", 1, "mirrorBound"),
    ],
    qualifies: (ctx) => ctx.axis <= -3,
  },
  {
    id: "bargain",
    title: "content:ending.bargain.title",
    label: "content:ending.bargain.label",
    requirement: "content:ending.bargain.req",
    beats: beats("bargain", 3),
    deepBeats: deepBeats("bargain", 3),
    echoLine: "content:ending.bargain.echo",
    reads: ["pactSealed", "bargainReady"],
    variants: [
      variant("bargain", "broken", 1, "pactBroken"),
      variant("bargain", "betrayed", 1, "choirBetrayed"),
    ],
    qualifies: (ctx) => has(ctx, "pactSealed") || has(ctx, "bargainReady"),
  },
  {
    id: "silent",
    title: "content:ending.silent.title",
    label: "content:ending.silent.label",
    requirement: "content:ending.silent.req",
    beats: beats("silent", 4),
    deepBeats: deepBeats("silent", 4),
    echoLine: "content:ending.silent.echo",
    reads: ["silentReady", "crewSaved", "courierFreed"],
    variants: [
      variant("silent", "listened", 2, "coreListened"),
      variant("silent", "rebuilt", 3, "beaconRebuilt"),
    ],
    qualifies: (ctx) =>
      has(ctx, "silentReady") &&
      ctx.beaconsResolved >= 5 &&
      (has(ctx, "crewSaved") || has(ctx, "courierFreed")),
  },
  {
    id: "answer",
    title: "content:ending.answer.title",
    label: "content:ending.answer.label",
    requirement: "content:ending.answer.req",
    beats: beats("answer", 6),
    echoLine: "content:ending.answer.echo",
    reads: ["thresholdHeard"],
    variants: [variant("answer", "heard", 4, "thresholdHeard")],
    qualifies: answerQualifies,
  },
];

export const ENDING_BY_ID: ReadonlyMap<string, EndingDef> = new Map(
  ENDINGS.map((e) => [e.id, e]),
);

export const STANDARD_ENDINGS: readonly EndingDef[] = ENDINGS.filter(
  (e) => e.id !== "answer",
);

export const endingBeats = (
  def: EndingDef,
  ctx: EndingContext,
): readonly LocKey[] => {
  const out =
    ctx.crossedThreshold === true && def.deepBeats !== undefined
      ? [...def.deepBeats]
      : [...def.beats];
  const used = new Set<number>();
  for (const v of def.variants ?? []) {
    if (used.has(v.at)) continue;
    if (!v.when(ctx)) continue;
    if (v.at < 0 || v.at >= out.length) continue;
    out[v.at] = v.text;
    used.add(v.at);
  }
  return out;
};

export const earnedEndings = (ctx: EndingContext): EndingDef[] =>
  ENDINGS.filter((e) => e.qualifies(ctx));

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
