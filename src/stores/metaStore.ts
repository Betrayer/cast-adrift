import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { isDieSkinId } from '@/data/cosmetics';
import { DIE_BY_ID } from '@/data/dice';
import {
  echoNodeDef,
  echoUnlocked,
  type EchoNodeId,
} from '@/data/echo';
import { memoryFragmentCount } from '@/data/narrative/memories';
import { FIRST_FIND_SHARDS } from '@/data/metaShop';
import { socketsForDie } from '@/data/engravings';
import type { ShipId } from '@/data/ships';
import { CORE_NODE_ID } from '@/game/chart/cost';
import { chartResetCost } from '@/game/chart/engine';
import { levelFromTotalXp } from '@/game/xp';
import { scopedPersistStorage } from '@/stores/scopedStorage';
import {
  createInitialMetaValues,
  META_PERSIST_KEY,
  META_VERSION,
  metaValues,
  SEEN_FRAGMENT_MEMORY,
  SEEN_PUZZLE_MEMORY,
  VOUCHER_CAP,
  type AccountPrefs,
  type EncounterRecord,
  type EncounterResult,
  type MetaStats,
  type MetaValues,
  type RunEncounter,
  type VoucherKind,
} from '@/stores/metaValues';
import { migrateMeta } from '@/stores/metaMigrate';

export {
  ACCOUNT_PREF_KEYS,
  createInitialMetaStats,
  createInitialMetaValues,
  META_PERSIST_KEY,
  META_VERSION,
  metaValues,
  SINGULARITY_BADGE,
  SMOTRITEL_BADGE,
  VOUCHER_CAP,
} from '@/stores/metaValues';
export type {
  AccountPrefKey,
  AccountPrefs,
  CollectionEntry,
  MetaStats,
  MetaValues,
  VoucherKind,
} from '@/stores/metaValues';
export { migrateMeta } from '@/stores/metaMigrate';

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
  grantChartRespec: () => void;
  fullRespec: () => boolean;
  resetChart: () => boolean;
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
  markSystemsCheckDone: () => void;
  recordCampaignClear: (ascension: number) => void;
  recordContractStars: (id: string, mask: number) => number;
  markDailyStarted: (date: string) => void;
  recordDaily: (date: string, score: number, rank: number | null) => void;
  recordDriftScore: (score: number, week: string) => boolean;
  bumpLifetime: (delta: Partial<MetaStats>) => void;
  unlockAchievement: (id: string) => boolean;
  grantVoucher: (kind: VoucherKind) => boolean;
  spendVoucher: (kind: VoucherKind) => boolean;
  offerVoucher: (achievementId: string) => void;
  clearVoucherOffer: (achievementId: string) => boolean;
  markAchievementsSeen: (ids: readonly string[]) => void;
  grantUnlock: (id: string) => boolean;
  markUnlocksSeen: (ids: readonly string[]) => void;
  recordEncounters: (list: readonly RunEncounter[]) => EncounterResult;
  selectEcho: (id: EchoNodeId | null) => void;
  setDieSkin: (id: string) => void;
  setPrefs: (patch: AccountPrefs) => void;
  recordStreak: (win: boolean) => void;
}

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
  "wormholeRides",
  "holesBypassed",
  "disintegrations",
  "eventsResolved",
  "checksWon",
  "fusions",
  "engravingsFitted",
  "mk3Built",
  "resonance6",
  "flawlessBosses",
  "clearsWanderer",
  "clearsRam",
  "clearsArk",
  "clearsCorsair",
  "clearsFoundry",
  "clearsPrism",
] as const;

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

      grantChartRespec: () => {
        set((s) => ({ chartFreeRespecs: s.chartFreeRespecs + 1 }));
      },

      fullRespec: () => {
        if (get().chartFreeRespecs <= 0) return false;
        set((s) => ({
          chartPicks: [CORE_NODE_ID],
          chartFreeRespecs: s.chartFreeRespecs - 1,
        }));
        return true;
      },

      resetChart: () => {
        const s = get();
        if (s.chartFreeRespecs > 0) return s.fullRespec();
        const price = chartResetCost(s.level, s.chartPicks);
        if (!s.spendShards(price)) return false;
        set({ chartPicks: [CORE_NODE_ID] });
        return true;
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

      selectEcho: (id) => {
        if (id === null) {
          set({ selectedEcho: null });
          return;
        }
        const def = echoNodeDef(id);
        if (def === undefined) return;
        if (!echoUnlocked(def, memoryFragmentCount(get().codex))) return;
        set({ selectedEcho: def.id });
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
        set((s) => ({
          tutorialSeen: [],
          stats: { ...s.stats, systemsCheckDone: false },
        }));
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
          stats: {
            ...s.stats,
            engravingsFitted: s.stats.engravingsFitted + 1,
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

      markSystemsCheckDone: () => {
        set((s) => ({ stats: { ...s.stats, systemsCheckDone: true } }));
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

      grantVoucher: (kind) => {
        if (get().vouchers[kind] >= VOUCHER_CAP) return false;
        set((s) => ({
          vouchers: { ...s.vouchers, [kind]: s.vouchers[kind] + 1 },
        }));
        return true;
      },

      spendVoucher: (kind) => {
        if (get().vouchers[kind] <= 0) return false;
        set((s) => ({
          vouchers: { ...s.vouchers, [kind]: s.vouchers[kind] - 1 },
        }));
        return true;
      },

      offerVoucher: (achievementId) => {
        set((s) =>
          s.voucherOffers.includes(achievementId)
            ? s
            : { voucherOffers: [...s.voucherOffers, achievementId] },
        );
      },

      clearVoucherOffer: (achievementId) => {
        if (!get().voucherOffers.includes(achievementId)) return false;
        set((s) => ({
          voucherOffers: s.voucherOffers.filter((id) => id !== achievementId),
        }));
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
      partialize: (s): MetaValues => metaValues(s),
    },
  ),
);
