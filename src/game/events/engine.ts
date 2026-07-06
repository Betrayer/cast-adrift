import type { MkLevel } from "@/data/slots";
import type { RngStream } from "@/services/rng";
import type { SlotId } from "@/types/battle";
import type { DieTier, School } from "@/types/content";
import type {
  EventDef,
  EventKind,
  EventOption,
  FlagQuery,
  FlagValue,
  OptionRequirement,
  Outcome,
} from "@/types/events";

export interface EventContext {
  sector: number;
  axis: number;
  flags: Record<string, FlagValue>;
  seenEvents: readonly string[];
}

export interface DeckDie {
  school: School;
  tier: DieTier;
}

export interface OptionContext {
  scrap: number;
  hull: number;
  deck: readonly DeckDie[];
  mkLevels: Partial<Record<SlotId, MkLevel>>;
  flags: Record<string, FlagValue>;
}

export const flagPresent = (
  flags: Record<string, FlagValue>,
  key: string,
): boolean => flags[key] !== undefined;

export const matchesFlagQuery = (
  flags: Record<string, FlagValue>,
  query: FlagQuery | undefined,
): boolean => {
  if (query === undefined) return true;
  if (query.all !== undefined && !query.all.every((k) => flagPresent(flags, k)))
    return false;
  if (query.any !== undefined && !query.any.some((k) => flagPresent(flags, k)))
    return false;
  if (query.not !== undefined && query.not.some((k) => flagPresent(flags, k)))
    return false;
  return true;
};

export const eventEligible = (def: EventDef, ctx: EventContext): boolean => {
  if (ctx.seenEvents.includes(def.id)) return false;
  const r = def.requires;
  if (r === undefined) return true;
  if (r.sector !== undefined && !r.sector.includes(ctx.sector)) return false;
  if (
    r.resonance !== undefined &&
    (ctx.axis < r.resonance[0] || ctx.axis > r.resonance[1])
  )
    return false;
  return matchesFlagQuery(ctx.flags, r.flags);
};

export const eventKind = (def: EventDef): EventKind => def.kind ?? "event";

export const eligibleEvents = (
  pool: readonly EventDef[],
  ctx: EventContext,
  kind: EventKind,
): EventDef[] =>
  pool.filter((e) => eventKind(e) === kind && eventEligible(e, ctx));

export const pickEvent = (
  pool: readonly EventDef[],
  ctx: EventContext,
  kind: EventKind,
  stream: RngStream,
): EventDef | null => {
  const eligible = eligibleEvents(pool, ctx, kind);
  if (eligible.length === 0) return null;
  if (eligible.length === 1) return eligible[0] ?? null;
  return stream.weighted(eligible.map((e) => [e, e.weight] as const));
};

export const outcomeWeight = (outcome: Outcome): number => outcome.weight ?? 1;

export const selectOutcome = (
  outcomes: readonly Outcome[],
  stream: RngStream,
): Outcome | null => {
  if (outcomes.length === 0) return null;
  if (outcomes.length === 1) return outcomes[0] ?? null;
  return stream.weighted(outcomes.map((o) => [o, outcomeWeight(o)] as const));
};

export const optionMet = (
  req: OptionRequirement | undefined,
  ctx: OptionContext,
): boolean => {
  if (req === undefined) return true;
  switch (req.req) {
    case "scrap":
      return ctx.scrap >= req.n;
    case "hull":
      return ctx.hull >= req.n;
    case "school":
      return (
        ctx.deck.filter(
          (d) => d.school === req.school || d.school === "prismatic",
        ).length >= req.n
      );
    case "dieTier":
      return ctx.deck.some((d) => d.tier === req.tier);
    case "dieSchool":
      return ctx.deck.some(
        (d) => d.school === req.school || d.school === "prismatic",
      );
    case "mk":
      return (ctx.mkLevels[req.slot] ?? 1) >= req.mk;
    case "flag":
      return flagPresent(ctx.flags, req.key);
  }
};

export const optionOutcomes = (
  option: EventOption,
  passed: boolean | null,
): readonly Outcome[] => {
  if (option.check === undefined) return option.outcomes ?? [];
  if (passed === true) return option.onPass ?? [];
  if (passed === false) return option.onFail ?? [];
  return [];
};
