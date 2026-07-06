import { create } from "zustand";
import type { MkLevel } from "@/data/slots";
import { interferenceStacksForStreak } from "@/game/run/interference";
import type { ShopState } from "@/game/economy/shop";
import type { MapGraph, NodeId } from "@/game/map/types";
import type { SlotId } from "@/types/battle";
import type { Rarity } from "@/types/content";
import type { FlagValue } from "@/types/events";

export type MkLevels = Partial<Record<SlotId, MkLevel>>;

export type RunMode = "slice";

export interface DieInstance {
  uid: string;
  defId: string;
  growthBonus?: number;
}

export type BattleModKind = "startCharge" | "enemyPlus";

export interface RunBattleMod {
  kind: BattleModKind;
  value: number;
  battlesLeft: number;
}

export interface ConsumedBattleMods {
  startCharge: number;
  enemyPlus: number;
}

export interface PendingBattle {
  enemyIds: string[];
  originNodeId: NodeId;
  scrap: number;
  lootDie: string | null;
  lootRarity: Rarity | null;
  setFlags: [string, FlagValue][];
  clearFlags: string[];
}

export interface RunStats {
  nodesCleared: number;
  kills: number;
  scrapEarned: number;
  scrapSpent: number;
}

export interface PendingRewards {
  dieDrop: string | null;
  perkChoices: string[];
}

export interface RunValues {
  active: boolean;
  seed: number;
  mode: RunMode;
  sector: number;
  depthRow: number;
  position: NodeId | null;
  map: MapGraph | null;
  visited: NodeId[];
  hull: number;
  hullMax: number;
  scrap: number;
  deck: DieInstance[];
  perks: string[];
  mkLevels: MkLevels;
  tide: number;
  jumpsSinceTide: number;
  flags: Record<string, FlagValue>;
  axis: number;
  seenEvents: string[];
  solvedPuzzles: string[];
  anomalyStreak: number;
  interferenceStacks: number;
  killedTypes: string[];
  battleMods: RunBattleMod[];
  battleEndHealRun: number;
  rerollSizeRun: number;
  bonusReveal: number;
  shipyardDiscount: number;
  pendingBattle: PendingBattle | null;
  pendingDeepScan: boolean;
  pendingRewards: PendingRewards | null;
  shop: ShopState | null;
  deckSeq: number;
  stats: RunStats;
}

export interface RunState extends RunValues {
  hydrate: (values: RunValues) => void;
  addScrap: (n: number) => void;
  spendScrap: (n: number) => boolean;
  addDie: (defId: string, growthBonus?: number) => string;
  removeDie: (uid: string) => void;
  healHull: (n: number) => void;
  setHull: (n: number) => void;
  addPerk: (perkId: string) => void;
  setFlag: (key: string, value?: FlagValue) => void;
  clearFlag: (key: string) => void;
  addAxis: (n: number) => void;
  markEventSeen: (id: string) => void;
  markPuzzleSolved: (id: string) => void;
  recordAnomalySolved: () => void;
  recordAnomalyUnsolved: () => void;
  markKilledType: (defId: string) => boolean;
  addBattleMod: (mod: RunBattleMod) => void;
  consumeBattleMods: () => ConsumedBattleMods;
  addBattleEndHeal: (n: number) => void;
  addRerollSizeRun: (n: number) => void;
  addBonusReveal: (n: number) => void;
  addShipyardDiscount: (n: number) => void;
  setPendingBattle: (pending: PendingBattle | null) => void;
  bumpStats: (delta: Partial<RunStats>) => void;
  clearPendingDeepScan: () => void;
  setPendingDeepScan: (value: boolean) => void;
  setPendingRewards: (rewards: PendingRewards | null) => void;
  setShop: (shop: ShopState | null) => void;
  bumpMk: (slotId: SlotId) => void;
  setMk: (slotId: SlotId, mk: MkLevel) => void;
  resetMk: () => void;
  reset: () => void;
}

export const createInitialRunValues = (): RunValues => ({
  active: false,
  seed: 0,
  mode: "slice",
  sector: 1,
  depthRow: 0,
  position: null,
  map: null,
  visited: [],
  hull: 0,
  hullMax: 0,
  scrap: 0,
  deck: [],
  perks: [],
  mkLevels: {},
  tide: 0,
  jumpsSinceTide: 0,
  flags: {},
  axis: 0,
  seenEvents: [],
  solvedPuzzles: [],
  anomalyStreak: 0,
  interferenceStacks: 0,
  killedTypes: [],
  battleMods: [],
  battleEndHealRun: 0,
  rerollSizeRun: 0,
  bonusReveal: 0,
  shipyardDiscount: 0,
  pendingBattle: null,
  pendingDeepScan: false,
  pendingRewards: null,
  shop: null,
  deckSeq: 0,
  stats: { nodesCleared: 0, kills: 0, scrapEarned: 0, scrapSpent: 0 },
});

