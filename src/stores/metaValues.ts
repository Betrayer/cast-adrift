import { isBattleLayoutId } from '@/data/battleLayouts';
import { isBridgeFrameChoice, type BridgeFrameChoice } from '@/data/bridgeFrames';
import { isChartLayoutId } from '@/data/chartLayouts';
import { isRollStyle } from '@/data/rollStyles';
import { DEFAULT_DIE_SKIN } from '@/data/cosmetics';
import { STARTER_DECK } from '@/data/decks';
import type { EchoNodeId } from '@/data/echo';
import { isThemeId, type ThemeId } from '@/data/themes';
import type { ShipId } from '@/data/ships';
import type { BattleLayoutId, ChartLayoutId, RollStyle } from '@/types';
import { CORE_NODE_ID } from '@/game/chart/cost';
import { pickShape, shapeKeys } from '@/stores/shape';

export interface CollectionEntry {
  defId: string;
  count: number;
}

export interface MetaStats {
  runs: number;
  wins: number;
  shardsEarned: number;
  prologueDone: boolean;
  systemsCheckDone: boolean;
  campaignClears: number;
  kills: number;
  scrapEarned: number;
  deepestDrift: number;
  driftRuns: number;
  dailyRuns: number;
  contractRuns: number;
  elites: number;
  t5Solved: number;
  beacons: number;
  deepClears: number;
  noDeathStreak: number;
  bestNoDeathStreak: number;
  wormholeRides: number;
  holesBypassed: number;
  disintegrations: number;
  eventsResolved: number;
  checksWon: number;
  fusions: number;
  engravingsFitted: number;
  mk3Built: number;
  resonance6: number;
  flawlessBosses: number;
  clearsWanderer: number;
  clearsRam: number;
  clearsArk: number;
  clearsCorsair: number;
  clearsFoundry: number;
  clearsPrism: number;
  dragDrops: number;
  dragCancels: number;
}

export interface EncounterRecord {
  sector: number;
  node: string;
}

export interface RunEncounter extends EncounterRecord {
  defId: string;
}

export interface EncounterResult {
  firstFinds: string[];
  shards: number;
}

export type DailyPlayState = "started" | "done";

export interface DailyRecord {
  state: DailyPlayState;
  score: number;
  rank: number | null;
}

export interface BestScores {
  drift: number;
  driftWeek: string | null;
  driftWeekly: number;
  dailyRank: number | null;
  dailyDate: string | null;
}

export interface AccountPrefs {
  battleLayout?: BattleLayoutId;
  bridgeFrame?: BridgeFrameChoice;
  chartLayout?: ChartLayoutId;
  rollStyle?: RollStyle;
  theme?: ThemeId;
}

export type AccountPrefKey = keyof AccountPrefs;

type AccountPrefGuard<K extends AccountPrefKey> = (
  value: unknown,
) => value is Required<AccountPrefs>[K];

export const ACCOUNT_PREF_GUARDS: {
  [K in AccountPrefKey]: AccountPrefGuard<K>;
} = {
  battleLayout: isBattleLayoutId,
  bridgeFrame: isBridgeFrameChoice,
  chartLayout: isChartLayoutId,
  rollStyle: isRollStyle,
  theme: isThemeId,
};

export const ACCOUNT_PREF_KEYS = Object.keys(
  ACCOUNT_PREF_GUARDS,
) as readonly AccountPrefKey[];

export type VoucherKind = "perkDraft";

export type VoucherBank = Record<VoucherKind, number>;

