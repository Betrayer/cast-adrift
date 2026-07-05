import { create } from "zustand";
import {
  advanceTurn,
  resolveEnemyPhase,
  resolvePlayerPhase,
} from "@/game/battle/resolver";
import {
  buildEnemies,
  buildWandererSlots,
  rollDeck,
  WANDERER_HULL_MAX,
} from "@/game/battle/setup";
import type { RngStreams } from "@/services/rng";
import type {
  BattleOutcome,
  BattlePhase,
  BattleSnapshot,
  Beat,
  EnemyBeat,
  EnemyState,
  RolledDie,
  SlotId,
  SlotState,
} from "@/types/battle";

export interface BattleEncounter {
  enemyIds: string[];
}

export interface BattleValues {
  phase: BattlePhase;
  turn: number;
  hull: number;
  hullMax: number;
  shield: number;
  charge: number;
  dice: RolledDie[];
  slots: Partial<Record<SlotId, SlotState>>;
  rerollsLeft: number;
  enemies: EnemyState[];
  targetId: string | null;
  outcome?: BattleOutcome;
  beats: Beat[];
  enemyBeats: EnemyBeat[];
  beatSeq: number;
  streams: RngStreams | null;
  debugNextRoll: number[] | null;
}

export interface BattleState extends BattleValues {
  startBattle: (
    encounter: BattleEncounter,
    deckDefIds: readonly string[],
    streams: RngStreams,
  ) => void;
  placeDie: (uid: string, slotId: SlotId) => void;
  unplaceDie: (uid: string) => void;
  endTurn: () => void;
  reset: () => void;
}

export const createInitialBattleValues = (): BattleValues => ({
  phase: "idle",
  turn: 0,
  hull: 0,
  hullMax: 0,
  shield: 0,
  charge: 0,
  dice: [],
  slots: {},
  rerollsLeft: 0,
  enemies: [],
  targetId: null,
  outcome: undefined,
  beats: [],
  enemyBeats: [],
  beatSeq: 0,
  streams: null,
  debugNextRoll: null,
});

const toSnapshot = (s: BattleState): BattleSnapshot => ({
  turn: s.turn,
  hull: s.hull,
  hullMax: s.hullMax,
  shield: s.shield,
  charge: s.charge,
  dice: s.dice,
  slots: s.slots,
  enemies: s.enemies,
  targetId: s.targetId,
  outcome: s.outcome,
});

const applyDebugRoll = (dice: RolledDie[], values: number[]): RolledDie[] =>
  dice.map((die, index) => {
    const forced = values[index];
    if (forced === undefined) return die;
    return {
      ...die,
      value: Math.min(Math.max(1, Math.round(forced)), die.tier),
    };
  });

export const useBattleStore = create<BattleState>()((set, get) => ({
  ...createInitialBattleValues(),

  startBattle: (encounter, deckDefIds, streams) => {
    const enemies = buildEnemies(encounter.enemyIds);
    set({
      ...createInitialBattleValues(),
      phase: "placement",
      turn: 1,
      hull: WANDERER_HULL_MAX,
      hullMax: WANDERER_HULL_MAX,
      dice: rollDeck(deckDefIds, streams),
      slots: buildWandererSlots(),
      enemies,
      targetId: enemies[0]?.id ?? null,
      streams,
    });
  },

  placeDie: (uid, slotId) => {
    set((s) => {
      if (s.phase !== "placement") return s;
      const die = s.dice.find((d) => d.uid === uid);
      const slot = s.slots[slotId];
      if (die === undefined || slot === undefined) return s;
      if (
        die.state !== "tray" ||
        slot.dieUid !== undefined ||
        die.tier > slot.cap
      ) {
        return s;
      }
      return {
        dice: s.dice.map((d) =>
          d.uid === uid ? { ...d, state: "placed" as const, slot: slotId } : d,
        ),
        slots: { ...s.slots, [slotId]: { ...slot, dieUid: uid } },
      };
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

  endTurn: () => {
    const s = get();
    if (s.phase !== "placement" || s.streams === null) return;
    const player = resolvePlayerPhase(toSnapshot(s));
    if (player.next.outcome === "victory") {
      set({
        ...player.next,
        phase: "ended",
        beats: player.beats,
        enemyBeats: [],
        beatSeq: s.beatSeq + 1,
      });
      return;
    }
    const enemy = resolveEnemyPhase(player.next);
    if (enemy.next.outcome === "defeat") {
      set({
        ...enemy.next,
        phase: "ended",
        beats: player.beats,
        enemyBeats: enemy.beats,
        beatSeq: s.beatSeq + 1,
      });
      return;
    }
    let next = advanceTurn(enemy.next, s.streams);
    if (s.debugNextRoll !== null) {
      next = { ...next, dice: applyDebugRoll(next.dice, s.debugNextRoll) };
    }
    set({
      ...next,
      phase: "placement",
      beats: player.beats,
      enemyBeats: enemy.beats,
      beatSeq: s.beatSeq + 1,
      debugNextRoll: null,
    });
  },

  reset: () => {
    set(createInitialBattleValues());
  },
}));

declare global {
  interface Window {
    __battle?: typeof useBattleStore;
  }
}

if (import.meta.env.DEV && typeof window !== "undefined") {
  window.__battle = useBattleStore;
}