export const useRunStore = create<RunState>()((set, get) => ({
  ...createInitialRunValues(),

  hydrate: (values) => {
    set({ ...createInitialRunValues(), ...values });
  },

  addScrap: (n) => {
    if (n <= 0) return;
    set((s) => ({
      scrap: s.scrap + n,
      stats: { ...s.stats, scrapEarned: s.stats.scrapEarned + n },
    }));
  },

  spendScrap: (n) => {
    const s = get();
    if (n < 0 || s.scrap < n) return false;
    set({
      scrap: s.scrap - n,
      stats: { ...s.stats, scrapSpent: s.stats.scrapSpent + n },
    });
    return true;
  },

  addDie: (defId, growthBonus) => {
    const uid = `d${String(get().deckSeq)}`;
    set((s) => ({
      deck: [...s.deck, { uid, defId, ...(growthBonus ? { growthBonus } : {}) }],
      deckSeq: s.deckSeq + 1,
    }));
    return uid;
  },

  removeDie: (uid) => {
    set((s) => ({ deck: s.deck.filter((d) => d.uid !== uid) }));
  },

  healHull: (n) => {
    set((s) => ({ hull: Math.max(0, Math.min(s.hullMax, s.hull + n)) }));
  },

  setHull: (n) => {
    set((s) => ({ hull: Math.max(0, Math.min(s.hullMax, n)) }));
  },

  addPerk: (perkId) => {
    set((s) =>
      s.perks.includes(perkId) ? s : { perks: [...s.perks, perkId] },
    );
  },

  setFlag: (key, value = true) => {
    set((s) => ({ flags: { ...s.flags, [key]: value } }));
  },

  clearFlag: (key) => {
    set((s) => {
      if (s.flags[key] === undefined) return s;
      const flags: Record<string, FlagValue> = {};
      for (const [k, v] of Object.entries(s.flags)) {
        if (k !== key) flags[k] = v;
      }
      return { flags };
    });
  },

  addAxis: (n) => {
    set((s) => ({ axis: Math.max(-10, Math.min(10, s.axis + n)) }));
  },

  markEventSeen: (id) => {
    set((s) =>
      s.seenEvents.includes(id) ? s : { seenEvents: [...s.seenEvents, id] },
    );
  },

  markPuzzleSolved: (id) => {
    set((s) =>
      s.solvedPuzzles.includes(id)
        ? s
        : { solvedPuzzles: [...s.solvedPuzzles, id] },
    );
  },

  recordAnomalySolved: () => {
    set({ anomalyStreak: 0, interferenceStacks: 0 });
  },

  recordAnomalyUnsolved: () => {
    set((s) => {
      const streak = s.anomalyStreak + 1;
      return {
        anomalyStreak: streak,
        interferenceStacks: interferenceStacksForStreak(streak),
      };
    });
  },

  markKilledType: (defId) => {
    if (get().killedTypes.includes(defId)) return false;
    set((s) => ({ killedTypes: [...s.killedTypes, defId] }));
    return true;
  },

  addBattleMod: (mod) => {
    set((s) => ({ battleMods: [...s.battleMods, mod] }));
  },

  consumeBattleMods: () => {
    const result: ConsumedBattleMods = { startCharge: 0, enemyPlus: 0 };
    set((s) => {
      const next: RunBattleMod[] = [];
      for (const mod of s.battleMods) {
        if (mod.battlesLeft <= 0) continue;
        if (mod.kind === "startCharge") result.startCharge += mod.value;
        else result.enemyPlus += mod.value;
        const left = mod.battlesLeft - 1;
        if (left > 0) next.push({ ...mod, battlesLeft: left });
      }
      return { battleMods: next };
    });
    return result;
  },

  addBattleEndHeal: (n) => {
    set((s) => ({ battleEndHealRun: s.battleEndHealRun + n }));
  },

  addRerollSizeRun: (n) => {
    set((s) => ({ rerollSizeRun: s.rerollSizeRun + n }));
  },

  addBonusReveal: (n) => {
    set((s) => ({ bonusReveal: Math.max(0, s.bonusReveal + n) }));
  },

  addShipyardDiscount: (n) => {
    set((s) => ({ shipyardDiscount: Math.max(0, s.shipyardDiscount + n) }));
  },

  setPendingBattle: (pending) => {
    set({ pendingBattle: pending });
  },

  bumpStats: (delta) => {
    set((s) => ({
      stats: {
        nodesCleared: s.stats.nodesCleared + (delta.nodesCleared ?? 0),
        kills: s.stats.kills + (delta.kills ?? 0),
        scrapEarned: s.stats.scrapEarned + (delta.scrapEarned ?? 0),
        scrapSpent: s.stats.scrapSpent + (delta.scrapSpent ?? 0),
      },
    }));
  },

  clearPendingDeepScan: () => {
    set({ pendingDeepScan: false });
  },

  setPendingDeepScan: (value) => {
    set({ pendingDeepScan: value });
  },

  setPendingRewards: (rewards) => {
    set({ pendingRewards: rewards });
  },

  setShop: (shop) => {
    set({ shop });
  },

  bumpMk: (slotId) => {
    set((s) => {
      const current = s.mkLevels[slotId] ?? 1;
      const next: MkLevel = current >= 3 ? 3 : ((current + 1) as MkLevel);
      return { mkLevels: { ...s.mkLevels, [slotId]: next } };
    });
  },

  setMk: (slotId, mk) => {
    set((s) => ({ mkLevels: { ...s.mkLevels, [slotId]: mk } }));
  },

  resetMk: () => {
    set({ mkLevels: {} });
  },

  reset: () => {
    set(createInitialRunValues());
  },
}));

declare global {
  interface Window {
    __run?: typeof useRunStore;
  }
}

if (import.meta.env.DEV && typeof window !== "undefined") {
  window.__run = useRunStore;
}
