import type { ContentTag } from "@/data/tags";
import type { EffectDef } from "@/game/effects/types";

export type LocKey = string;

export type School =
  | "red"
  | "blue"
  | "green"
  | "grey"
  | "yellow"
  | "black"
  | "prismatic";

export type DieTier = 4 | 6 | 8 | 10 | 12 | 20 | 100;

export type Rarity = "common" | "uncommon" | "rare" | "legendary";

export interface DieGrowth {
  perMax: number;
  cap: number;
}

export type DieActive = "flip" | "copy" | "swap" | "bank" | "split";

export interface DieItemDef {
  id: string;
  name: LocKey;
  tier: DieTier;
  school: School;
  rarity: Rarity;
  pts: number;
  desc?: LocKey;
  effects?: readonly EffectDef[];
  faces?: readonly number[];
  growth?: DieGrowth;
  active?: DieActive;
  tags?: readonly ContentTag[];
}

export type Intent =
  | { t: "attack"; n: number; self?: number }
  | { t: "shield"; n: number }
  | { t: "shieldAll"; n: number }
  | { t: "multi"; n: number; k: number }
  | { t: "charge" }
  | { t: "jamSlot"; k?: number }
  | { t: "lockDie"; target?: "highest" }
  | { t: "summon"; id: string }
  | { t: "healAllies"; n: number }
  | { t: "mirrorHalf" }
  | { t: "stealScrap"; n: number }
  | { t: "capShrink" }
  | { t: "twistDie" }
  | { t: "swapValues" }
  | { t: "storm" }
  | { t: "curseDie"; n: number }
  | { t: "shieldGate"; n: number }
  | { t: "mirrorSchool" }
  | { t: "drainCharge"; n: number }
  | { t: "siphonShield"; n: number }
  | { t: "bargain"; n: number; heal: number }
  | { t: "enrage"; n: number }
  | { t: "hijack" }
  | { t: "echoTotal"; cap: number }
  | { t: "foldOrder" }
  | { t: "devourDie" };

export type IntentKind = Intent["t"];

export const INTENT_KINDS: readonly IntentKind[] = [
  "attack",
  "shield",
  "shieldAll",
  "multi",
  "charge",
  "jamSlot",
  "lockDie",
  "summon",
  "healAllies",
  "mirrorHalf",
  "stealScrap",
  "capShrink",
  "twistDie",
  "swapValues",
  "storm",
  "curseDie",
  "shieldGate",
  "mirrorSchool",
  "drainCharge",
  "siphonShield",
  "bargain",
  "enrage",
  "hijack",
  "echoTotal",
  "foldOrder",
  "devourDie",
];

export type StepCond =
  | { c: "selfHpPctLt"; n: number }
  | { c: "selfShielded" }
  | { c: "playerShielded" }
  | { c: "playerChargeAtLeast"; n: number }
  | { c: "playerHullPctLt"; n: number }
  | { c: "alliesAtLeast"; n: number }
  | { c: "turnGte"; n: number };

export type PatternStep =
  | Intent
  | { pick: readonly (readonly [Intent, number])[] }
  | { when: StepCond; then: Intent; else: Intent };

export type SubsystemAura =
  | "atk+2"
  | "atk+3"
  | "shieldAllies3"
  | "shieldSelf6"
  | "lockEachTurn"
  | "lockEvery3"
  | "twistEachTurn"
  | "chargeAllies"
  | "summonEvery4"
  | "stealOnHit6";

export interface SubsystemDef {
  id: string;
  name: LocKey;
  hp: number;
  aura: SubsystemAura;
}

export type SlotId =
  | "weaponA"
  | "weaponB"
  | "spinal"
  | "shields"
  | "shieldsB"
  | "engines"
  | "sensors"
  | "reactor"
  | "repairBay";

export type OnDeathEffect =
  | { t: "blockSlot"; slot: SlotId }
  | { t: "explode"; n: number }
  | { t: "healAllies"; n: number }
  | { t: "shieldAllies"; n: number }
  | { t: "stealScrap"; n: number }
  | { t: "curseDie"; n: number }
  | { t: "chargeAllies" };

export interface PhaseScript {
  untilHpPct: number;
  pattern: PatternStep[];
  onEnter?: readonly Intent[];
  everyTurn?: readonly Intent[];
}

export type EnemyRole =
  | "bruiser"
  | "support"
  | "harrier"
  | "anchor"
  | "swarm";

export const ENEMY_ROLES: readonly EnemyRole[] = [
  "bruiser",
  "support",
  "harrier",
  "anchor",
  "swarm",
];

export type EnemyTrait =
  | "shell"
  | "guarded"
  | "stealOnHit"
  | "markVulnerable"
  | "phases"
  | "pick"
  | "conditional"
  | "subsystems"
  | "spikeCap"
  | "alternating"
  | "feedsOnReroll"
  | "ward"
  | "jamReleasesBlocks"
  | "jamClearsRage";

