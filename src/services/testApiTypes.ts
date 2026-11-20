import type { EchoNodeId } from "@/data/echo";
import type { ShipId } from "@/data/ships";
import type { NodeId, SpotId } from "@/game/map/types";
import type { WormholeThrow } from "@/game/map/wormhole";
import type { JournalEntry } from "@/game/run/journal";
import type { VignetteFlashKind, VignetteRims } from "@/services/vignette";
import type { BattleSaveState } from "@/stores/battleStore";
import type { MetaStats } from "@/stores/metaStore";
import type { FeedSource } from "@/stores/narrativeStore";
import type {
  MkLevels,
  PendingSwap,
  RunMode,
  RunStats,
  RunValues,
} from "@/stores/runStore";
import type { RunResult } from "@/stores/summaryStore";
import type { BattleLayoutId, ChartLayoutId, RollStyle, ScreenId } from "@/types";
import type { SlotId } from "@/types/battle";
import type { Intent } from "@/types/content";

export interface SeedRunConfig {
  mode?: RunMode;
  seed?: number;
  ascension?: number;
  contractId?: string | null;
  dailyDate?: string | null;
  mutators?: readonly string[];
  ship?: ShipId;
  deck?: readonly string[];
  land?: "interstitial" | "map";
  node?: NodeId;
  sector?: number;
}

export interface MetaPatch {
  level?: number;
  shards?: number;
  unlocks?: readonly string[];
  ships?: readonly ShipId[];
  selectedShip?: ShipId;
  shipMasteryXp?: Partial<Record<ShipId, number>>;
  themes?: readonly string[];
  deck?: readonly string[];
  chartPicks?: readonly string[];
  chartFreeRespecs?: number;
  collection?: readonly { defId: string; count?: number }[];
  codex?: readonly string[];
  achievements?: readonly string[];
  prologueDone?: boolean;
  systemsCheckDone?: boolean;
  tutorialSeen?: "all" | readonly string[];
  stats?: Partial<MetaStats>;
  echo?: EchoNodeId | null;
  ascensionCleared?: number;
}

export interface RunPatch {
  scrap?: number;
  hull?: number;
  vouchers?: number;
  dice?: readonly string[];
  perks?: readonly string[];
  modules?: readonly string[];
  flags?: readonly string[];
  officers?: readonly string[];
  cargo?: readonly string[];
  echo?: EchoNodeId | null;
  visited?: readonly NodeId[];
  wormholeRides?: number;
  usedMinibosses?: readonly string[];
  shipRankXp?: number;
}

export interface BattlePatch {
  enemyIds?: readonly string[];
  deck?: readonly string[];
  shipId?: ShipId;
  seed?: number;
  hull?: number;
  hullMax?: number;
  tide?: number;
  interference?: number;
  shield?: number;
  scrap?: number;
  perks?: readonly string[];
  modules?: readonly string[];
  mkLevels?: MkLevels;
  chargeCap?: number;
  startCharge?: number;
  ascension?: number;
  inverted?: boolean;
  officers?: readonly string[];
  echo?: EchoNodeId;
  reinforcements?: readonly string[];
  snapshot?: BattleSaveState;
}

export interface DieCardView {
  defId: string;
  tier: number;
  school: string;
  rarity: string;
  pts: number;
  faces: string;
  custom: boolean;
  ev: string;
  badges: string[];
  features: string[];
}

export interface ShipCardView {
  shipId: string;
  hull: number;
  slots: string[];
  caps: number[];
  passive: string | null;
  hasPassiveText: boolean;
}

export interface MapNodeView {
  id: NodeId;
  type: string;
  row: number;
  lane: number;
  visited: boolean;
  reachable: boolean;
  hole: boolean;
  pocket: boolean;
  spot: SpotId | null;
  wormhole: boolean;
  bypass: NodeId | null;
}

export interface WormholeEdgeView {
  from: NodeId;
  hole: NodeId;
  bypass: NodeId;
}

export type RideOutcome = "landed" | "fatal" | "refused";

export interface HoleSpotView {
  id: SpotId;
  nodes: NodeId[];
  entries: string[];
}

export interface InsetProfile {
  top: number;
  bottom: number;
  left?: number;
  right?: number;
  contentTop?: number;
  contentBottom?: number;
}

export interface SummaryPatch {
  result?: Partial<RunResult>;
  run?: Partial<
    Pick<RunValues, "sectorIndex" | "crossedThreshold" | "mode" | "contractId">
  >;
  stats?: Partial<RunStats>;
}

