import { create } from "zustand";
import { ENEMY_BY_ID } from "@/data/enemies";
import { SHIP_BY_ID, type ShipId } from "@/data/ships";
import {
  adjacentCopyValue,
  canBank,
  canCopy,
  canFlip,
  canSplit,
  canSwap,
  flippedValue,
  isSwapTarget,
  SPLIT_DIE_COUNT,
  SPLIT_DIE_DEF,
} from "@/game/battle/actives";
import { DIE_BY_ID, rollBaseValue } from "@/data/dice";
import { computeCensus, resonanceAtLeast } from "@/game/battle/resonance";
import {
  advanceTurn,
  BASE_REROLL_SIZE,
  BLOOD_REACTOR_CHARGE,
  BLOOD_REACTOR_HULL,
  BONUS_REROLL_COST,
  NUDGE_COST,
  resolveEnemyPhase,
  resolvePlayerPhase,
  SACRIFICE_DAMAGE,
  SURGE_COST,
} from "@/game/battle/resolver";
import {
  buildBattleSnapshot,
  canPlaceDie,
  createEnemyStream,
  DEFAULT_CHARGE_CAP,
  type ResonanceBoost,
} from "@/game/battle/setup";
import { computeMutatorMods } from "@/data/mutators";
import { dieHasGrant, type EngravingMap } from "@/data/engravings";
import { FATE_DIE_ID, fateOutcomeFor, type FateOutcome } from "@/data/fate";
import type { PerkTrait } from "@/data/perks/types";
import {
  createStreamFromState,
  restoreStreams,
  serializeStreams,
  type RngStream,
  type RngStreams,
  type StreamStates,
} from "@/services/rng";
import { computeRunMods, runHasTrait } from "@/game/run/runMods";
import { applyActions, BattleCtx, buildSources, emit } from "@/game/effects";
import type {
  ExceedCapGrant,
  GrantKey,
  ScheduledEffect,
} from "@/game/effects/types";
import { recordAction } from "@/game/run/actionLog";
import { useRunStore, type BattleTally } from "@/stores/runStore";
import type { School } from "@/types/content";
import type {
  BattleOutcome,
  BattlePhase,
  BattleSnapshot,
  Beat,
  BlockedSlot,
  EnemyBeat,
  EnemyState,
  EngineTier,
  LockedDie,
  NextTurnMods,
  ResonanceCensus,
  ResolutionBundle,
  RolledDie,
  SlotId,
  SlotState,
} from "@/types/battle";

export interface BattleEncounter {
  enemyIds: string[];
  shipId?: ShipId;
  tide?: number;
  interference?: number;
  perks?: readonly string[];
  chartPicks?: readonly string[];
  mutators?: readonly string[];
  modules?: readonly string[];
  engravings?: EngravingMap;
  flags?: readonly string[];
  runCounters?: Readonly<Record<string, number>>;
  hull?: number;
  hullMax?: number;
  chargeCap?: number;
  startCharge?: number;
  rerollSizeBonus?: number;
  ascension?: number;
  sectorHpPct?: number;
  enemyHpBonusPct?: number;
  eliteShield?: number;
  resonanceBoost?: ResonanceBoost;
  slotTierDelta?: Partial<Record<SlotId, number>>;
  disabledSlots?: readonly SlotId[];
  forcedTraits?: readonly PerkTrait[];
  scriptedSlots?: readonly (readonly SlotId[])[];
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
  tide: number;
  sectorHpPct: number;
  enemyHpPct: number;
  interference: number;
  perks: string[];
  chartPicks: string[];
  mutators: string[];
  modules: string[];
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
  enemies: EnemyState[];
  targetId: string | null;
  engineState: EngineTier | null;
  nextTurnMods: NextTurnMods;
  nextRollBonus: number;
  pendingDeepScan: boolean;
  blockedSlots: BlockedSlot[];
  shrunkSlots: BlockedSlot[];
  lockedDice: LockedDie[];
  resonance: ResonanceCensus;
  survivedLethal: boolean;
  lastPlayerDamage: number;
  stolenScrap: number;
  pendingTwist: number;
  pendingSwap: number;
  pendingStorm: number;
  ascension: number;
  overflowShieldUsed: boolean;
  pierceUsed: boolean;
  fateUses: number;
  fateRoll: number | null;
  fateOutcomeId: string | null;
  spentGrants: string[];
  introPending: boolean;
  introEnemyId: string | null;
  scriptedSlots: SlotId[][] | null;
  outcome?: BattleOutcome;
  resolution: ResolutionBundle | null;
  beats: Beat[];
  enemyBeats: EnemyBeat[];
  beatSeq: number;
  blackUsed: number;
  blueUsed: number;
  shieldAbsorbed: number;
  spinalMaxHit: number;
  rerollsUsed: number;
  repairBayHealed: number;
  dicePlaced: number;
  burnKilledElite: boolean;
  streams: RngStreams | null;
  enemyStream: RngStream | null;
  debugNextRoll: number[] | null;
}

