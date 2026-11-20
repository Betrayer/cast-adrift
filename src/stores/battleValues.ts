import type { EchoNodeId } from "@/data/echo";
import type { ShipId } from "@/data/ships";
import type { PassiveTier } from "@/game/battle/passives";
import { computeCensus } from "@/game/battle/resonance";
import { BASE_REROLL_SIZE } from "@/game/battle/resolver";
import type { BattleInit } from "@/game/battle/setup";
import type { DeckEntry } from "@/game/dice/tier";
import type { FireModeId } from "@/data/fireModes";
import type { EngravingMap } from "@/data/engravings";
import type { PerkTrait } from "@/data/perks/types";
import type { RngStream, RngStreams } from "@/services/rng";
import { BASE_CHARGE_CAP } from "@/game/run/perkMods";
import type {
  ExceedCapGrant,
  GrantKey,
  ScheduledEffect,
} from "@/game/effects/types";
import type {
  BattleLogEntry,
  BattleOutcome,
  BattlePhase,
  BattleSnapshot,
  Beat,
  BlockedSlot,
  CheckStep,
  CursedDie,
  EnemyBeat,
  EnemyState,
  EvasionState,
  LockedDie,
  NextTurnMods,
  ResonanceCensus,
  ResolutionBundle,
  RolledDie,
  SlotId,
  SlotState,
} from "@/types/battle";

export interface BattleEncounter extends BattleInit {
  enemyIds: string[];
  shipId?: ShipId;
  officers?: readonly string[];
  echo?: EchoNodeId;
  startCharge?: number;
  rerollSizeBonus?: number;
  forcedTraits?: readonly PerkTrait[];
  checkSteps?: readonly CheckStep[];
  checkSandbox?: boolean;
}

export interface BattleValues {
  phase: BattlePhase;
  shipId: ShipId;
  turn: number;
  hull: number;
  hullMax: number;
  shield: number;
  shieldPersist: number;
  charge: number;
  scrap: number;
  runScrap: number;
  tide: number;
  sectorHpPct: number;
  sectorDmgPct: number;
  enemyHpPct: number;
  interference: number;
  perks: string[];
  chartPicks: string[];
  mutators: string[];
  modules: string[];
  officers: string[];
  echo: EchoNodeId | undefined;
  engravings: EngravingMap;
  flags: string[];
  counters: Record<string, number>;
  runCounters: Record<string, number>;
  exceedCap: ExceedCapGrant[];
  scheduled: ScheduledEffect[];
  grants: Partial<Record<GrantKey, number>>;
  forcedTraits: PerkTrait[];
  chargeCap: number;
  sacrificePool: number;
  bloodReactorUsed: boolean;
  passiveUsed: boolean;
  passiveTier: PassiveTier;
  firstHitSpent: boolean;
  blackBoxSpent: boolean;
  burnDoubleUsed: boolean;
  dice: RolledDie[];
  slots: Partial<Record<SlotId, SlotState>>;
  rerollsLeft: number;
  rerollSize: number;
  rerollBase: number;
  rerollMode: boolean;
  rerollSelection: string[];
  reserveCap: number;
  freeNudges: number;
  selectedDieUid: string | null;
  swapSourceUid: string | null;
  fuseSourceUid: string | null;
  enemies: EnemyState[];
  targetId: string | null;
  evasion: EvasionState | null;
  nextTurnMods: NextTurnMods;
  nextRollBonus: number;
  blockedSlots: BlockedSlot[];
  shrunkSlots: BlockedSlot[];
  lockedDice: LockedDie[];
  cursedDice: CursedDie[];
  pendingHijack: number;
  resonance: ResonanceCensus;
  survivedLethal: boolean;
  lastPlayerDamage: number;
  stolenScrap: number;
  pendingTwist: number;
  pendingSwap: number;
  pendingStorm: number;
  pendingAdds: string[];
  reinforcements: string[];
  partsDowned: string[];
  ascension: number;
  inverted: boolean;
  nodeStorm: boolean;
  foldedTurns: number;
  overflowShieldUsed: boolean;
  pierceUsed: boolean;
  fateUses: number;
  fateRoll: number | null;
  fateOutcomeId: string | null;
  rollSeq: number;
  rolledUids: readonly string[];
  spentGrants: string[];
  introPending: boolean;
  introEnemyId: string | null;
  checkSteps: CheckStep[] | null;
  checkIndex: number;
  checkSandbox: boolean;
  lastBlock: BlockNotice | null;
  outcome?: BattleOutcome;
  resolution: ResolutionBundle | null;
  beats: Beat[];
  enemyBeats: EnemyBeat[];
  beatSeq: number;
  log: BattleLogEntry[];
  blackUsed: number;
  blueUsed: number;
  shieldAbsorbed: number;
  damageDealt: number;
  damageTaken: number;
  spinalMaxHit: number;
  rerollsUsed: number;
  repairBayHealed: number;
  dicePlaced: number;
  maxResonance: number;
  burnKilledElite: boolean;
  streams: RngStreams | null;
  enemyStream: RngStream | null;
  debugNextRoll: number[] | null;
}

