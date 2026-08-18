import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { isBattleLayoutId } from '@/data/battleLayouts';
import { CHART_NODE_BY_ID } from '@/data/chart';
import { DEFAULT_DIE_SKIN, isDieSkinId } from '@/data/cosmetics';
import { STARTER_DECK } from '@/data/decks';
import { DIE_BY_ID } from '@/data/dice';
import { FIRST_FIND_SHARDS } from '@/data/metaShop';
import { socketsForDie } from '@/data/engravings';
import { isThemeId, type ThemeId } from '@/data/themes';
import type { ShipId } from '@/data/ships';
import type { BattleLayoutId } from '@/types';
import { levelFromTotalXp } from '@/game/xp';
import { scopedPersistStorage } from '@/stores/scopedStorage';

export interface CollectionEntry {
  defId: string;
  count: number;
}

export interface MetaStats {
  runs: number;
  wins: number;
  shardsEarned: number;
  prologueDone: boolean;
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
  theme?: ThemeId;
}

export interface MetaValues {
  shards: number;
  xp: number;
  level: number;
  chartPicks: string[];
  collection: CollectionEntry[];
  ships: ShipId[];
  selectedShip: ShipId;
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
}

export interface RunAward {
  fromLevel: number;
  toLevel: number;
}

export interface MetaState extends MetaValues {
  unlockCodex: (id: string) => boolean;
  markCodexRead: (id: string) => void;
  markPuzzleSeen: (id: string) => void;
  markFragmentSeen: (id: string) => void;
  markAllCodexRead: () => void;
  awardRun: (xpGain: number, shardGain: number, win: boolean) => RunAward;
  addShards: (n: number) => void;
  spendShards: (n: number) => boolean;
  allocatePick: (id: string) => void;
  deallocatePick: (id: string) => void;
  addToCollection: (defId: string, n?: number) => void;
  buyDie: (defId: string, price: number) => boolean;
  setDeck: (deck: readonly string[]) => void;
  selectShip: (id: ShipId) => void;
  buyShip: (id: ShipId, price: number) => boolean;
  unlockTheme: (id: string) => void;
  markTutorialSeen: (id: string) => void;
  resetTutorial: () => void;
  engrave: (defId: string, engravingId: string, price: number) => boolean;
  removeEngraving: (defId: string, engravingId: string) => void;
  awardBadge: (id: string) => boolean;
  archiveRunFlags: (flags: readonly string[]) => void;
  recordBossFirstKill: (bossId: string) => boolean;
  recordEnding: (endingId: string) => boolean;
  markPrologueDone: () => void;
  recordCampaignClear: (ascension: number) => void;
  recordContractStars: (id: string, mask: number) => number;
  markDailyStarted: (date: string) => void;
  recordDaily: (date: string, score: number, rank: number | null) => void;
  recordDriftScore: (score: number, week: string) => boolean;
  bumpLifetime: (delta: Partial<MetaStats>) => void;
  unlockAchievement: (id: string) => boolean;
  markAchievementsSeen: (ids: readonly string[]) => void;
  grantUnlock: (id: string) => boolean;
  markUnlocksSeen: (ids: readonly string[]) => void;
  recordEncounters: (list: readonly RunEncounter[]) => EncounterResult;
  setDieSkin: (id: string) => void;
  setPrefs: (patch: AccountPrefs) => void;
  recordStreak: (win: boolean) => void;
}

export const META_VERSION = 12;

export const SEEN_PUZZLE_MEMORY = 40;
export const SEEN_FRAGMENT_MEMORY = 60;

export const SMOTRITEL_BADGE = 'keeper';

const STARTER_SPARE = 'yellow-d6';

const buildStarterCollection = (): CollectionEntry[] => {
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
});

const LIFETIME_KEYS = [
  "runs",
  "wins",
  "shardsEarned",
  "campaignClears",
  "kills",
  "scrapEarned",
  "driftRuns",
  "dailyRuns",
  "contractRuns",
  "elites",
  "t5Solved",
  "beacons",
  "deepClears",
] as const;