export interface BattleState extends BattleValues {
  dismissIntro: () => void;
  startBattle: (
    encounter: BattleEncounter,
    deckDefIds: readonly string[],
    streams: RngStreams,
  ) => void;
  placeDie: (uid: string, slotId: SlotId) => void;
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
  rollFate: () => void;
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
  tide: 0,
  interference: 0,
  perks: [],
  chartPicks: [],
  mutators: [],
  modules: [],
  engravings: {},
  flags: [],
  counters: {},
  runCounters: {},
  exceedCap: [],
  sectorHpPct: 0,
  enemyHpPct: 0,
  scheduled: [],
  grants: {},
  forcedTraits: [],
  chargeCap: DEFAULT_CHARGE_CAP,
  sacrificePool: 0,
  bloodReactorUsed: false,
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
  engineState: null,
  nextTurnMods: {},
  nextRollBonus: 0,
  pendingDeepScan: false,
  blockedSlots: [],
  shrunkSlots: [],
  lockedDice: [],
  resonance: computeCensus([]),
  survivedLethal: false,
  lastPlayerDamage: 0,
  stolenScrap: 0,
  pendingTwist: 0,
  pendingSwap: 0,
  pendingStorm: 0,
  swapSourceUid: null,
  ascension: 0,
  overflowShieldUsed: false,
  pierceUsed: false,
  fateUses: 0,
  fateRoll: null,
  fateOutcomeId: null,
  spentGrants: [],
  introPending: false,
  introEnemyId: null,
  scriptedSlots: null,
  outcome: undefined,
  resolution: null,
  beats: [],
  enemyBeats: [],
  beatSeq: 0,
  blackUsed: 0,
  blueUsed: 0,
  shieldAbsorbed: 0,
  spinalMaxHit: 0,
  rerollsUsed: 0,
  repairBayHealed: 0,
  dicePlaced: 0,
  burnKilledElite: false,
  streams: null,
  enemyStream: null,
  debugNextRoll: null,
});

export const battleSnapshot = (s: BattleValues): BattleSnapshot => ({
  turn: s.turn,
  hull: s.hull,
  hullMax: s.hullMax,
  shield: s.shield,
  shieldPersist: s.shieldPersist,
  charge: s.charge,
  scrap: s.scrap,
  tide: s.tide,
  interference: s.interference,
  perks: s.perks,
  chartPicks: s.chartPicks,
  mutators: s.mutators,
  modules: s.modules,
  engravings: s.engravings,
  flags: s.flags,
  counters: s.counters,
  runCounters: s.runCounters,
  exceedCap: s.exceedCap,
  scheduled: s.scheduled,
  grants: s.grants,
  shipId: s.shipId,
  chargeCap: s.chargeCap,
  sacrificePool: s.sacrificePool,
  bloodReactorUsed: s.bloodReactorUsed,
  burnDoubleUsed: s.burnDoubleUsed,
  dice: s.dice,
  slots: s.slots,
  enemies: s.enemies,
  targetId: s.targetId,
  engineState: s.engineState,
  nextTurnMods: s.nextTurnMods,
  nextRollBonus: s.nextRollBonus,
  pendingDeepScan: s.pendingDeepScan,
  blockedSlots: s.blockedSlots,
  shrunkSlots: s.shrunkSlots,
  lockedDice: s.lockedDice,
  resonance: s.resonance,
  survivedLethal: s.survivedLethal,
  lastPlayerDamage: s.lastPlayerDamage,
  stolenScrap: s.stolenScrap,
  pendingTwist: s.pendingTwist,
  pendingSwap: s.pendingSwap,
  pendingStorm: s.pendingStorm,
  ascension: s.ascension,
  sectorHpPct: s.sectorHpPct,
  enemyHpPct: s.enemyHpPct,
  overflowShieldUsed: s.overflowShieldUsed,
  pierceUsed: s.pierceUsed,
  outcome: s.outcome,
});

const fromSnapshot = (snap: BattleSnapshot): Partial<BattleValues> => ({
  turn: snap.turn,
  hull: snap.hull,
  hullMax: snap.hullMax,
  shield: snap.shield,
  shieldPersist: snap.shieldPersist,
  charge: snap.charge,
  scrap: snap.scrap,
  tide: snap.tide,
  interference: snap.interference,
  perks: snap.perks,
  chartPicks: snap.chartPicks ?? [],
  mutators: snap.mutators ?? [],
  modules: snap.modules ?? [],
  engravings: snap.engravings ?? {},
  flags: snap.flags ?? [],
  counters: snap.counters ?? {},
  runCounters: snap.runCounters ?? {},
  exceedCap: snap.exceedCap ?? [],
  scheduled: snap.scheduled ?? [],
  grants: snap.grants ?? {},
  chargeCap: snap.chargeCap,
  sacrificePool: snap.sacrificePool,
  bloodReactorUsed: snap.bloodReactorUsed,
  burnDoubleUsed: snap.burnDoubleUsed,
  dice: snap.dice,
  slots: snap.slots,
  enemies: snap.enemies,
  targetId: snap.targetId,
  engineState: snap.engineState,
  nextTurnMods: snap.nextTurnMods,
  nextRollBonus: snap.nextRollBonus,
  pendingDeepScan: snap.pendingDeepScan,
  blockedSlots: snap.blockedSlots,
  shrunkSlots: snap.shrunkSlots,
  lockedDice: snap.lockedDice,
  resonance: snap.resonance,
  survivedLethal: snap.survivedLethal,
  lastPlayerDamage: snap.lastPlayerDamage,
  stolenScrap: snap.stolenScrap,
  pendingTwist: snap.pendingTwist,
  pendingSwap: snap.pendingSwap,
  pendingStorm: snap.pendingStorm,
  ascension: snap.ascension,
  sectorHpPct: snap.sectorHpPct,
  enemyHpPct: snap.enemyHpPct,
  overflowShieldUsed: snap.overflowShieldUsed ?? false,
  pierceUsed: snap.pierceUsed ?? false,
  outcome: snap.outcome,
});

