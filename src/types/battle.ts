import type {
  DieTier,
  Intent,
  LocKey,
  School,
  SlotId,
  SubsystemAura,
} from "@/types/content";
import type { ShipId } from "@/data/ships";
import type { Statuses } from "@/game/battle/statuses";
import type {
  ExceedCapGrant,
  GrantKey,
  ScheduledEffect,
} from "@/game/effects/types";

export type { SlotId };

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
  temp?: boolean;
  expiresTurn?: number;
  bankedValue?: number;
  pinned?: boolean;
  reschooled?: boolean;
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
  gate?: number;
  rage?: number;
  ward?: School;
  lastHitKey?: string;
}

export type ResonanceThreshold = 2 | 4 | 6;

export interface ResonanceCensus {
  counts: Record<School, number>;
}

export type BattlePhase = "idle" | "placement" | "resolving" | "ended";

export type BattleOutcome = "victory" | "defeat";

export interface EvasionState {
  dodgePct: number;
  glancingPct: number;
  intercept: boolean;
}

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

export interface CursedDie {
  uid: string;
  n: number;
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
  runScrap: number;
  tide: number;
  interference: number;
  perks: string[];
  chartPicks?: string[];
  mutators?: string[];
  modules?: string[];
  engravings?: Readonly<Record<string, readonly string[]>>;
  flags?: string[];
  counters?: Record<string, number>;
  runCounters?: Record<string, number>;
  exceedCap: ExceedCapGrant[];
  scheduled?: ScheduledEffect[];
  grants?: Partial<Record<GrantKey, number>>;
  shipId?: ShipId;
  dice: RolledDie[];
  slots: Partial<Record<SlotId, SlotState>>;
  enemies: EnemyState[];
  targetId: string | null;
  evasion: EvasionState | null;
  nextTurnMods: NextTurnMods;
  nextRollBonus: number;
  chargeCap: number;
  sacrificePool: number;
  bloodReactorUsed: boolean;
  passiveUsed?: boolean;
  burnDoubleUsed: boolean;
  blockedSlots: BlockedSlot[];
  shrunkSlots: BlockedSlot[];
  lockedDice: LockedDie[];
  cursedDice?: CursedDie[];
  pendingHijack?: number;
  resonance: ResonanceCensus;
  survivedLethal: boolean;
  lastPlayerDamage: number;
  stolenScrap: number;
  pendingTwist: number;
  pendingSwap: number;
  pendingStorm: number;
  ascension: number;
  sectorHpPct: number;
  sectorDmgPct: number;
  enemyHpPct: number;
  inverted?: boolean;
  nodeStorm?: boolean;
  foldedTurns?: number;
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
  | "repair"
  | "storm";

export interface SensorResult {
  vulnerable: number;
  pierce: number;
}

export interface Beat {
  slot: SlotId;
  kind: BeatKind;
  amount: number;
  value?: number;
  targetId?: string;
  evasion?: EvasionState;
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
  | "phase"
  | "curse"
  | "gate"
  | "drain"
  | "siphon"
  | "bargain"
  | "enrage"
  | "hijack"
  | "ward"
  | "fold"
  | "devour";

export interface EnemyBeat {
  enemyId: string;
  kind: EnemyBeatKind;
  amount: number;
  hullDamage: number;
  shieldDamage: number;
  dodged?: number;
  glanced?: number;
  slot?: SlotId;
  dieUid?: string;
  after: BattleSnapshot;
}

export interface BattleLogEntry {
  id: string;
  turn: number;
  side: "you" | "foe";
  kind: BeatKind | EnemyBeatKind;
  actor: string;
  amount: number;
  hull: number;
  shield: number;
  dodged: number;
  glanced: number;
}

export interface ResolutionBundle {
  beats: Beat[];
  enemyBeats: EnemyBeat[];
  final: BattleSnapshot;
  finalPhase: Extract<BattlePhase, "placement" | "ended">;
}

export interface CheckMove {
  uid: string;
  slot: SlotId;
}

export interface CheckStep {
  id: string;
  moves: readonly CheckMove[] | null;
  fixedRoll: readonly number[] | null;
  enemyIntent?: Intent;
  setCharge?: number;
  grantFreeNudge?: number;
  defenseRolls?: readonly number[];
  sayKey: LocKey;
  failKey: LocKey | null;
}