export interface BattleState extends BattleValues {
  dismissIntro: () => void;
  startBattle: (
    encounter: BattleEncounter,
    hand: readonly DeckEntry[],
    streams: RngStreams,
  ) => void;
  placeDie: (uid: string, slotId: SlotId) => void;
  setSlotMode: (slotId: SlotId, mode: FireModeId) => void;
  noteBlock: (key: string | null) => void;
  skipCheck: () => void;
  restartCheckStep: () => void;
  unplaceDie: (uid: string) => void;
  reserveDie: (uid: string) => void;
  unreserveDie: (uid: string) => void;
  selectDie: (uid: string | null) => void;
  setTarget: (targetId: string) => void;
  spendNudge: (uid: string, dir: -1 | 1) => void;
  spendBonusReroll: () => void;
  spendSurge: () => void;
  bloodReactor: () => void;
  sacrificeDie: (uid: string) => void;
  flipDie: (uid: string) => void;
  copyDie: (uid: string) => void;
  beginSwap: (uid: string) => void;
  cancelSwap: () => void;
  bankDie: (uid: string) => void;
  splitDie: (uid: string) => void;
  beginFuse: (uid: string) => void;
  cancelFuse: () => void;
  fuseDice: (uid: string) => void;
  reschoolDie: (uid: string) => void;
  rollFate: () => void;
  useOfficerActive: (officerId: string) => void;
  useEchoActive: () => void;
  clearFateResult: () => void;
  toggleRerollMode: () => void;
  toggleRerollDie: (uid: string) => void;
  confirmReroll: () => void;
  endTurn: () => void;
  applyBeatSnapshot: (after: BattleSnapshot) => void;
  finishResolution: () => void;
  reset: () => void;
}

export const createInitialBattleValues = (): BattleValues => ({
  phase: "idle",
  shipId: "wanderer",
  turn: 0,
  hull: 0,
  hullMax: 0,
  shield: 0,
  shieldPersist: 0,
  charge: 0,
  scrap: 0,
  runScrap: 0,
  tide: 0,
  interference: 0,
  perks: [],
  chartPicks: [],
  mutators: [],
  modules: [],
  officers: [],
  echo: undefined,
  engravings: {},
  flags: [],
  counters: {},
  runCounters: {},
  exceedCap: [],
  sectorHpPct: 0,
  sectorDmgPct: 0,
  enemyHpPct: 0,
  scheduled: [],
  grants: {},
  forcedTraits: [],
  chargeCap: BASE_CHARGE_CAP,
  sacrificePool: 0,
  bloodReactorUsed: false,
  passiveUsed: false,
  passiveTier: 1,
  firstHitSpent: false,
  blackBoxSpent: false,
  burnDoubleUsed: false,
  dice: [],
  slots: {},
  rerollsLeft: 0,
  rerollSize: BASE_REROLL_SIZE,
  rerollBase: BASE_REROLL_SIZE,
  rerollMode: false,
  rerollSelection: [],
  reserveCap: 1,
  freeNudges: 0,
  selectedDieUid: null,
  enemies: [],
  targetId: null,
  evasion: null,
  nextTurnMods: {},
  nextRollBonus: 0,
  blockedSlots: [],
  shrunkSlots: [],
  lockedDice: [],
  cursedDice: [],
  pendingHijack: 0,
  resonance: computeCensus([]),
  survivedLethal: false,
  lastPlayerDamage: 0,
  stolenScrap: 0,
  pendingTwist: 0,
  pendingSwap: 0,
  pendingStorm: 0,
  pendingAdds: [],
  reinforcements: [],
  partsDowned: [],
  swapSourceUid: null,
  fuseSourceUid: null,
  ascension: 0,
  inverted: false,
  nodeStorm: false,
  foldedTurns: 0,
  overflowShieldUsed: false,
  pierceUsed: false,
  fateUses: 0,
  fateRoll: null,
  fateOutcomeId: null,
  rollSeq: 0,
  rolledUids: [],
  spentGrants: [],
  introPending: false,
  introEnemyId: null,
  checkSteps: null,
  checkIndex: 0,
  checkSandbox: false,
  lastBlock: null,
  outcome: undefined,
  resolution: null,
  beats: [],
  enemyBeats: [],
  beatSeq: 0,
  log: [],
  blackUsed: 0,
  blueUsed: 0,
  shieldAbsorbed: 0,
  damageDealt: 0,
  damageTaken: 0,
  spinalMaxHit: 0,
  rerollsUsed: 0,
  repairBayHealed: 0,
  dicePlaced: 0,
  maxResonance: 0,
  burnKilledElite: false,
  streams: null,
  enemyStream: null,
  debugNextRoll: null,
});

export interface BlockNotice {
  key: string;
  slotId: SlotId | null;
  seq: number;
}