const syncSnapshotFlags = (snapshot: BattleSnapshot, ctx: BattleCtx): void => {
  if (ctx.flags.size === (snapshot.flags?.length ?? 0)) return;
  snapshot.flags = [...ctx.flags];
};

const applyDebugRoll = (
  dice: RolledDie[],
  values: number[],
  skipUids: ReadonlySet<string>,
): RolledDie[] =>
  dice.map((die, index) => {
    const forced = values[index];
    if (forced === undefined || die.state !== "tray" || skipUids.has(die.uid)) {
      return die;
    }
    return {
      ...die,
      value: Math.min(Math.max(1, Math.round(forced)), die.tier),
    };
  });

// Prologue overrides (Phase-8 Task 4): a per-turn allow-list of slots, applied at
// the store boundary so the resolver stays a single engine.
export const allowedSlotsForTurn = (
  scriptedSlots: readonly (readonly SlotId[])[] | null,
  turn: number,
): readonly SlotId[] | null => {
  if (scriptedSlots === null) return null;
  return scriptedSlots[turn - 1] ?? null;
};

const slotAllowedThisTurn = (
  s: Pick<BattleValues, "scriptedSlots" | "turn">,
  slotId: SlotId,
): boolean => {
  const allowed = allowedSlotsForTurn(s.scriptedSlots, s.turn);
  return allowed === null || allowed.includes(slotId);
};

interface TurnTally {
  shieldAbsorbed: number;
  repairBayHealed: number;
  spinalMaxHit: number;
  burnKilledElite: boolean;
}

// Contract goals count things no other system tracks (shields absorbed, the
// biggest Spinal hit, a burn tick that finished an elite). The beats already
// carry every number, so the counters read them instead of touching the resolver.
export const tallyBundle = (bundle: ResolutionBundle): TurnTally => {
  let shieldAbsorbed = 0;
  let repairBayHealed = 0;
  let spinalMaxHit = 0;
  let burnKilledElite = false;

  for (const beat of bundle.beats) {
    if (beat.slot === "spinal" && beat.kind === "damage") {
      spinalMaxHit = Math.max(spinalMaxHit, beat.amount);
    }
    if (beat.slot === "repairBay" && beat.kind === "repair") {
      repairBayHealed += beat.amount;
    }
  }
  for (const beat of bundle.enemyBeats) {
    shieldAbsorbed += beat.shieldDamage;
    if (beat.kind !== "burnTick") continue;
    const enemy = beat.after.enemies.find((e) => e.id === beat.enemyId);
    if (enemy === undefined || enemy.hp > 0) continue;
    const def = ENEMY_BY_ID.get(enemy.defId);
    if (def?.elite === true || def?.miniboss === true || def?.boss === true) {
      burnKilledElite = true;
    }
  }
  return { shieldAbsorbed, repairBayHealed, spinalMaxHit, burnKilledElite };
};

export const battleTally = (s: BattleValues): BattleTally => ({
  won: s.outcome === "victory",
  turns: s.turn,
  shieldAbsorbed: s.shieldAbsorbed,
  spinalMaxHit: s.spinalMaxHit,
  rerollsUsed: s.rerollsUsed,
  repairBayHealed: s.repairBayHealed,
  endedFullHull: s.hull >= s.hullMax,
  blackPlaced: s.blackUsed,
  dicePlaced: s.dicePlaced,
  burnKilledElite: s.burnKilledElite,
});

const SET_SCHOOLS: readonly School[] = [
  "red",
  "blue",
  "green",
  "yellow",
  "black",
  "grey",
];

export const grantsOf = (
  snapshot: Pick<BattleSnapshot, "grants">,
): { rerollBase: number; reserveCap: number; freeNudges: number } => ({
  rerollBase: BASE_REROLL_SIZE + (snapshot.grants?.rerollSize ?? 0),
  reserveCap: 1 + (snapshot.grants?.reserve ?? 0),
  freeNudges: snapshot.grants?.nudge ?? 0,
});

