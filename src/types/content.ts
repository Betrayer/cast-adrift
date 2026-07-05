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

export type Intent = { t: "attack"; n: number } | { t: "shield"; n: number };

export interface EnemyDef {
  id: string;
  name: LocKey;
  hp: number;
  pattern: Intent[];
}
