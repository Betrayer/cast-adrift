import { BEACON_TOTAL, beaconsResolved } from "@/data/events/beacons";
import { NO_BATTLE_TURNS, type RunStats } from "@/stores/runStore";
import type { FlagValue } from "@/types/events";

export type GoalSpec =
  | { g: "win" }
  | { g: "hullPctAtLeast"; n: number }
  | { g: "hullNeverBelowPct"; n: number }
  | { g: "noShipyardVisits" }
  | { g: "burnKillElite" }
  | { g: "jumpsAtMost"; n: number }
  | { g: "shieldAbsorbedAtLeast"; n: number }
  | { g: "scrapAtLeast"; n: number }
  | { g: "boughtNothing" }
  | { g: "spinalHitAtLeast"; n: number }
  | { g: "fastBattleTurnsAtMost"; n: number }
  | { g: "repairBayHealAtLeast"; n: number }
  | { g: "fullHullBattleEndsAtLeast"; n: number }
  | { g: "minibossKilled" }
  | { g: "noRerolls" }
  | { g: "elitesAtLeast"; n: number }
  | { g: "depthWithDeckAtLeast"; depth: number; deck: number }
  | { g: "beaconResolved" }
  | { g: "anomaliesSolvedAtLeast"; n: number }
  | { g: "blackPlacedInWinAtLeast"; n: number }
  | { g: "axisAtMost"; n: number }
  | { g: "allBeaconsResolved" }
  | { g: "deckSchoolsAtLeast"; n: number }
  | { g: "dicePlacedAtMost"; n: number };

export type GoalKind = GoalSpec["g"];

export interface GoalContext {
  win: boolean;
  stats: RunStats;
  hull: number;
  hullMax: number;
  scrap: number;
  deckSize: number;
  deckSchools: number;
  axis: number;
  solvedPuzzles: readonly string[];
  flags: Record<string, FlagValue>;
}

const hullPct = (ctx: GoalContext): number =>
  ctx.hullMax <= 0 ? 0 : (ctx.hull / ctx.hullMax) * 100;

// Every goal is a pure read of the run's own tally — no goal ever touches a
// store, so a scripted run and a real one score identically.
export const evaluateGoal = (spec: GoalSpec, ctx: GoalContext): boolean => {
  switch (spec.g) {
    case "win":
      return ctx.win;
    case "hullPctAtLeast":
      return hullPct(ctx) >= spec.n;
    case "hullNeverBelowPct":
      return ctx.stats.hullPctMin >= spec.n;
    case "noShipyardVisits":
      return ctx.stats.shipyardVisits === 0;
    case "burnKillElite":
      return ctx.stats.burnKillElites > 0;
    case "jumpsAtMost":
      return ctx.stats.jumps <= spec.n;
    case "shieldAbsorbedAtLeast":
      return ctx.stats.shieldAbsorbed >= spec.n;
    case "scrapAtLeast":
      return ctx.scrap >= spec.n;
    case "boughtNothing":
      return ctx.stats.scrapSpent === 0;
    case "spinalHitAtLeast":
      return ctx.stats.spinalMaxHit >= spec.n;
    case "fastBattleTurnsAtMost":
      return (
        ctx.stats.minBattleTurns !== NO_BATTLE_TURNS &&
        ctx.stats.minBattleTurns <= spec.n
      );
    case "repairBayHealAtLeast":
      return ctx.stats.repairBayHealed >= spec.n;
    case "fullHullBattleEndsAtLeast":
      return ctx.stats.fullHullBattleEnds >= spec.n;
    case "minibossKilled":
      return ctx.stats.minibosses > 0;
    case "noRerolls":
      return ctx.stats.rerollsUsed === 0;
    case "elitesAtLeast":
      return ctx.stats.elites >= spec.n;
    case "depthWithDeckAtLeast":
      return ctx.stats.depth >= spec.depth && ctx.deckSize >= spec.deck;
    case "beaconResolved":
      return beaconsResolved(ctx.flags) > 0;
    case "anomaliesSolvedAtLeast":
      return ctx.solvedPuzzles.length >= spec.n;
    case "blackPlacedInWinAtLeast":
      return ctx.stats.maxBlackPlacedWin >= spec.n;
    case "axisAtMost":
      return ctx.axis <= spec.n;
    case "allBeaconsResolved":
      return beaconsResolved(ctx.flags) >= BEACON_TOTAL;
    case "deckSchoolsAtLeast":
      return ctx.deckSchools >= spec.n;
    case "dicePlacedAtMost":
      return ctx.stats.dicePlaced <= spec.n;
  }
};

// Goals that only make sense on a completed run: a contract you died in never
// awards them, even if the counter happens to be satisfied.
const WIN_ONLY: ReadonlySet<GoalKind> = new Set<GoalKind>([
  "win",
  "hullPctAtLeast",
  "scrapAtLeast",
  "axisAtMost",
  "depthWithDeckAtLeast",
  "allBeaconsResolved",
  "deckSchoolsAtLeast",
  "dicePlacedAtMost",
]);

export const goalMet = (spec: GoalSpec, ctx: GoalContext): boolean => {
  if (WIN_ONLY.has(spec.g) && !ctx.win) return false;
  return evaluateGoal(spec, ctx);
};

export const goalStarsMask = (
  goals: readonly GoalSpec[],
  ctx: GoalContext,
): number => {
  let mask = 0;
  goals.forEach((spec, index) => {
    if (goalMet(spec, ctx)) mask |= 1 << index;
  });
  return mask;
};

export const countStars = (mask: number): number => {
  let n = 0;
  for (let bit = 0; bit < 3; bit += 1) {
    if ((mask & (1 << bit)) !== 0) n += 1;
  }
  return n;
};

export const newStars = (previous: number, earned: number): number =>
  countStars(earned & ~previous);

export const goalAmount = (spec: GoalSpec): number | undefined => {
  if ("n" in spec) return spec.n;
  if (spec.g === "depthWithDeckAtLeast") return spec.depth;
  return undefined;
};

export const goalSecondary = (spec: GoalSpec): number | undefined =>
  spec.g === "depthWithDeckAtLeast" ? spec.deck : undefined;