export const useBattleStore = create<BattleState>()((set, get) => ({
  ...createInitialBattleValues(),

  startBattle: (encounter, deckDefIds, streams) => {
    const shipId = encounter.shipId ?? "wanderer";
    const enemyStream = createEnemyStream(streams);
    const mkLevels = useRunStore.getState().mkLevels;
    const snapshot = buildBattleSnapshot(
      shipId,
      deckDefIds,
      encounter.enemyIds,
      streams,
      enemyStream,
      mkLevels,
      {
        tide: encounter.tide,
        interference: encounter.interference,
        perks: encounter.perks,
        chartPicks: encounter.chartPicks,
        mutators: encounter.mutators,
        modules: encounter.modules,
        engravings: encounter.engravings,
        flags: encounter.flags,
        runCounters: encounter.runCounters,
        hull: encounter.hull,
        hullMax: encounter.hullMax,
        chargeCap: encounter.chargeCap,
        ascension: encounter.ascension,
        sectorHpPct: encounter.sectorHpPct,
        enemyHpBonusPct: encounter.enemyHpBonusPct,
        eliteShield: encounter.eliteShield,
        resonanceBoost: encounter.resonanceBoost,
        slotTierDelta: encounter.slotTierDelta,
        disabledSlots: encounter.disabledSlots,
      },
    );
    const perks = encounter.perks ?? [];
    const chartPicks = encounter.chartPicks ?? [];
    const modules = encounter.modules ?? [];
    const forcedTraits = encounter.forcedTraits ?? [];
    const mods = computeRunMods(perks, chartPicks, modules);
    const passive = SHIP_BY_ID.get(shipId)?.passive;
    const scrapperScrap = passive?.kind === "scrapper" ? passive.scrap : 0;
    const singleCast =
      runHasTrait(perks, chartPicks, "singleCast", modules) ||
      forcedTraits.includes("singleCast");
    // Resonator pays out once per completed 4-set the deck actually holds.
    const setCharge =
      mods.setCompleteCharge *
      SET_SCHOOLS.filter((school) =>
        resonanceAtLeast(snapshot.resonance, school, 4),
      ).length;
    const introEnemy = snapshot.enemies.find((e) => {
      const def = ENEMY_BY_ID.get(e.defId);
      return def?.boss === true || def?.miniboss === true;
    });
    snapshot.scrap = Math.max(
      0,
      snapshot.scrap + mods.battleStartScrap + scrapperScrap,
    );
    snapshot.charge = Math.max(
      0,
      Math.min(
        snapshot.chargeCap,
        snapshot.charge + (encounter.startCharge ?? 0) + setCharge,
      ),
    );
    const grants = grantsOf(snapshot);
    const rerollBase =
      grants.rerollBase + mods.rerollSizeDelta + (encounter.rerollSizeBonus ?? 0);
    set({
      ...createInitialBattleValues(),
      ...fromSnapshot(snapshot),
      phase: "placement",
      introPending: introEnemy !== undefined,
      introEnemyId: introEnemy?.defId ?? null,
      scriptedSlots:
        encounter.scriptedSlots === undefined
          ? null
          : encounter.scriptedSlots.map((row) => [...row]),
      shipId,
      chartPicks: [...chartPicks],
      mutators: [...(encounter.mutators ?? [])],
      modules: [...modules],
      engravings: encounter.engravings ?? {},
      forcedTraits: [...forcedTraits],
      rerollsLeft: singleCast
        ? 0
        : 1 +
          Math.max(0, mods.extraRerolls) +
          (snapshot.grants?.rerollUses ?? 0),
      rerollSize: rerollBase,
      rerollBase,
      reserveCap: grants.reserveCap + mods.reserveDelta,
      freeNudges: grants.freeNudges,
      streams,
      enemyStream,
    });
  },

  dismissIntro: () => {
    set({ introPending: false });
  },

  placeDie: (uid, slotId) => {
    set((s) => {
      if (s.phase !== "placement" || s.rerollMode) return s;
      if (!slotAllowedThisTurn(s, slotId)) return s;
      if (!canPlaceDie(battleSnapshot(s), uid, slotId)) return s;
      const slot = s.slots[slotId];
      if (slot === undefined) return s;
      const die = s.dice.find((d) => d.uid === uid);
      if (die !== undefined) {
        recordAction(`place:${die.defId}:${String(die.value)}:${slotId}`);
      }
      const snapshot = battleSnapshot(s);
      snapshot.dice = s.dice.map((d) =>
        d.uid === uid ? { ...d, state: "placed" as const, slot: slotId } : d,
      );
      snapshot.slots = { ...s.slots, [slotId]: { ...slot, dieUid: uid } };
      snapshot.enemies = structuredClone(s.enemies);
      const placed = snapshot.dice.find((d) => d.uid === uid);
      const ctx = new BattleCtx(snapshot, snapshot.flags);
      ctx.payload = {
        slot: slotId,
        ...(placed === undefined ? {} : { die: placed }),
      };
      emit(buildSources(snapshot), "place", ctx);
      syncSnapshotFlags(snapshot, ctx);
      return { ...fromSnapshot(snapshot), selectedDieUid: null };
    });
  },

  unplaceDie: (uid) => {
    set((s) => {
      if (s.phase !== "placement") return s;
      const die = s.dice.find((d) => d.uid === uid);
      if (die?.state !== "placed" || die.slot === undefined) return s;
      const slot = s.slots[die.slot];
      if (slot === undefined) return s;
      return {
        dice: s.dice.map((d) =>
          d.uid === uid ? { ...d, state: "tray" as const, slot: undefined } : d,
        ),
        slots: { ...s.slots, [die.slot]: { ...slot, dieUid: undefined } },
      };
    });
  },

  reserveDie: (uid) => {
    set((s) => {
      if (s.phase !== "placement" || s.rerollMode) return s;
      const die = s.dice.find((d) => d.uid === uid);
      if (die?.state !== "tray") return s;
      const reserved = s.dice.filter((d) => d.state === "reserved").length;
      const blueExtra =
        die.school === "blue" || die.school === "prismatic"
          ? computeRunMods(s.perks, s.chartPicks, s.modules).blueReserveDelta
          : 0;
      if (reserved >= s.reserveCap + blueExtra) return s;
      return {
        dice: s.dice.map((d) =>
          d.uid === uid
            ? { ...d, state: "reserved" as const, slot: undefined }
            : d,
        ),
        selectedDieUid: null,
      };
    });
  },

  unreserveDie: (uid) => {
    set((s) => {
      if (s.phase !== "placement") return s;
      const die = s.dice.find((d) => d.uid === uid);
      if (die?.state !== "reserved") return s;
      return {
        dice: s.dice.map((d) =>
          d.uid === uid ? { ...d, state: "tray" as const } : d,
        ),
      };
    });
  },

  selectDie: (uid) => {
    set((s) => {
      if (s.phase !== "placement" || s.rerollMode) return s;
      if (uid === null) return { selectedDieUid: null, swapSourceUid: null };
      const die = s.dice.find((d) => d.uid === uid);
      if (die === undefined) return s;
      if (die.state !== "tray" && die.state !== "placed") return s;
      const source =
        s.swapSourceUid === null
          ? undefined
          : s.dice.find((d) => d.uid === s.swapSourceUid);
      if (source === undefined || !isSwapTarget(source, die)) {
        return { selectedDieUid: uid };
      }
      return {
        selectedDieUid: uid,
        swapSourceUid: null,
        dice: s.dice.map((d) =>
          d.uid === source.uid
            ? { ...d, value: die.value, activeUsed: true }
            : d.uid === die.uid
              ? { ...d, value: source.value }
              : d,
        ),
      };
    });
  },

  beginSwap: (uid) => {
    set((s) => {
      if (s.phase !== "placement" || s.rerollMode) return s;
      const die = s.dice.find((d) => d.uid === uid);
      if (die === undefined || !canSwap(die)) return s;
      return { swapSourceUid: uid };
    });
  },

  cancelSwap: () => {
    set({ swapSourceUid: null });
  },

  bankDie: (uid) => {
    set((s) => {
      if (s.phase !== "placement" || s.rerollMode) return s;
      const die = s.dice.find((d) => d.uid === uid);
      if (die === undefined || !canBank(die)) return s;
      return {
        dice: s.dice.map((d) =>
          d.uid === uid ? { ...d, bankedValue: d.value, activeUsed: true } : d,
        ),
      };
    });
  },

  splitDie: (uid) => {
    set((s) => {
      if (s.phase !== "placement" || s.rerollMode) return s;
      if (s.streams === null) return s;
      const die = s.dice.find((d) => d.uid === uid);
      if (die === undefined || !canSplit(die)) return s;
      const spawned: RolledDie[] = [];
      for (let i = 0; i < SPLIT_DIE_COUNT; i += 1) {
        const def = DIE_BY_ID.get(SPLIT_DIE_DEF);
        if (def === undefined) break;
        spawned.push({
          uid: `${uid}-split${String(i)}`,
          defId: SPLIT_DIE_DEF,
          tier: def.tier,
          school: def.school,
          value: rollBaseValue(SPLIT_DIE_DEF, def.tier, s.streams.dice),
          state: "tray",
          temp: true,
        });
      }
      if (spawned.length === 0) return s;
      return {
        selectedDieUid: null,
        dice: [
          ...s.dice.map((d) =>
            d.uid === uid
              ? { ...d, state: "burned" as const, slot: undefined, activeUsed: true }
              : d,
          ),
          ...spawned,
        ],
      };
    });
  },

  setTarget: (targetId) => {
    set((s) => {
      if (s.phase !== "placement") return s;
      const alive =
        s.enemies.some((e) => e.id === targetId && e.hp > 0) ||
        s.enemies.some(
          (e) =>
            e.hp > 0 && e.subsystems.some((x) => x.id === targetId && x.hp > 0),
        );
      if (!alive) return s;
      return { targetId };
    });
  },

  spendNudge: (uid, dir) => {
    set((s) => {
      if (s.phase !== "placement") return s;
      const die = s.dice.find((d) => d.uid === uid);
      if (die === undefined) return s;
      if (die.state !== "tray" && die.state !== "placed") return s;
      const value = Math.min(die.tier, Math.max(1, die.value + dir));
      if (value === die.value) return s;
      // The spring engraving spends its own once-per-battle nudge first.
      const springFree =
        dieHasGrant(s.engravings, die.defId, "freeNudge") &&
        !s.spentGrants.includes(`nudge:${uid}`);
      const useFree = !springFree && s.freeNudges > 0;
      const cost = Math.max(
        0,
        NUDGE_COST +
          computeRunMods(s.perks, s.chartPicks, s.modules).nudgeCostDelta +
          computeMutatorMods(s.mutators).nudgeCostDelta,
      );
      if (!springFree && !useFree && s.charge < cost) return s;
      return {
        charge: springFree || useFree ? s.charge : s.charge - cost,
        freeNudges: useFree ? s.freeNudges - 1 : s.freeNudges,
        spentGrants: springFree
          ? [...s.spentGrants, `nudge:${uid}`]
          : s.spentGrants,
        dice: s.dice.map((d) => (d.uid === uid ? { ...d, value } : d)),
      };
    });
  },

  spendBonusReroll: () => {
    set((s) => {
      if (
        s.phase !== "placement" ||
        s.rerollsLeft <= 0 ||
        s.charge < BONUS_REROLL_COST
      ) {
        return s;
      }
      return {
        charge: s.charge - BONUS_REROLL_COST,
        rerollSize: s.rerollSize + 1,
      };
    });
  },

  spendSurge: () => {
    set((s) => {
      if (s.phase !== "placement" || s.charge < SURGE_COST) return s;
      return { charge: s.charge - SURGE_COST, nextRollBonus: 1 };
    });
  },

  bloodReactor: () => {
    set((s) => {
      if (s.phase !== "placement" || s.rerollMode) return s;
      if (!runHasTrait(s.perks, s.chartPicks, "bloodReactor", s.modules))
        return s;
      if (s.bloodReactorUsed || s.hull <= BLOOD_REACTOR_HULL) return s;
      return {
        hull: s.hull - BLOOD_REACTOR_HULL,
        charge: Math.min(s.chargeCap, s.charge + BLOOD_REACTOR_CHARGE),
        bloodReactorUsed: true,
      };
    });
  },

  sacrificeDie: (uid) => {
    set((s) => {
      if (s.phase !== "placement" || s.rerollMode) return s;
      if (!runHasTrait(s.perks, s.chartPicks, "sacrifice", s.modules)) return s;
      const die = s.dice.find((d) => d.uid === uid);
      if (die?.state !== "tray") return s;
      return {
        dice: s.dice.map((d) =>
          d.uid === uid
            ? { ...d, state: "burned" as const, slot: undefined }
            : d,
        ),
        sacrificePool: s.sacrificePool + SACRIFICE_DAMAGE,
        selectedDieUid: null,
      };
    });
  },

  flipDie: (uid) => {
    set((s) => {
      if (s.phase !== "placement" || s.rerollMode) return s;
      const die = s.dice.find((d) => d.uid === uid);
      if (die === undefined || !canFlip(die)) return s;
      if (die.state !== "tray" && die.state !== "placed") return s;
      const value = flippedValue(die);
      return {
        dice: s.dice.map((d) =>
          d.uid === uid ? { ...d, value, activeUsed: true } : d,
        ),
      };
    });
  },

  copyDie: (uid) => {
    set((s) => {
      if (s.phase !== "placement" || s.rerollMode) return s;
      const die = s.dice.find((d) => d.uid === uid);
      if (die?.state !== "tray" || !canCopy(die, s.resonance)) return s;
      const value = adjacentCopyValue(s.dice, uid);
      if (value === undefined) return s;
      return {
        dice: s.dice.map((d) =>
          d.uid === uid ? { ...d, value, activeUsed: true } : d,
        ),
      };
    });
  },

  // DESIGN section 7: the Fate die is never slotted. One button, one roll per
  // battle, resolved through the ordinary Action vocabulary.
  rollFate: () => {
    const s = get();
    if (s.phase !== "placement" || s.rerollMode) return;
    if (s.streams === null) return;
    const maxUses = runHasTrait(s.perks, s.chartPicks, "fateTwice", s.modules)
      ? 2
      : 1;
    if (s.fateUses >= maxUses) return;
    if (!s.dice.some((d) => d.defId === FATE_DIE_ID)) return;
    const roll = s.streams.fate.int(1, 100);
    const outcome: FateOutcome = fateOutcomeFor(roll);
    const snapshot = battleSnapshot(s);
    snapshot.enemies = structuredClone(s.enemies);
    snapshot.blockedSlots = [...s.blockedSlots];
    const ctx = new BattleCtx(snapshot, snapshot.flags);
    applyActions(outcome.do, ctx);
    syncSnapshotFlags(snapshot, ctx);
    snapshot.charge = Math.max(0, Math.min(snapshot.chargeCap, snapshot.charge));
    snapshot.scrap = Math.max(0, snapshot.scrap);
    set({
      ...fromSnapshot(snapshot),
      fateUses: s.fateUses + 1,
      fateRoll: roll,
      fateOutcomeId: outcome.id,
    });
    recordAction(`fate:${String(roll)}`);
  },

  clearFateResult: () => {
    set({ fateRoll: null, fateOutcomeId: null });
  },

  toggleRerollMode: () => {
    set((s) => {
      if (s.phase !== "placement") return s;
      if (s.rerollMode) return { rerollMode: false, rerollSelection: [] };
      if (s.rerollsLeft <= 0) return s;
      return { rerollMode: true, rerollSelection: [], selectedDieUid: null };
    });
  },

  toggleRerollDie: (uid) => {
    set((s) => {
      if (s.phase !== "placement" || !s.rerollMode) return s;
      const die = s.dice.find((d) => d.uid === uid);
      if (die?.state !== "tray") return s;
      if (s.rerollSelection.includes(uid)) {
        return { rerollSelection: s.rerollSelection.filter((u) => u !== uid) };
      }
      if (s.rerollSelection.length >= s.rerollSize) return s;
      return { rerollSelection: [...s.rerollSelection, uid] };
    });
  },

  confirmReroll: () => {
    set((s) => {
      if (
        s.phase !== "placement" ||
        !s.rerollMode ||
        s.rerollsLeft <= 0 ||
        s.rerollSelection.length === 0 ||
        s.rerollSelection.length > s.rerollSize ||
        s.streams === null
      ) {
        return { rerollMode: false, rerollSelection: [] };
      }
      const streams = s.streams;
      const blueFloor = resonanceAtLeast(s.resonance, "blue", 2);
      // The edge engraving: a reroll made only of engraved dice is free.
      const free = s.rerollSelection.every((uid) => {
        const die = s.dice.find((d) => d.uid === uid);
        return (
          die !== undefined && dieHasGrant(s.engravings, die.defId, "freeReroll")
        );
      });
      return {
        dice: s.dice.map((d) => {
          if (!s.rerollSelection.includes(d.uid) || d.state !== "tray")
            return d;
          let value = streams.dice.int(1, d.tier) + (d.growth ?? 0);
          if (blueFloor && d.school === "blue") value = Math.max(value, 2);
          return { ...d, value };
        }),
        rerollsLeft: free ? s.rerollsLeft : s.rerollsLeft - 1,
        rerollsUsed: s.rerollsUsed + 1,
        rerollMode: false,
        rerollSelection: [],
      };
    });
  },

  endTurn: () => {
    const s = get();
    if (s.phase !== "placement" || s.streams === null || s.enemyStream === null)
      return;
    const placed = s.dice.filter((d) => d.state === "placed");
    const blackUsed =
      s.blackUsed + placed.filter((d) => d.school === "black").length;
    const blueUsed =
      s.blueUsed + placed.filter((d) => d.school === "blue").length;
    const player = resolvePlayerPhase(battleSnapshot(s));
    let bundle: ResolutionBundle;
    if (player.next.outcome !== undefined) {
      bundle = {
        beats: player.beats,
        enemyBeats: [],
        final: player.next,
        finalPhase: "ended",
      };
    } else {
      const enemy = resolveEnemyPhase(player.next, s.enemyStream);
      if (enemy.next.outcome !== undefined) {
        bundle = {
          beats: player.beats,
          enemyBeats: enemy.beats,
          final: enemy.next,
          finalPhase: "ended",
        };
      } else {
        let final = advanceTurn(enemy.next, s.streams);
        if (s.debugNextRoll !== null) {
          const carried = new Set(
            enemy.next.dice
              .filter((d) => d.state === "reserved" || d.state === "locked")
              .map((d) => d.uid),
          );
          final = {
            ...final,
            dice: applyDebugRoll(final.dice, s.debugNextRoll, carried),
          };
        }
        bundle = {
          beats: player.beats,
          enemyBeats: enemy.beats,
          final,
          finalPhase: "placement",
        };
      }
    }
    const tally = tallyBundle(bundle);
    set({
      phase: "resolving",
      resolution: bundle,
      beats: bundle.beats,
      enemyBeats: bundle.enemyBeats,
      beatSeq: s.beatSeq + 1,
      blackUsed,
      blueUsed,
      dicePlaced: s.dicePlaced + placed.length,
      shieldAbsorbed: s.shieldAbsorbed + tally.shieldAbsorbed,
      repairBayHealed: s.repairBayHealed + tally.repairBayHealed,
      spinalMaxHit: Math.max(s.spinalMaxHit, tally.spinalMaxHit),
      burnKilledElite: s.burnKilledElite || tally.burnKilledElite,
      rerollMode: false,
      rerollSelection: [],
      selectedDieUid: null,
      debugNextRoll: null,
    });
  },

  applyBeatSnapshot: (after) => {
    set((s) => {
      if (s.phase !== "resolving") return s;
      return fromSnapshot(after);
    });
  },

  finishResolution: () => {
    const s = get();
    if (s.phase !== "resolving" || s.resolution === null) return;
    const { final, finalPhase } = s.resolution;
    if (final.pendingDeepScan) {
      useRunStore.setState({ pendingDeepScan: true });
    }
    const run = useRunStore.getState();
    for (const key of final.flags ?? []) {
      if (run.flags[key] === undefined) run.setFlag(key);
    }
    for (const [key, value] of Object.entries(final.runCounters ?? {})) {
      const delta = value - (run.counters[key] ?? 0);
      if (delta !== 0) run.bumpCounter(key, delta);
    }
    const canReroll =
      finalPhase === "placement" &&
      !runHasTrait(s.perks, s.chartPicks, "singleCast", s.modules) &&
      !s.forcedTraits.includes("singleCast");
    const extra = Math.max(
      0,
      computeRunMods(s.perks, s.chartPicks, s.modules).extraRerolls,
    );
    set({
      ...fromSnapshot(final),
      pendingDeepScan: false,
      phase: finalPhase,
      resolution: null,
      rerollsLeft: canReroll ? 1 + extra + (final.grants?.rerollUses ?? 0) : 0,
      rerollSize: s.rerollBase,
    });
  },

  reset: () => {
    set(createInitialBattleValues());
  },
}));