export interface MetaValues {
  shards: number;
  vouchers: VoucherBank;
  voucherOffers: string[];
  xp: number;
  level: number;
  chartPicks: string[];
  chartFreeRespecs: number;
  collection: CollectionEntry[];
  ships: ShipId[];
  selectedShip: ShipId;
  selectedEcho: EchoNodeId | null;
  hangar: { deck: string[] };
  themes: string[];
  tutorialSeen: string[];
  engravings: Record<string, string[]>;
  badges: string[];
  codex: string[];
  codexRead: string[];
  seenPuzzles: string[];
  seenFragments: string[];
  contracts: Record<string, number>;
  dailyPlayed: Record<string, DailyRecord>;
  best: BestScores;
  ascension: { campaign: number };
  flagsArchive: string[];
  bossFirstKills: string[];
  endings: string[];
  achievements: string[];
  achievementsSeen: string[];
  encountered: Record<string, EncounterRecord>;
  unlocksGranted: string[];
  unlocksSeen: string[];
  dieSkin: string;
  prefs: AccountPrefs;
  stats: MetaStats;
  shipMastery: ShipMasteryXp;
}

export type ShipMasteryXp = Partial<Record<ShipId, { xp: number }>>;

export const META_VERSION = 22;

export const SEEN_PUZZLE_MEMORY = 40;
export const SEEN_FRAGMENT_MEMORY = 60;

export const SMOTRITEL_BADGE = 'keeper';

export const SINGULARITY_BADGE = 'singularity';

const STARTER_SPARE = 'yellow-d6';

export const buildStarterCollection = (): CollectionEntry[] => {
  const counts = new Map<string, number>();
  for (const id of [...STARTER_DECK, STARTER_SPARE]) {
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return [...counts].map(([defId, count]) => ({ defId, count }));
};

export const createInitialMetaStats = (): MetaStats => ({
  runs: 0,
  wins: 0,
  shardsEarned: 0,
  prologueDone: false,
  systemsCheckDone: false,
  campaignClears: 0,
  kills: 0,
  scrapEarned: 0,
  deepestDrift: 0,
  driftRuns: 0,
  dailyRuns: 0,
  contractRuns: 0,
  elites: 0,
  t5Solved: 0,
  beacons: 0,
  deepClears: 0,
  noDeathStreak: 0,
  bestNoDeathStreak: 0,
  wormholeRides: 0,
  holesBypassed: 0,
  disintegrations: 0,
  eventsResolved: 0,
  checksWon: 0,
  fusions: 0,
  engravingsFitted: 0,
  mk3Built: 0,
  resonance6: 0,
  flawlessBosses: 0,
  clearsWanderer: 0,
  clearsRam: 0,
  clearsArk: 0,
  clearsCorsair: 0,
  clearsFoundry: 0,
  clearsPrism: 0,
  dragDrops: 0,
  dragCancels: 0,
});

export const META_PERSIST_KEY = 'meta';

export const VOUCHER_CAP = 3;

export const createInitialVouchers = (): VoucherBank => ({ perkDraft: 0 });

export const createInitialMetaValues = (): MetaValues => ({
  shards: 0,
  vouchers: createInitialVouchers(),
  voucherOffers: [],
  xp: 0,
  level: 1,
  chartPicks: [CORE_NODE_ID],
  chartFreeRespecs: 0,
  collection: buildStarterCollection(),
  ships: ['wanderer'],
  selectedShip: 'wanderer',
  selectedEcho: null,
  hangar: { deck: [...STARTER_DECK] },
  themes: ['deepSpace'],
  tutorialSeen: [],
  shipMastery: {},
  engravings: {},
  badges: [],
  codex: [],
  codexRead: [],
  seenPuzzles: [],
  seenFragments: [],
  contracts: {},
  dailyPlayed: {},
  best: {
    drift: 0,
    driftWeek: null,
    driftWeekly: 0,
    dailyRank: null,
    dailyDate: null,
  },
  ascension: { campaign: 0 },
  flagsArchive: [],
  bossFirstKills: [],
  endings: [],
  achievements: [],
  achievementsSeen: [],
  encountered: {},
  unlocksGranted: [],
  unlocksSeen: [],
  dieSkin: DEFAULT_DIE_SKIN,
  prefs: {},
  stats: createInitialMetaStats(),
});

const META_KEYS = shapeKeys(createInitialMetaValues());

export const metaValues = (s: MetaValues): MetaValues =>
  pickShape(META_KEYS, s);
