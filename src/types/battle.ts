import type { DieTier, Intent, School, SubsystemAura } from "@/types/content";
import type { ShipId } from "@/data/ships";
import type { Statuses } from "@/game/battle/statuses";

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

export type DieState = "tray" | "placed" | "reserved" | "locked" | "burned";

export interface RolledDie {
  uid: string;
  defId: string;
  tier: DieTier;
  school: School;
  value: number;
  state: DieState;
  slot?: SlotId;
  growth?: number;
  lastValue?: number;
  overCap?: boolean;
  activeUsed?: boolean;
}

export interface SlotState {
  cap: DieTier;
  mk: 1 | 2 | 3;
  jamOn?: number;
  dieUid?: string;
}

export interface SubsystemState {
  id: string;
  key: string;
  hp: number;
  hpMax: number;
  aura: SubsystemAura;
}

export interface EnemyState {
  id: string;
  defId: string;
  hp: number;
  hpMax: number;
  shield: number;
  intentIndex: number;
  nextIntent: Intent;
  statuses: Statuses;
  subsystems: SubsystemState[];
  phase: number;
}

export type ResonanceThreshold = 2 | 4 | 6;

export interface ResonanceCensus {
  counts: Record<School, number>;
}

export type BattlePhase = "idle" | "placement" | "resolving" | "ended";

export type BattleOutcome = "victory" | "defeat";

export type EngineTier = "brace" | "dodge" | "dodgePlus";

export interface NextTurnMods {
  weapons?: number;
  spinal?: number;
}

export interface BlockedSlot {
  slot: SlotId;
  untilTurn: number;
}

export interface LockedDie {
  uid: string;
  untilTurn: number;
}

export interface BattleSnapshot {
  turn: number;
  hull: number;
  hullMax: number;
  shield: number;
  shieldPersist: number;
  charge: number;
  scrap: number;
  tide: number;
  interference: number;
  perks: string[];
  chartPicks?: string[];
  mutators?: string[];
  modules?: string[];
  engravings?: Readonly<Record<string, readonly string[]>>;
  shipId?: ShipId;
  dice: RolledDie[];
  slots: Partial<Record<SlotId, SlotState>>;
  enemies: EnemyState[];
  targetId: string | null;
  engineState: EngineTier | null;
  nextTurnMods: NextTurnMods;
  nextRollBonus: number;
  pendingDeepScan: boolean;
  chargeCap: number;
  sacrificePool: number;
  bloodReactorUsed: boolean;
  burnDoubleUsed: boolean;
  blockedSlots: BlockedSlot[];
  shrunkSlots: BlockedSlot[];
  lockedDice: LockedDie[];
  resonance: ResonanceCensus;
  survivedLethal: boolean;
  lastPlayerDamage: number;
  stolenScrap: number;
  pendingTwist: number;
  pendingSwap: number;
  pendingStorm: number;
  ascension: number;
  overflowShieldUsed?: boolean;
  pierceUsed?: boolean;
  outcome?: BattleOutcome;
}

export type BeatKind =
  | "damage"
  | "spinalJam"
  | "shield"
  | "engine"
  | "sensor"
  | "charge"
  | "repair";

export interface SensorResult {
  mark: boolean;
  jam: boolean;
  deepScan: boolean;
}

export interface Beat {
  slot: SlotId;
  kind: BeatKind;
  amount: number;
  targetId?: string;
  engineTier?: EngineTier;
  sensor?: SensorResult;
  overflowHull?: number;
  after: BattleSnapshot;
}

export type EnemyBeatKind =
  | "attack"
  | "shield"
  | "shieldAll"
  | "charge"
  | "jamSlot"
  | "lockDie"
  | "summon"
  | "burnTick"
  | "heal"
  | "steal"
  | "capShrink"
  | "twist"
  | "swap"
  | "storm"
  | "explode"
  | "phase";

export interface EnemyBeat {
  enemyId: string;
  kind: EnemyBeatKind;
  amount: number;
  hullDamage: number;
  shieldDamage: number;
  slot?: SlotId;
  dieUid?: string;
  after: BattleSnapshot;
}

export interface ResolutionBundle {
  beats: Beat[];
  enemyBeats: EnemyBeat[];
  final: BattleSnapshot;
  finalPhase: Extract<BattlePhase, "placement" | "ended">;
}