export type BattleSaveValues = Omit<
  BattleValues,
  "streams" | "enemyStream" | "debugNextRoll"
>;

export interface BattleSaveState {
  values: BattleSaveValues;
  streamStates: StreamStates;
  enemyStreamState: number;
}

const pickBattleValues = (s: BattleState): BattleSaveValues => ({
  phase: s.phase,
  shipId: s.shipId,
  turn: s.turn,
  hull: s.hull,
  hullMax: s.hullMax,
  shield: s.shield,
  shieldPersist: s.shieldPersist,
  charge: s.charge,
  scrap: s.scrap,
  tide: s.tide,
  interference: s.interference,
  perks: s.perks,
  chartPicks: s.chartPicks,
  mutators: s.mutators,
  modules: s.modules,
  engravings: s.engravings,
  flags: s.flags,
  counters: s.counters,
  runCounters: s.runCounters,
  exceedCap: s.exceedCap,
  scheduled: s.scheduled,
  grants: s.grants,
  forcedTraits: s.forcedTraits,
  chargeCap: s.chargeCap,
  sacrificePool: s.sacrificePool,
  bloodReactorUsed: s.bloodReactorUsed,
  burnDoubleUsed: s.burnDoubleUsed,
  dice: s.dice,
  slots: s.slots,
  rerollsLeft: s.rerollsLeft,
  rerollSize: s.rerollSize,
  rerollBase: s.rerollBase,
  rerollMode: s.rerollMode,
  rerollSelection: s.rerollSelection,
  reserveCap: s.reserveCap,
  freeNudges: s.freeNudges,
  selectedDieUid: s.selectedDieUid,
  enemies: s.enemies,
  targetId: s.targetId,
  engineState: s.engineState,
  nextTurnMods: s.nextTurnMods,
  nextRollBonus: s.nextRollBonus,
  pendingDeepScan: s.pendingDeepScan,
  blockedSlots: s.blockedSlots,
  shrunkSlots: s.shrunkSlots,
  lockedDice: s.lockedDice,
  resonance: s.resonance,
  survivedLethal: s.survivedLethal,
  lastPlayerDamage: s.lastPlayerDamage,
  stolenScrap: s.stolenScrap,
  pendingTwist: s.pendingTwist,
  pendingSwap: s.pendingSwap,
  pendingStorm: s.pendingStorm,
  swapSourceUid: s.swapSourceUid,
  ascension: s.ascension,
  sectorHpPct: s.sectorHpPct,
  enemyHpPct: s.enemyHpPct,
  overflowShieldUsed: s.overflowShieldUsed,
  pierceUsed: s.pierceUsed,
  fateUses: s.fateUses,
  fateRoll: s.fateRoll,
  fateOutcomeId: s.fateOutcomeId,
  spentGrants: s.spentGrants,
  introPending: s.introPending,
  introEnemyId: s.introEnemyId,
  scriptedSlots: s.scriptedSlots,
  outcome: s.outcome,
  resolution: s.resolution,
  beats: s.beats,
  enemyBeats: s.enemyBeats,
  beatSeq: s.beatSeq,
  blackUsed: s.blackUsed,
  blueUsed: s.blueUsed,
  shieldAbsorbed: s.shieldAbsorbed,
  spinalMaxHit: s.spinalMaxHit,
  rerollsUsed: s.rerollsUsed,
  repairBayHealed: s.repairBayHealed,
  dicePlaced: s.dicePlaced,
  burnKilledElite: s.burnKilledElite,
});

export const serializeBattle = (): BattleSaveState | null => {
  const s = useBattleStore.getState();
  if (s.phase === "idle" || s.streams === null || s.enemyStream === null) {
    return null;
  }
  return {
    values: pickBattleValues(s),
    streamStates: serializeStreams(s.streams),
    enemyStreamState: s.enemyStream.state(),
  };
};

export const hydrateBattle = (save: BattleSaveState): void => {
  useBattleStore.setState({
    ...createInitialBattleValues(),
    ...save.values,
    streams: restoreStreams(save.streamStates),
    enemyStream: createStreamFromState(save.enemyStreamState),
    debugNextRoll: null,
  });
  if (save.values.phase === "resolving") {
    useBattleStore.getState().finishResolution();
  }
};

declare global {
  interface Window {
    __battle?: typeof useBattleStore;
  }
}

if (import.meta.env.DEV && typeof window !== "undefined") {
  window.__battle = useBattleStore;
}