export type SignatureClaim =
  | { k: "intent"; t: IntentKind }
  | { k: "aura"; is: SubsystemAura }
  | { k: "onDeath"; t: OnDeathEffect["t"] }
  | { k: "trait"; is: EnemyTrait };

export interface EnemyDef {
  id: string;
  name: LocKey;
  signature: LocKey;
  claims: readonly SignatureClaim[];
  hp: number;
  role?: EnemyRole;
  pattern: PatternStep[];
  env?: boolean;
  elite?: boolean;
  miniboss?: boolean;
  boss?: boolean;
  shell?: boolean;
  guarded?: boolean;
  stealOnHit?: number;
  markVulnerable?: boolean;
  spikeCap?: number;
  alternating?: boolean;
  feedsOnReroll?: boolean;
  ward?: boolean;
  jamReleasesBlocks?: boolean;
  jamClearsRage?: boolean;
  onDeath?: OnDeathEffect;
  subsystems?: SubsystemDef[];
  phases?: readonly PhaseScript[];
}

export interface BossDef extends EnemyDef {
  boss: true;
  subsystems: SubsystemDef[];
  phases: PhaseScript[];
}

export const intentsOfStep = (step: PatternStep): readonly Intent[] => {
  if ("pick" in step) return step.pick.map(([intent]) => intent);
  if ("when" in step) return [step.then, step.else];
  return [step];
};

// Environmental bodies (a mine, a spark) are one intent by construction and are
// not counted against the flat-pattern budget.
export const isFlatPattern = (def: EnemyDef): boolean =>
  def.env !== true &&
  (def.phases ?? []).length === 0 &&
  def.pattern.length <= 2 &&
  def.pattern.every((step) => !("pick" in step) && !("when" in step));

const stepClaims = (step: PatternStep, out: Set<string>): void => {
  if ("pick" in step) out.add(JSON.stringify({ k: "trait", is: "pick" }));
  if ("when" in step) out.add(JSON.stringify({ k: "trait", is: "conditional" }));
  for (const intent of intentsOfStep(step)) {
    out.add(JSON.stringify({ k: "intent", t: intent.t }));
  }
};

type FlagTrait = Extract<
  EnemyTrait,
  | "shell"
  | "guarded"
  | "markVulnerable"
  | "spikeCap"
  | "alternating"
  | "feedsOnReroll"
  | "ward"
  | "jamReleasesBlocks"
  | "jamClearsRage"
>;

const FLAG_TRAITS: readonly FlagTrait[] = [
  "shell",
  "guarded",
  "markVulnerable",
  "spikeCap",
  "alternating",
  "feedsOnReroll",
  "ward",
  "jamReleasesBlocks",
  "jamClearsRage",
];

// The claim set a def actually carries. `lint:content` and the roster test both
// read this: an authored claim outside it is a signature line promising a
// mechanic the def does not have.
export const trueClaimsOf = (def: EnemyDef): ReadonlySet<string> => {
  const out = new Set<string>();
  for (const step of def.pattern) stepClaims(step, out);
  for (const phase of def.phases ?? []) {
    for (const step of phase.pattern) stepClaims(step, out);
    for (const intent of phase.onEnter ?? []) out.add(JSON.stringify({ k: "intent", t: intent.t }));
    for (const intent of phase.everyTurn ?? []) out.add(JSON.stringify({ k: "intent", t: intent.t }));
  }
  if ((def.phases ?? []).length > 0) out.add(JSON.stringify({ k: "trait", is: "phases" }));
  if ((def.subsystems ?? []).length > 0) {
    out.add(JSON.stringify({ k: "trait", is: "subsystems" }));
    for (const sub of def.subsystems ?? []) {
      out.add(JSON.stringify({ k: "aura", is: sub.aura }));
    }
  }
  if ((def.stealOnHit ?? 0) > 0) out.add(JSON.stringify({ k: "trait", is: "stealOnHit" }));
  for (const trait of FLAG_TRAITS) {
    if (def[trait] !== undefined && def[trait] !== false) {
      out.add(JSON.stringify({ k: "trait", is: trait }));
    }
  }
  if (def.onDeath !== undefined) {
    out.add(JSON.stringify({ k: "onDeath", t: def.onDeath.t }));
  }
  return out;
};

export const claimKey = (claim: SignatureClaim): string => JSON.stringify(claim);

// Silhouette budget (plan Task 1.3): a base enemy reads as one idea, an elite as
// at most two on top of its frame. Intent claims are the idea; everything else
// is the extra machinery that has to stay countable.
export const specialClaimCount = (def: EnemyDef): number =>
  def.claims.filter((c) => c.k !== "intent").length;
