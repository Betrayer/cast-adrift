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

export interface DieItemDef {
  id: string;
  name: LocKey;
  tier: DieTier;
  school: School;
  rarity: Rarity;
  pts: number;
}

export type Intent =
  | { t: "attack"; n: number }
  | { t: "shield"; n: number }
  | { t: "shieldAll"; n: number }
  | { t: "multi"; n: number; k: number }
  | { t: "charge" }
  | { t: "jamSlot" }
  | { t: "lockDie" }
  | { t: "summon"; id: string };

export type PatternStep = Intent | { pick: readonly (readonly [Intent, number])[] };

export type SubsystemAura = "atk+2" | "shieldAllies3" | "lockEachTurn";

export interface SubsystemDef {
  id: string;
  name: LocKey;
  hp: number;
  aura: SubsystemAura;
}

export type OnDeathEffect = { t: "blockSlot"; slot: "weaponA" };

export interface EnemyDef {
  id: string;
  name: LocKey;
  hp: number;
  pattern: PatternStep[];
  env?: boolean;
  elite?: boolean;
  onDeath?: OnDeathEffect;
  subsystems?: SubsystemDef[];
}