export interface HoleBandView {
  rows: [number, number];
  rim: NodeId[];
  farRim: NodeId[];
}

export interface AchievementsView {
  total: number;
  earned: string[];
  unseen: number;
  vouchers: number;
  offers: string[];
}

export interface VignetteView {
  last: VignetteFlashKind | null;
  seq: number;
  rims: VignetteRims;
}

export interface WormholeView {
  pending: NodeId | null;
  rides: number;
  bypassed: number;
  gentle: boolean;
  toll: number;
  pct: number;
  lethal: boolean;
  mocked: boolean;
  last: WormholeThrow | null;
}

export interface FeedView {
  id: number;
  source: FeedSource;
  key: string;
  journalId: number | null;
  compressed: boolean;
  shownMs: number;
}

export interface JournalView {
  id: number;
  kind: JournalEntry["k"];
  sector: number;
  line: string | null;
}

export interface DieView {
  uid: string;
  defId: string;
  school: string;
  value: number;
  tier: number;
  state: string;
  slot: SlotId | null;
  temp: boolean;
  seat: number | null;
  fusion: number;
}

export interface AccountView {
  uid: string | null;
  isAnonymous: boolean;
  providers: string[];
  email: string | null;
  namespace: string;
  activeUid: string | null;
  switches: number;
  authError: string | null;
  authBusy: boolean;
  claimOutcome: string | null;
  claimSource: string | null;
  merge: {
    sourceUid: string;
    targetUid: string;
    recommended: string;
    sourceLevel: number;
    targetLevel: number;
  } | null;
  keys: string[];
}

export interface CloudMetaView {
  updatedAt: number;
  level: number;
  shards: number;
  runs: number;
  linkedFrom: string | null;
}

export interface TestState {
  screen: ScreenId;
  layout: BattleLayoutId;
  chartLayout: ChartLayoutId;
  rollStyle: RollStyle;
  params: Record<string, string> | null;
  uid: string | null;
  nav: {
    stack: { screen: ScreenId; params: Record<string, string> | null }[];
    canBack: boolean;
    systemMenu: boolean;
    echoCore: boolean;
  };
  run: {
    active: boolean;
    mode: RunMode;
    seed: number;
    sector: number;
    position: NodeId | null;
    hull: number;
    hullMax: number;
    scrap: number;
    deck: string[];
    hand: { uid: string; defId: string; fusion: number }[];
    modules: string[];
    bays: number;
    baysPurchased: number;
    pendingSwaps: PendingSwap[];
    visited: NodeId[];
    mutators: string[];
    weather: string | null;
    salvage: string[];
    officers: string[];
    perks: string[];
    cargo: string[];
    sectorReveal: number;
    shipyardDiscount: number;
    echo: string | null;
    echoUsed: boolean;
    ascension: number;
  };
  battle: {
    phase: string;
    turn: number;
    hull: number;
    charge: number;
    outcome: string | null;
    shipId: ShipId;
    passiveUsed: boolean;
    nextWeapons: number;
    rollSeq: number;
    fateRoll: number | null;
    echo: string | null;
    echoSpent: boolean;
    selectedDieUid: string | null;
    dice: DieView[];
    slots: { id: SlotId; dieUid: string | null }[];
    enemies: {
      id: string;
      defId: string;
      hp: number;
      hpMax: number;
      shield: number;
      vulnerable: number;
      coreLocked: boolean;
      parts: {
        id: string;
        key: string;
        hp: number;
        hpMax: number;
        alive: boolean;
        intent: Intent | null;
      }[];
    }[];
    evasion: { dodgePct: number; glancingPct: number; intercept: boolean } | null;
    freeNudges: number;
    reinforcements: string[];
    lastBlock: string | null;
    check: {
      stepId: string;
      stepIndex: number;
      stepCount: number;
      moves: { uid: string; slot: SlotId }[] | null;
      sandbox: boolean;
    } | null;
    sensorBeats: { vulnerable: number; pierce: number }[];
    attackBeats: {
      amount: number;
      hullDamage: number;
      dodged: number;
      glanced: number;
    }[];
  };
  meta: {
    level: number;
    xp: number;
    shards: number;
    selectedShip: ShipId;
    tutorialSeen: string[];
    systemsCheckDone: boolean;
    chartPicks: string[];
    chartPointsSpent: number;
    chartPointsTotal: number;
    chartFreeRespecs: number;
  };
}

export interface CargoHoldView {
  defId: string;
  nodeId: NodeId;
  sectorIndex: number;
  rows: number;
}
