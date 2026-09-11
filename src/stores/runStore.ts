import { create } from "zustand";
import { CARGO_BY_ID } from "@/data/cargo";
import { echoVetoHull, type EchoNodeId } from "@/data/echo";
import { CABIN_CAP, OFFICER_BY_ID } from "@/data/officers";
import type { ShipId } from "@/data/ships";
import type { MkLevel } from "@/data/slots";
import {
  clampAxis,
  countDeckSchool,
  driftAllowed,
  sectorDriftDelta,
} from "@/game/run/axis";
import { bayPurchasable, moduleSlots } from "@/game/run/bays";
import { shipCargoHold } from "@/game/run/hold";
import { interferenceStacksForStreak } from "@/game/run/interference";
import { computeRunMods } from "@/game/run/runMods";
import type { ShopState } from "@/game/economy/shop";
import type { MapGraph, NodeId } from "@/game/map/types";
import type { WormholeThrow } from "@/game/map/wormhole";
import type { BattleLogEntry, SlotId } from "@/types/battle";
import type { Rarity } from "@/types/content";
import type { FlagValue } from "@/types/events";

export const LAST_BATTLE_LOG_CAP = 60;

export type MkLevels = Partial<Record<SlotId, MkLevel>>;

export type RunMode = "campaign" | "drift" | "daily" | "contract";

export interface DieInstance {
  uid: string;
  defId: string;
  growthBonus?: number;
}

export type PendingSwap =
  | { kind: "die"; defId: string }
  | { kind: "module"; moduleId: string }
  | { kind: "officer"; officerId: string };

