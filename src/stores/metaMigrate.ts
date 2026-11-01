import { resolveAchievementId } from '@/data/achievements';
import { CHART_NODE_BY_ID } from '@/data/chart';
import { isDieSkinId } from '@/data/cosmetics';
import { isEchoNodeId } from '@/data/echo';
import { SHIP_BY_ID, type ShipId } from '@/data/ships';
import { CORE_NODE_ID } from '@/game/chart/cost';
import { isOverBudget, picksConnected } from '@/game/chart/engine';
import { levelFromTotalXp } from '@/game/xp';
import {
  ACCOUNT_PREF_GUARDS,
  ACCOUNT_PREF_KEYS,
  buildStarterCollection,
  createInitialMetaValues,
  createInitialVouchers,
  META_VERSION,
  SEEN_FRAGMENT_MEMORY,
  SEEN_PUZZLE_MEMORY,
  VOUCHER_CAP,
  type AccountPrefKey,
  type AccountPrefs,
  type BestScores,
  type CollectionEntry,
  type DailyRecord,
  type EncounterRecord,
  type MetaStats,
  type MetaValues,
  type VoucherBank,
  type VoucherKind,
} from '@/stores/metaValues';

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

const copyPref = <K extends AccountPrefKey>(
  out: AccountPrefs,
  key: K,
  raw: unknown,
): void => {
  const isValid = ACCOUNT_PREF_GUARDS[key];
  if (isValid(raw)) out[key] = raw;
};

export const coercePrefs = (value: unknown): AccountPrefs => {
  if (typeof value !== 'object' || value === null) return {};
  const prev = value as Partial<Record<AccountPrefKey, unknown>>;
  const out: AccountPrefs = {};
  for (const key of ACCOUNT_PREF_KEYS) copyPref(out, key, prev[key]);
  return out;
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

const migrateAchievementIds = (ids: readonly string[]): string[] => [
  ...new Set(ids.map(resolveAchievementId)),
];

const coerceVouchers = (value: unknown): VoucherBank => {
  const base = createInitialVouchers();
  if (typeof value !== "object" || value === null) return base;
  const prev = value as Partial<Record<VoucherKind, unknown>>;
  return {
    perkDraft:
      typeof prev.perkDraft === "number"
        ? Math.max(0, Math.min(VOUCHER_CAP, Math.trunc(prev.perkDraft)))
        : base.perkDraft,
  };
};

const coerceShips = (value: unknown, base: readonly ShipId[]): ShipId[] =>
  Array.isArray(value)
    ? [
        ...new Set(
          [...base, ...value].filter((id): id is ShipId =>
            SHIP_BY_ID.has(id as ShipId),
          ),
        ),
      ]
    : [...base];

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
  const ships = coerceShips(prev.ships, base.ships);
  const level =
    typeof prev.xp === 'number'
      ? levelFromTotalXp(prev.xp)
      : typeof prev.level === 'number'
        ? prev.level
        : base.level;
  const kept = Array.isArray(prev.chartPicks)
    ? prev.chartPicks.filter((id) => CHART_NODE_BY_ID.has(id))
    : base.chartPicks;
  const picks = kept.includes(CORE_NODE_ID) ? kept : [CORE_NODE_ID, ...kept];
  const selectedShip =
    typeof prev.selectedShip === 'string' &&
    ships.includes(prev.selectedShip as ShipId)
      ? (prev.selectedShip as ShipId)
      : base.selectedShip;
  return {
    ...base,
    shards: typeof prev.shards === 'number' ? prev.shards : base.shards,
    vouchers: coerceVouchers(prev.vouchers),
    voucherOffers: migrateAchievementIds(
      coerceStrings(prev.voucherOffers, base.voucherOffers),
    ),
    xp: typeof prev.xp === 'number' ? prev.xp : base.xp,
    level,
    chartPicks: picks,
    chartFreeRespecs:
      typeof prev.chartFreeRespecs === 'number' && prev.chartFreeRespecs > 0
        ? prev.chartFreeRespecs
        : isOverBudget(level, picks) || !picksConnected(picks)
          ? 1
          : base.chartFreeRespecs,
    collection: coerceCollection(prev.collection),
    ships,
    selectedShip,
    selectedEcho: isEchoNodeId(prev.selectedEcho)
      ? prev.selectedEcho
      : base.selectedEcho,
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
    achievements: migrateAchievementIds(
      coerceStrings(prev.achievements, base.achievements),
    ),
    achievementsSeen: migrateAchievementIds(
      coerceStrings(prev.achievementsSeen, base.achievementsSeen),
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