export const META_PERSIST_KEY = 'meta';

export const createInitialMetaValues = (): MetaValues => ({
  shards: 0,
  xp: 0,
  level: 1,
  chartPicks: [],
  collection: buildStarterCollection(),
  ships: ['wanderer'],
  selectedShip: 'wanderer',
  hangar: { deck: [...STARTER_DECK] },
  themes: ['deepSpace'],
  tutorialSeen: [],
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

const coerceEncountered = (value: unknown): Record<string, EncounterRecord> => {
  if (typeof value !== "object" || value === null) return {};
  const out: Record<string, EncounterRecord> = {};
  for (const [defId, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw !== "object" || raw === null) continue;
    const rec = raw as Partial<EncounterRecord>;
    out[defId] = {
      sector: typeof rec.sector === "number" ? rec.sector : 1,
      node: typeof rec.node === "string" ? rec.node : "battle",
    };
  }
  return out;
};

const coerceStrings = (value: unknown, base: string[]): string[] =>
  Array.isArray(value)
    ? value.filter((id): id is string => typeof id === "string")
    : base;

const coerceCollection = (value: unknown): CollectionEntry[] => {
  if (!Array.isArray(value)) return buildStarterCollection();
  const out: CollectionEntry[] = [];
  for (const entry of value) {
    if (
      typeof entry === 'object' &&
      entry !== null &&
      typeof (entry as CollectionEntry).defId === 'string' &&
      typeof (entry as CollectionEntry).count === 'number'
    ) {
      out.push({
        defId: (entry as CollectionEntry).defId,
        count: (entry as CollectionEntry).count,
      });
    }
  }
  return out.length > 0 ? out : buildStarterCollection();
};

const coerceDailyPlayed = (value: unknown): Record<string, DailyRecord> => {
  if (typeof value !== 'object' || value === null) return {};
  const out: Record<string, DailyRecord> = {};
  for (const [date, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw !== 'object' || raw === null) continue;
    const rec = raw as Partial<DailyRecord>;
    out[date] = {
      state: rec.state === 'done' ? 'done' : 'started',
      score: typeof rec.score === 'number' ? rec.score : 0,
      rank: typeof rec.rank === 'number' ? rec.rank : null,
    };
  }
  return out;
};

const coerceEngravings = (value: unknown): Record<string, string[]> => {
  if (typeof value !== 'object' || value === null) return {};
  const out: Record<string, string[]> = {};
  for (const [defId, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!Array.isArray(raw)) continue;
    const ids = raw.filter((id): id is string => typeof id === 'string');
    if (ids.length > 0) out[defId] = ids;
  }
  return out;
};

export const coercePrefs = (value: unknown): AccountPrefs => {
  if (typeof value !== 'object' || value === null) return {};
  const prev = value as Partial<Record<keyof AccountPrefs, unknown>>;
  return {
    ...(isBattleLayoutId(prev.battleLayout)
      ? { battleLayout: prev.battleLayout }
      : {}),
    ...(isThemeId(prev.theme) ? { theme: prev.theme } : {}),
  };
};

const coerceBest = (value: unknown, base: BestScores): BestScores => {
  if (typeof value !== 'object' || value === null) return base;
  const prev = value as Partial<BestScores>;
  return {
    drift: typeof prev.drift === 'number' ? prev.drift : base.drift,
    driftWeek:
      typeof prev.driftWeek === 'string' ? prev.driftWeek : base.driftWeek,
    driftWeekly:
      typeof prev.driftWeekly === 'number'
        ? prev.driftWeekly
        : base.driftWeekly,
    dailyRank:
      typeof prev.dailyRank === 'number' ? prev.dailyRank : base.dailyRank,
    dailyDate:
      typeof prev.dailyDate === 'string' ? prev.dailyDate : base.dailyDate,
  };
};

export const migrateMeta = (
  persisted: unknown,
  fromVersion: number,
): MetaValues => {
  if (import.meta.env.DEV) {
    console.info(
      `metaStore: migrating v${String(fromVersion)} -> v${String(META_VERSION)}`,
    );
  }
  const prev = (persisted ?? {}) as Partial<MetaValues>;
  const base = createInitialMetaValues();
  return {
    ...base,
    shards: typeof prev.shards === 'number' ? prev.shards : base.shards,
    xp: typeof prev.xp === 'number' ? prev.xp : base.xp,
    level:
      typeof prev.xp === 'number'
        ? levelFromTotalXp(prev.xp)
        : typeof prev.level === 'number'
          ? prev.level
          : base.level,
    chartPicks: Array.isArray(prev.chartPicks)
      ? prev.chartPicks.filter((id) => CHART_NODE_BY_ID.has(id))
      : base.chartPicks,
    collection: coerceCollection(prev.collection),
    ships: Array.isArray(prev.ships) ? (prev.ships as ShipId[]) : base.ships,
    selectedShip:
      typeof prev.selectedShip === 'string'
        ? (prev.selectedShip as ShipId)
        : base.selectedShip,
    hangar:
      typeof prev.hangar === 'object' &&
      prev.hangar !== null &&
      Array.isArray((prev.hangar as { deck?: unknown }).deck)
        ? { deck: [...(prev.hangar as { deck: string[] }).deck] }
        : base.hangar,
    themes: Array.isArray(prev.themes) ? prev.themes : base.themes,
    tutorialSeen: Array.isArray(prev.tutorialSeen)
      ? prev.tutorialSeen.filter((id): id is string => typeof id === 'string')
      : base.tutorialSeen,
    engravings: coerceEngravings(prev.engravings),
    badges: Array.isArray(prev.badges) ? prev.badges : base.badges,
    codex: Array.isArray(prev.codex) ? prev.codex : base.codex,
    codexRead: Array.isArray(prev.codexRead) ? prev.codexRead : base.codexRead,
    seenFragments: Array.isArray(prev.seenFragments)
      ? prev.seenFragments.slice(-SEEN_FRAGMENT_MEMORY)
      : base.seenFragments,
    seenPuzzles: Array.isArray(prev.seenPuzzles)
      ? prev.seenPuzzles.slice(-SEEN_PUZZLE_MEMORY)
      : base.seenPuzzles,
    contracts:
      typeof prev.contracts === 'object' && prev.contracts !== null
        ? (prev.contracts as Record<string, number>)
        : base.contracts,
    dailyPlayed: coerceDailyPlayed(prev.dailyPlayed),
    best: coerceBest(prev.best, base.best),
    ascension:
      typeof prev.ascension === 'object' &&
      prev.ascension !== null &&
      typeof (prev.ascension as { campaign?: unknown }).campaign === 'number'
        ? { campaign: (prev.ascension as { campaign: number }).campaign }
        : base.ascension,
    flagsArchive: Array.isArray(prev.flagsArchive)
      ? prev.flagsArchive
      : base.flagsArchive,
    bossFirstKills: Array.isArray(prev.bossFirstKills)
      ? prev.bossFirstKills
      : base.bossFirstKills,
    endings: Array.isArray(prev.endings) ? prev.endings : base.endings,
    achievements: coerceStrings(prev.achievements, base.achievements),
    achievementsSeen: coerceStrings(
      prev.achievementsSeen,
      base.achievementsSeen,
    ),
    encountered: coerceEncountered(prev.encountered),
    unlocksGranted: coerceStrings(prev.unlocksGranted, base.unlocksGranted),
    unlocksSeen: coerceStrings(prev.unlocksSeen, base.unlocksSeen),
    dieSkin: isDieSkinId(prev.dieSkin) ? prev.dieSkin : base.dieSkin,
    prefs: coercePrefs(prev.prefs),
    stats:
      typeof prev.stats === 'object' && prev.stats !== null
        ? { ...base.stats, ...(prev.stats as Partial<MetaStats>) }
        : base.stats,
  };
};

export const useMetaStore = create<MetaState>()(
  persist(
    (set, get) => ({
      ...createInitialMetaValues(),

      unlockCodex: (id) => {
        if (get().codex.includes(id)) return false;
        set((s) => ({ codex: [...s.codex, id] }));
        return true;
      },

      markCodexRead: (id) => {
        set((s) =>
          s.codexRead.includes(id) ? s : { codexRead: [...s.codexRead, id] },
        );
      },

      markPuzzleSeen: (id) => {
        set((s) =>
          s.seenPuzzles[s.seenPuzzles.length - 1] === id
            ? s
            : {
                seenPuzzles: [
                  ...s.seenPuzzles.filter((seen) => seen !== id),
                  id,
                ].slice(-SEEN_PUZZLE_MEMORY),
              },
        );
      },

      markFragmentSeen: (id) => {
        set((s) =>
          s.seenFragments[s.seenFragments.length - 1] === id
            ? s
            : {
                seenFragments: [
                  ...s.seenFragments.filter((seen) => seen !== id),
                  id,
                ].slice(-SEEN_FRAGMENT_MEMORY),
              },
        );
      },

      markAllCodexRead: () => {
        set((s) => ({ codexRead: [...new Set([...s.codexRead, ...s.codex])] }));
      },

      awardRun: (xpGain, shardGain, win) => {
        const fromLevel = get().level;
        const gainXp = Math.max(0, Math.round(xpGain));
        const gainShards = Math.max(0, Math.round(shardGain));
        set((s) => {
          const xp = s.xp + gainXp;
          return {
            xp,
            level: levelFromTotalXp(xp),
            shards: s.shards + gainShards,
            stats: {
              ...s.stats,
              runs: s.stats.runs + 1,
              wins: s.stats.wins + (win ? 1 : 0),
              shardsEarned: s.stats.shardsEarned + gainShards,
            },
          };
        });
        return { fromLevel, toLevel: get().level };
      },

      addShards: (n) => {
        if (n <= 0) return;
        set((s) => ({
          shards: s.shards + n,
          stats: { ...s.stats, shardsEarned: s.stats.shardsEarned + n },
        }));
      },

      spendShards: (n) => {
        const s = get();
        if (n < 0 || s.shards < n) return false;
        set({ shards: s.shards - n });
        return true;
      },

      allocatePick: (id) => {
        set((s) =>
          s.chartPicks.includes(id)
            ? s
            : { chartPicks: [...s.chartPicks, id] },
        );
      },

      deallocatePick: (id) => {
        set((s) => ({ chartPicks: s.chartPicks.filter((p) => p !== id) }));
      },

      addToCollection: (defId, n = 1) => {
        if (n <= 0) return;
        set((s) => {
          const existing = s.collection.find((e) => e.defId === defId);
          if (existing !== undefined) {
            return {
              collection: s.collection.map((e) =>
                e.defId === defId ? { ...e, count: e.count + n } : e,
              ),
            };
          }
          return { collection: [...s.collection, { defId, count: n }] };
        });
      },

      buyDie: (defId, price) => {
        if (!get().spendShards(price)) return false;
        get().addToCollection(defId, 1);
        return true;
      },

      setDeck: (deck) => {
        set({ hangar: { deck: [...deck] } });
      },

      selectShip: (id) => {
        if (!get().ships.includes(id)) return;
        set({ selectedShip: id });
      },

      buyShip: (id, price) => {
        if (get().ships.includes(id)) {
          set({ selectedShip: id });
          return true;
        }
        if (!get().spendShards(price)) return false;
        set((s) => ({ ships: [...s.ships, id], selectedShip: id }));
        return true;
      },

      unlockTheme: (id) => {
        set((s) => (s.themes.includes(id) ? s : { themes: [...s.themes, id] }));
      },

      markTutorialSeen: (id) => {
        set((s) =>
          s.tutorialSeen.includes(id)
            ? s
            : { tutorialSeen: [...s.tutorialSeen, id] },
        );
      },

      resetTutorial: () => {
        set({ tutorialSeen: [] });
      },

      engrave: (defId, engravingId, price) => {
        const current = get().engravings[defId] ?? [];
        if (current.includes(engravingId)) return false;
        if (current.length >= socketsForDie(defId)) return false;
        if (!get().spendShards(price)) return false;
        set((s) => ({
          engravings: {
            ...s.engravings,
            [defId]: [...(s.engravings[defId] ?? []), engravingId],
          },
        }));
        return true;
      },

      removeEngraving: (defId, engravingId) => {
        set((s) => {
          const kept = (s.engravings[defId] ?? []).filter(
            (id) => id !== engravingId,
          );
          const engravings: Record<string, string[]> = {};
          for (const [key, ids] of Object.entries(s.engravings)) {
            if (key !== defId) engravings[key] = ids;
          }
          if (kept.length > 0) engravings[defId] = kept;
          return { engravings };
        });
      },

      awardBadge: (id) => {
        if (get().badges.includes(id)) return false;
        set((s) => ({ badges: [...s.badges, id] }));
        return true;
      },

      archiveRunFlags: (flags) => {
        set((s) => ({
          flagsArchive: [...new Set([...s.flagsArchive, ...flags])],
        }));
      },

      recordBossFirstKill: (bossId) => {
        if (get().bossFirstKills.includes(bossId)) return false;
        set((s) => ({ bossFirstKills: [...s.bossFirstKills, bossId] }));
        return true;
      },

      recordEnding: (endingId) => {
        if (get().endings.includes(endingId)) return false;
        set((s) => ({ endings: [...s.endings, endingId] }));
        return true;
      },

      markPrologueDone: () => {
        set((s) => ({ stats: { ...s.stats, prologueDone: true } }));
      },

      recordCampaignClear: (ascension) => {
        set((s) => ({
          ascension: {
            campaign: Math.max(s.ascension.campaign, ascension + 1),
          },
          stats: { ...s.stats, campaignClears: s.stats.campaignClears + 1 },
        }));
      },

      recordContractStars: (id, mask) => {
        const previous = get().contracts[id] ?? 0;
        const gained = mask & ~previous;
        if (gained === 0) return 0;
        set((s) => ({
          contracts: { ...s.contracts, [id]: previous | mask },
        }));
        let count = 0;
        for (let bit = 0; bit < 3; bit += 1) {
          if ((gained & (1 << bit)) !== 0) count += 1;
        }
        return count;
      },

      markDailyStarted: (date) => {
        set((s) =>
          s.dailyPlayed[date] !== undefined
            ? s
            : {
                dailyPlayed: {
                  ...s.dailyPlayed,
                  [date]: { state: 'started', score: 0, rank: null },
                },
              },
        );
      },

      recordDaily: (date, score, rank) => {
        set((s) => ({
          dailyPlayed: {
            ...s.dailyPlayed,
            [date]: { state: 'done', score, rank },
          },
          best:
            rank !== null &&
            (s.best.dailyRank === null || rank < s.best.dailyRank)
              ? { ...s.best, dailyRank: rank, dailyDate: date }
              : s.best,
        }));
      },

      recordDriftScore: (score, week) => {
        const best = get().best;
        const beatsAllTime = score > best.drift;
        set((s) => ({
          best: {
            ...s.best,
            drift: Math.max(s.best.drift, score),
            driftWeek: week,
            driftWeekly:
              s.best.driftWeek === week
                ? Math.max(s.best.driftWeekly, score)
                : score,
          },
        }));
        return beatsAllTime;
      },

      bumpLifetime: (delta) => {
        set((s) => {
          const stats = { ...s.stats };
          for (const key of LIFETIME_KEYS) stats[key] += delta[key] ?? 0;
          if (delta.deepestDrift !== undefined) {
            stats.deepestDrift = Math.max(
              stats.deepestDrift,
              delta.deepestDrift,
            );
          }
          return { stats };
        });
      },

      unlockAchievement: (id) => {
        if (get().achievements.includes(id)) return false;
        set((s) => ({ achievements: [...s.achievements, id] }));
        return true;
      },

      markAchievementsSeen: (ids) => {
        set((s) => ({
          achievementsSeen: [...new Set([...s.achievementsSeen, ...ids])],
        }));
      },

      grantUnlock: (id) => {
        if (get().unlocksGranted.includes(id)) return false;
        set((s) => ({ unlocksGranted: [...s.unlocksGranted, id] }));
        return true;
      },

      markUnlocksSeen: (ids) => {
        set((s) => ({
          unlocksSeen: [...new Set([...s.unlocksSeen, ...ids])],
        }));
      },

      recordEncounters: (list) => {
        const known = get().encountered;
        const firstFinds: string[] = [];
        const added: Record<string, EncounterRecord> = {};
        for (const entry of list) {
          if (known[entry.defId] !== undefined) continue;
          if (added[entry.defId] !== undefined) continue;
          added[entry.defId] = { sector: entry.sector, node: entry.node };
          firstFinds.push(entry.defId);
        }
        if (firstFinds.length === 0) return { firstFinds: [], shards: 0 };
        const shards = firstFinds.reduce((sum, defId) => {
          const rarity = DIE_BY_ID.get(defId)?.rarity ?? 'common';
          return sum + (FIRST_FIND_SHARDS[rarity] ?? 0);
        }, 0);
        set((s) => ({
          encountered: { ...s.encountered, ...added },
          shards: s.shards + shards,
          stats: { ...s.stats, shardsEarned: s.stats.shardsEarned + shards },
        }));
        return { firstFinds, shards };
      },

      setDieSkin: (id) => {
        if (!isDieSkinId(id)) return;
        set({ dieSkin: id });
      },

      setPrefs: (patch) => {
        set((s) => {
          const next = { ...s.prefs, ...patch };
          const same = (Object.keys(next) as (keyof AccountPrefs)[]).every(
            (key) => next[key] === s.prefs[key],
          );
          return same && Object.keys(next).length === Object.keys(s.prefs).length
            ? s
            : { prefs: next };
        });
      },

      recordStreak: (win) => {
        set((s) => {
          const streak = win ? s.stats.noDeathStreak + 1 : 0;
          return {
            stats: {
              ...s.stats,
              noDeathStreak: streak,
              bestNoDeathStreak: Math.max(s.stats.bestNoDeathStreak, streak),
            },
          };
        });
      },
    }),
    {
      name: META_PERSIST_KEY,
      storage: scopedPersistStorage<MetaValues>(),
      version: META_VERSION,
      migrate: migrateMeta,
      partialize: (s): MetaValues => ({
        shards: s.shards,
        xp: s.xp,
        level: s.level,
        chartPicks: s.chartPicks,
        collection: s.collection,
        ships: s.ships,
        selectedShip: s.selectedShip,
        hangar: s.hangar,
        themes: s.themes,
        tutorialSeen: s.tutorialSeen,
        engravings: s.engravings,
        badges: s.badges,
        codex: s.codex,
        codexRead: s.codexRead,
        seenPuzzles: s.seenPuzzles,
        seenFragments: s.seenFragments,
        contracts: s.contracts,
        dailyPlayed: s.dailyPlayed,
        best: s.best,
        ascension: s.ascension,
        flagsArchive: s.flagsArchive,
        bossFirstKills: s.bossFirstKills,
        endings: s.endings,
        achievements: s.achievements,
        achievementsSeen: s.achievementsSeen,
        encountered: s.encountered,
        unlocksGranted: s.unlocksGranted,
        unlocksSeen: s.unlocksSeen,
        dieSkin: s.dieSkin,
        prefs: s.prefs,
        stats: s.stats,
      }),
    },
  ),
);