export interface RunCargo {
  defId: string;
  nodeId: NodeId;
  sectorIndex: number;
  takenRow: number;
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

export interface RunEncounter {
  defId: string;
  sector: number;
  node: string;
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
  elites: number;
  minibosses: number;
  bosses: number;
  kills: number;
  scrapEarned: number;
  scrapSpent: number;
  depth: number;
  jumps: number;
  battlesWon: number;
  shieldAbsorbed: number;
  spinalMaxHit: number;
  rerollsUsed: number;
  repairBayHealed: number;
  fullHullBattleEnds: number;
  minBattleTurns: number;
  burnKillElites: number;
  shipyardVisits: number;
  maxBlackPlacedWin: number;
  dicePlaced: number;
  hullPctMin: number;
  wormholeRides: number;
  holesBypassed: number;
  actionHash: number;
  actionCount: number;
}

export interface BattleTally {
  won: boolean;
  turns: number;
  shieldAbsorbed: number;
  damageDealt: number;
  damageTaken: number;
  scrap: number;
  hull: number;
  hullMax: number;
  spinalMaxHit: number;
  rerollsUsed: number;
  repairBayHealed: number;
  endedFullHull: boolean;
  blackPlaced: number;
  dicePlaced: number;
  maxResonance: number;
  burnKilledElite: boolean;
}

const ADDITIVE_STAT_KEYS = [
  "nodesCleared",
  "elites",
  "minibosses",
  "bosses",
  "kills",
  "scrapEarned",
  "scrapSpent",
  "jumps",
  "battlesWon",
  "shieldAbsorbed",
  "rerollsUsed",
  "repairBayHealed",
  "fullHullBattleEnds",
  "burnKillElites",
  "shipyardVisits",
  "dicePlaced",
  "wormholeRides",
  "holesBypassed",
] as const;

export const NO_BATTLE_TURNS = 0;
export const FULL_HULL_PCT = 100;

export interface PendingRewards {
  dieDrop: string | null;
  perkChoices: string[];
  dieChoices?: string[];
  moduleChoices?: string[];
  salvage?: string[];
  voucher?: boolean;
  packageScrap?: number;
  draftNodeId?: NodeId;
  draftFloor?: "common" | "uncommon" | "rare";
}

export interface PuzzleRunState {
  puzzleId: string;
  attempts: number;
}

export interface RunValues {
  active: boolean;
  seed: number;
  mode: RunMode;
  mutators: string[];
  contractId: string | null;
  dailyDate: string | null;
  sector: number;
  sectorIndex: number;
  depthRow: number;
  position: NodeId | null;
  map: MapGraph | null;
  visited: NodeId[];
  hull: number;
  hullMax: number;
  scrap: number;
  shipId: ShipId;
  deck: DieInstance[];
  perks: string[];
  modules: string[];
  officers: string[];
  echo: EchoNodeId | null;
  echoUsed: boolean;
  cargo: RunCargo[];
  pendingCargoBark: boolean;
  pendingOfficerBark: boolean;
  baysPurchased: number;
  pendingSwaps: PendingSwap[];
  banishedPerks: string[];
  draftsSinceRare: number;
  draftRerollUsed: boolean;
  banishUsed: boolean;
  chartPicks: string[];
  mkLevels: MkLevels;
  tide: number;
  jumpsSinceTide: number;
  flags: Record<string, FlagValue>;
  counters: Record<string, number>;
  axis: number;
  driftBlack: number;
  driftBlue: number;
  driftSpent: number;
  seenEvents: string[];
  solvedPuzzles: string[];
  puzzleRuns: Record<NodeId, PuzzleRunState>;
  anomalyStreak: number;
  interferenceStacks: number;
  killedTypes: string[];
  battleMods: RunBattleMod[];
  battleEndHealRun: number;
  rerollSizeRun: number;
  bonusReveal: number;
  sectorReveal: number;
  shipyardDiscount: number;
  pendingBattle: PendingBattle | null;
  pendingWormhole: NodeId | null;
  lastWormhole: WormholeThrow | null;
  pendingDeepScan: boolean;
  pendingRewards: PendingRewards | null;
  lastTally: BattleTally | null;
  lastBattleLog: BattleLogEntry[];
  shop: ShopState | null;
  deckSeq: number;
  stats: RunStats;
  ascension: number;
  vouchers: number;
  usedMinibosses: string[];
  bossesKilled: string[];
  memoryOrders: number[];
  endingId: string | null;
  endingFirstTime: boolean;
  crossedThreshold: boolean;
  encounters: RunEncounter[];
  startedAt: number;
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
  noteDraftOffer: (hadRare: boolean) => void;
  banishPerk: (perkId: string) => boolean;
  useDraftReroll: () => boolean;
  addModule: (moduleId: string) => boolean;
  removeModule: (moduleId: string) => void;
  addOfficer: (officerId: string) => boolean;
  removeOfficer: (officerId: string) => void;
  spendEcho: () => boolean;
  addCargo: (entry: RunCargo) => boolean;
  removeCargo: (defId: string) => void;
  setCargoBark: (value: boolean) => void;
  setOfficerBark: (value: boolean) => void;
  purchaseBay: () => void;
  queueSwap: (swap: PendingSwap) => void;
  shiftSwap: () => void;
  setFlag: (key: string, value?: FlagValue) => void;
  clearFlag: (key: string) => void;
  bumpCounter: (key: string, delta: number) => void;
  addAxis: (n: number) => void;
  noteDriftUsage: (blackUsed: number, blueUsed: number) => void;
  settleSectorDrift: () => number;
  markEventSeen: (id: string) => void;
  markPuzzleSolved: (id: string) => void;
  beginPuzzle: (nodeId: NodeId, puzzleId: string) => PuzzleRunState;
  spendPuzzleAttempt: (nodeId: NodeId) => number;
  recordAnomalySolved: () => void;
  recordAnomalyUnsolved: () => void;
  markKilledType: (defId: string) => boolean;
  addBattleMod: (mod: RunBattleMod) => void;
  consumeBattleMods: () => ConsumedBattleMods;
  addBattleEndHeal: (n: number) => void;
  addRerollSizeRun: (n: number) => void;
  addBonusReveal: (n: number) => void;
  addSectorReveal: (n: number) => void;
  addShipyardDiscount: (n: number) => void;
  setPendingBattle: (pending: PendingBattle | null) => void;
  bumpStats: (delta: Partial<RunStats>) => void;
  noteDepth: (depth: number) => void;
  noteHullPct: (pct: number) => void;
  noteBattleTally: (tally: BattleTally) => void;
  clearBattleTally: () => void;
  keepBattleLog: (log: readonly BattleLogEntry[]) => void;
  clearPendingDeepScan: () => void;
  setPendingDeepScan: (value: boolean) => void;
  setPendingRewards: (rewards: PendingRewards | null) => void;
  setShop: (shop: ShopState | null) => void;
  bumpMk: (slotId: SlotId) => void;
  setMk: (slotId: SlotId, mk: MkLevel) => void;
  resetMk: () => void;
  addVoucher: (n?: number) => void;
  spendVoucher: () => boolean;
  markMinibossUsed: (defId: string) => void;
  markBossKilled: (defId: string) => boolean;
  unlockMemory: (order: number) => boolean;
  setEnding: (id: string | null, firstTime?: boolean) => void;
  crossThreshold: () => void;
  reset: () => void;
}

export const createInitialRunStats = (): RunStats => ({
  nodesCleared: 0,
  elites: 0,
  minibosses: 0,
  bosses: 0,
  kills: 0,
  scrapEarned: 0,
  scrapSpent: 0,
  depth: 0,
  jumps: 0,
  battlesWon: 0,
  shieldAbsorbed: 0,
  spinalMaxHit: 0,
  rerollsUsed: 0,
  repairBayHealed: 0,
  fullHullBattleEnds: 0,
  minBattleTurns: NO_BATTLE_TURNS,
  burnKillElites: 0,
  shipyardVisits: 0,
  maxBlackPlacedWin: 0,
  dicePlaced: 0,
  hullPctMin: FULL_HULL_PCT,
  wormholeRides: 0,
  holesBypassed: 0,
  actionHash: 0,
  actionCount: 0,
});

export const MAX_SHIPYARD_DISCOUNT = 60;

export const createInitialRunValues = (): RunValues => ({
  active: false,
  seed: 0,
  mode: "campaign",
  mutators: [],
  contractId: null,
  dailyDate: null,
  sector: 1,
  sectorIndex: 1,
  depthRow: 0,
  position: null,
  map: null,
  visited: [],
  hull: 0,
  hullMax: 0,
  scrap: 0,
  shipId: "wanderer",
  deck: [],
  perks: [],
  modules: [],
  officers: [],
  echo: null,
  echoUsed: false,
  cargo: [],
  pendingCargoBark: false,
  pendingOfficerBark: false,
  baysPurchased: 0,
  pendingSwaps: [],
  banishedPerks: [],
  draftsSinceRare: 0,
  draftRerollUsed: false,
  banishUsed: false,
  chartPicks: [],
  mkLevels: {},
  tide: 0,
  jumpsSinceTide: 0,
  flags: {},
  counters: {},
  axis: 0,
  driftBlack: 0,
  driftBlue: 0,
  driftSpent: 0,
  seenEvents: [],
  solvedPuzzles: [],
  puzzleRuns: {},
  anomalyStreak: 0,
  interferenceStacks: 0,
  killedTypes: [],
  battleMods: [],
  battleEndHealRun: 0,
  rerollSizeRun: 0,
  bonusReveal: 0,
  sectorReveal: 0,
  shipyardDiscount: 0,
  pendingBattle: null,
  pendingWormhole: null,
  lastWormhole: null,
  pendingDeepScan: false,
  pendingRewards: null,
  lastTally: null,
  lastBattleLog: [],
  shop: null,
  deckSeq: 0,
  stats: createInitialRunStats(),
  ascension: 0,
  vouchers: 0,
  usedMinibosses: [],
  bossesKilled: [],
  memoryOrders: [],
  endingId: null,
  endingFirstTime: false,
  crossedThreshold: false,
  encounters: [],
  startedAt: 0,
});

export const runModuleSlots = (s: RunValues): number =>
  moduleSlots(
    s.shipId,
    computeRunMods(s.perks, s.chartPicks).moduleSlotDelta,
    s.baysPurchased,
  );

export const runCargoHold = (s: RunValues): number => shipCargoHold(s.shipId);

export const runBayPurchasable = (s: RunValues): boolean =>
  bayPurchasable(
    s.shipId,
    computeRunMods(s.perks, s.chartPicks).moduleSlotDelta,
    s.baysPurchased,
  );

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
    set((s) => {
      const node =
        s.map?.nodes.find((n) => n.id === s.position)?.type ?? "start";
      return {
        deck: [...s.deck, { uid, defId, ...(growthBonus ? { growthBonus } : {}) }],
        deckSeq: s.deckSeq + 1,
        encounters: s.encounters.some((e) => e.defId === defId)
          ? s.encounters
          : [...s.encounters, { defId, sector: s.sector, node }],
      };
    });
    return uid;
  },

  removeDie: (uid) => {
    set((s) => ({ deck: s.deck.filter((d) => d.uid !== uid) }));
  },

  healHull: (n) => {
    set((s) => ({ hull: Math.max(0, Math.min(s.hullMax, s.hull + n)) }));
  },

  setHull: (n) => {
    set((s) => {
      const veto = echoVetoHull(s.echo);
      const vetoes = veto > 0 && !s.echoUsed && s.hull > 0 && n <= 0;
      const hull = Math.max(0, Math.min(s.hullMax, vetoes ? veto : n));
      return vetoes ? { hull, echoUsed: true } : { hull };
    });
  },

  addPerk: (perkId) => {
    set((s) =>
      s.perks.includes(perkId) ? s : { perks: [...s.perks, perkId] },
    );
  },

  noteDraftOffer: (hadRare) => {
    set((s) => ({ draftsSinceRare: hadRare ? 0 : s.draftsSinceRare + 1 }));
  },

  banishPerk: (perkId) => {
    const s = get();
    if (s.banishUsed || s.banishedPerks.includes(perkId)) return false;
    set({ banishUsed: true, banishedPerks: [...s.banishedPerks, perkId] });
    return true;
  },

  useDraftReroll: () => {
    if (get().draftRerollUsed) return false;
    set({ draftRerollUsed: true });
    return true;
  },

  addModule: (moduleId) => {
    const s = get();
    if (s.modules.includes(moduleId)) return false;
    if (s.modules.length >= runModuleSlots(s)) return false;
    set({ modules: [...s.modules, moduleId] });
    return true;
  },

  removeModule: (moduleId) => {
    set((s) => ({ modules: s.modules.filter((m) => m !== moduleId) }));
  },

  addOfficer: (officerId) => {
    const s = get();
    if (OFFICER_BY_ID.get(officerId) === undefined) return false;
    if (s.officers.includes(officerId)) return false;
    if (s.officers.length >= CABIN_CAP) return false;
    set({ officers: [...s.officers, officerId], pendingOfficerBark: true });
    return true;
  },

  removeOfficer: (officerId) => {
    set((s) => ({ officers: s.officers.filter((o) => o !== officerId) }));
  },

  spendEcho: () => {
    if (get().echoUsed) return false;
    set({ echoUsed: true });
    return true;
  },

  addCargo: (entry) => {
    const s = get();
    if (CARGO_BY_ID.get(entry.defId) === undefined) return false;
    if (s.cargo.some((held) => held.defId === entry.defId)) return false;
    if (s.cargo.length >= runCargoHold(s)) return false;
    set({ cargo: [...s.cargo, { ...entry }] });
    return true;
  },

  removeCargo: (defId) => {
    set((s) => ({ cargo: s.cargo.filter((held) => held.defId !== defId) }));
  },

  setCargoBark: (value) => {
    set({ pendingCargoBark: value });
  },

  setOfficerBark: (value) => {
    set({ pendingOfficerBark: value });
  },

  purchaseBay: () => {
    set((s) => ({ baysPurchased: s.baysPurchased + 1 }));
  },

  queueSwap: (swap) => {
    set((s) => ({ pendingSwaps: [...s.pendingSwaps, swap] }));
  },

  shiftSwap: () => {
    set((s) => ({ pendingSwaps: s.pendingSwaps.slice(1) }));
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

  bumpCounter: (key, delta) => {
    set((s) => ({
      counters: { ...s.counters, [key]: (s.counters[key] ?? 0) + delta },
    }));
  },

  addAxis: (n) => {
    set((s) => ({ axis: clampAxis(s.axis + n) }));
  },

  noteDriftUsage: (blackUsed, blueUsed) => {
    set((s) => ({
      driftBlack: s.driftBlack + blackUsed,
      driftBlue: s.driftBlue + blueUsed,
    }));
  },

  settleSectorDrift: () => {
    const s = get();
    const delta = driftAllowed(
      sectorDriftDelta(
        s.driftBlack,
        s.driftBlue,
        countDeckSchool(s.deck, "black"),
        countDeckSchool(s.deck, "blue"),
      ),
      s.driftSpent,
    );
    set({
      driftBlack: 0,
      driftBlue: 0,
      driftSpent: s.driftSpent + Math.abs(delta),
      axis: clampAxis(s.axis + delta),
    });
    return delta;
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

  beginPuzzle: (nodeId, puzzleId) => {
    const existing = get().puzzleRuns[nodeId];
    if (existing !== undefined && existing.puzzleId === puzzleId) return existing;
    const fresh: PuzzleRunState = { puzzleId, attempts: 0 };
    set((s) => ({ puzzleRuns: { ...s.puzzleRuns, [nodeId]: fresh } }));
    return fresh;
  },

  spendPuzzleAttempt: (nodeId) => {
    const current = get().puzzleRuns[nodeId];
    if (current === undefined) return 0;
    const next = { ...current, attempts: current.attempts + 1 };
    set((s) => ({ puzzleRuns: { ...s.puzzleRuns, [nodeId]: next } }));
    return next.attempts;
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

  addSectorReveal: (n) => {
    set((s) => ({ sectorReveal: Math.max(0, s.sectorReveal + n) }));
  },

  addShipyardDiscount: (n) => {
    set((s) => ({
      shipyardDiscount: Math.max(
        0,
        Math.min(MAX_SHIPYARD_DISCOUNT, s.shipyardDiscount + n),
      ),
    }));
  },

  setPendingBattle: (pending) => {
    set({ pendingBattle: pending });
  },

  bumpStats: (delta) => {
    set((s) => {
      const stats = { ...s.stats };
      for (const key of ADDITIVE_STAT_KEYS) stats[key] += delta[key] ?? 0;
      return { stats };
    });
  },

  noteDepth: (depth) => {
    set((s) =>
      depth <= s.stats.depth
        ? s
        : { stats: { ...s.stats, depth: Math.round(depth) } },
    );
  },

  noteHullPct: (pct) => {
    const clamped = Math.max(0, Math.min(FULL_HULL_PCT, Math.round(pct)));
    set((s) =>
      clamped >= s.stats.hullPctMin
        ? s
        : { stats: { ...s.stats, hullPctMin: clamped } },
    );
  },

  noteBattleTally: (tally) => {
    set((s) => {
      const prev = s.stats;
      const turns = Math.max(1, tally.turns);
      return {
        lastTally: tally,
        stats: {
          ...prev,
          battlesWon: prev.battlesWon + (tally.won ? 1 : 0),
          shieldAbsorbed: prev.shieldAbsorbed + tally.shieldAbsorbed,
          rerollsUsed: prev.rerollsUsed + tally.rerollsUsed,
          repairBayHealed: prev.repairBayHealed + tally.repairBayHealed,
          fullHullBattleEnds:
            prev.fullHullBattleEnds +
            (tally.won && tally.endedFullHull ? 1 : 0),
          burnKillElites:
            prev.burnKillElites + (tally.burnKilledElite ? 1 : 0),
          dicePlaced: prev.dicePlaced + tally.dicePlaced,
          spinalMaxHit: Math.max(prev.spinalMaxHit, tally.spinalMaxHit),
          maxBlackPlacedWin: tally.won
            ? Math.max(prev.maxBlackPlacedWin, tally.blackPlaced)
            : prev.maxBlackPlacedWin,
          minBattleTurns:
            tally.won && turns > 0
              ? prev.minBattleTurns === NO_BATTLE_TURNS
                ? turns
                : Math.min(prev.minBattleTurns, turns)
              : prev.minBattleTurns,
        },
      };
    });
  },

  clearBattleTally: () => {
    set({ lastTally: null });
  },

  keepBattleLog: (log) => {
    set({
      lastBattleLog: log
        .slice(Math.max(0, log.length - LAST_BATTLE_LOG_CAP))
        .map((entry) => ({ ...entry })),
    });
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

  addVoucher: (n = 1) => {
    set((s) => ({ vouchers: s.vouchers + n }));
  },

  spendVoucher: () => {
    if (get().vouchers <= 0) return false;
    set((s) => ({ vouchers: s.vouchers - 1 }));
    return true;
  },

  markMinibossUsed: (defId) => {
    set((s) =>
      s.usedMinibosses.includes(defId)
        ? s
        : { usedMinibosses: [...s.usedMinibosses, defId] },
    );
  },

  markBossKilled: (defId) => {
    if (get().bossesKilled.includes(defId)) return false;
    set((s) => ({ bossesKilled: [...s.bossesKilled, defId] }));
    return true;
  },

  unlockMemory: (order) => {
    if (get().memoryOrders.includes(order)) return false;
    set((s) => ({ memoryOrders: [...s.memoryOrders, order].sort((a, b) => a - b) }));
    return true;
  },

  setEnding: (id, firstTime = false) => {
    set({ endingId: id, endingFirstTime: firstTime });
  },

  crossThreshold: () => {
    set({ crossedThreshold: true });
  },

  reset: () => {
    set(createInitialRunValues());
  },
}));
