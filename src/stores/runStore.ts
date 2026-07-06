import { create } from "zustand";
import type { MkLevel } from "@/data/slots";
import type { ShopState } from "@/game/economy/shop";
import type { MapGraph, NodeId } from "@/game/map/types";
import type { SlotId } from "@/types/battle";

export type MkLevels = Partial<Record<SlotId, MkLevel>>;

export type RunMode = "slice";

export interface DieInstance {
  uid: string;
  defId: string;
  growthBonus?: number;
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
  flags: Record<string, boolean>;
  axis: number;
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
  setFlag: (key: string, value?: boolean) => void;
  addAxis: (n: number) => void;
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

  addAxis: (n) => {
    set((s) => ({ axis: Math.max(-10, Math.min(10, s.axis + n)) }));
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
