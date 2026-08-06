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
  | { t: "jamSlot" }
  | { t: "lockDie" }
  | { t: "summon"; id: string }
  | { t: "healAllies"; n: number }
  | { t: "mirrorHalf" }
  | { t: "stealScrap"; n: number }
  | { t: "capShrink" }
  | { t: "twistDie" }
  | { t: "swapValues" }
  | { t: "storm" };

export type PatternStep =
  | Intent
  | { pick: readonly (readonly [Intent, number])[] };

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

export type OnDeathEffect =
  | { t: "blockSlot"; slot: "weaponA" }
  | { t: "explode"; n: number };

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

export interface EnemyDef {
  id: string;
  name: LocKey;
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
  onDeath?: OnDeathEffect;
  subsystems?: SubsystemDef[];
  phases?: readonly PhaseScript[];
}

export interface BossDef extends EnemyDef {
  boss: true;
  subsystems: SubsystemDef[];
  phases: PhaseScript[];
}
