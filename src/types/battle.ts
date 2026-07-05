import type { DieTier, Intent, School } from "@/types/content";

export type SlotId =
  | "weaponA"
  | "weaponB"
  | "spinal"
  | "shields"
  | "engines"
  | "sensors"
  | "reactor"
  | "repairBay";

export type DieState = "tray" | "placed" | "reserved" | "locked" | "burned";

export interface RolledDie {
  uid: string;
  defId: string;
  tier: DieTier;
  school: School;
  value: number;
  state: DieState;
  slot?: SlotId;
}

export interface SlotState {
  cap: DieTier;
  mk: 1 | 2 | 3;
  dieUid?: string;
}

export interface EnemyState {
  id: string;
  defId: string;
  hp: number;
  hpMax: number;
  shield: number;
  intentIndex: number;
}

export type BattlePhase =
  | "idle"
  | "placement"
  | "resolving"
  | "enemy"
  | "ended";

export type BattleOutcome = "victory" | "defeat";

export interface BattleSnapshot {
  turn: number;
  hull: number;
  hullMax: number;
  shield: number;
  charge: number;
  dice: RolledDie[];
  slots: Partial<Record<SlotId, SlotState>>;
  enemies: EnemyState[];
  targetId: string | null;
  outcome?: BattleOutcome;
}

export interface Beat {
  slot: SlotId;
  kind: "damage" | "shield" | "charge";
  amount: number;
  targetId?: string;
}

export interface EnemyBeat {
  enemyId: string;
  intent: Intent;
  hullDamage: number;
  shieldDamage: number;
}
