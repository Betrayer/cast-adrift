import {
  dieTier,
  facesIfForged,
  forgeLevel,
  handDie,
  type DeckEntry,
} from "@/game/dice/tier";
import {
  assignSeats,
  drawFromBag,
  drawStream,
  isTableExtra,
  tableDice,
} from "@/game/battle/table";
import { TABLE_SIZE } from "@/game/economy/prices";
import { DIE_BY_ID, rollBaseValue } from "@/data/dice";
import type { EngravingMap } from "@/data/engravings";
import { DIRECT, fireModesForSlot } from "@/data/fireModes";
import { SHIP_BY_ID, type ShipId } from "@/data/ships";
import { slotCapForMk, type MkLevel } from "@/data/slots";
import { shrinkTier } from "@/game/battle/placement";
import { buildEnemies } from "@/game/battle/spawn";
import {
  BattleCtx,
  buildSources,
  dieFaceMax,
  dieFaceMin,
  emit,
} from "@/game/effects";
import { loadoutResonance } from "@/game/effects/census";
import { reaimOffLockedCore } from "@/game/battle/damage";
import { applyRollFloors, applySpareLowest } from "@/game/battle/rollFloors";
import { BASE_CHARGE_CAP } from "@/game/run/perkMods";
import { runHasTrait } from "@/game/run/runMods";
import { createStream, type RngStream, type RngStreams } from "@/services/rng";
import type {
  BattleSnapshot,
  RolledDie,
  SlotId,
  SlotState,
} from "@/types/battle";
import type { School } from "@/types/content";

export {
  buildEnemies,
  drawIntent,
  everyTurnFor,
  MAX_ENEMIES,
  NEUTRAL_STEP_CONTEXT,
  patternFor,
  phaseFloor,
  phaseIndexForHp,
  spawnEnemy,
  stepCondHolds,
  stepContextFor,
} from "@/game/battle/spawn";
export type { SpawnInit } from "@/game/battle/spawn";
export {
  canPlaceDie,
  dieFitsSlot,
  effectiveCap,
  exceedCapGrantFor,
  isDieLocked,
  isSlotBlocked,
  isSlotShrunk,
} from "@/game/battle/placement";

export const applyObsidianPact = (
  dice: RolledDie[],
  perks: readonly string[],
  chartPicks: readonly string[],
  modules: readonly string[] = [],
): void => {
  if (!runHasTrait(perks, chartPicks, "obsidianPact", modules)) return;
  for (const die of dice) {
    if (die.school !== "black" && die.school !== "prismatic") continue;
    if (die.state !== "tray") continue;
    const min = dieFaceMin(die);
    const max = dieFaceMax(die);
    die.value = die.value >= (min + max) / 2 ? max : min;
  }
};

export interface ResonanceBoost {
  school: School;
  n: number;
}

export interface BattleInit {
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
  runScrap?: number;
  chargeCap?: number;
  ascension?: number;
  sectorHpPct?: number;
  sectorDmgPct?: number;
  enemyHpBonusPct?: number;
  eliteShield?: number;
  resonanceBoost?: ResonanceBoost;
  slotTierDelta?: Partial<Record<SlotId, number>>;
  disabledSlots?: readonly SlotId[];
  inverted?: boolean;
  nodeStorm?: boolean;
}

export type MkLevels = Partial<Record<SlotId, MkLevel>>;

export const createEnemyStream = (streams: RngStreams): RngStream =>
  createStream(Math.floor(streams.dice.next() * 4294967296) >>> 0);

export const buildShipSlots = (
  shipId: ShipId,
  mkLevels: MkLevels = {},
): Partial<Record<SlotId, SlotState>> => {
  const ship = SHIP_BY_ID.get(shipId);
  if (ship === undefined)
    throw new Error(`buildShipSlots: unknown ship "${shipId}"`);
  const slots: Partial<Record<SlotId, SlotState>> = {};
  for (const [slotId, def] of Object.entries(ship.slots) as [
    SlotId,
    Omit<SlotState, "dieUid">,
  ][]) {
    const mk = mkLevels[slotId] ?? def.mk;
    slots[slotId] = { ...def, mk, cap: slotCapForMk(slotId, mk) };
  }
  return slots;
};

export const applyFireModes = (
  slots: Partial<Record<SlotId, SlotState>>,
  modules: readonly string[] = [],
): Partial<Record<SlotId, SlotState>> => {
  const out: Partial<Record<SlotId, SlotState>> = {};
  for (const [key, slot] of Object.entries(slots) as [SlotId, SlotState][]) {
    const modes = fireModesForSlot(key, slot.mk, modules);
    out[key] =
      modes.length > 1 ? { ...slot, modes, mode: DIRECT.id } : { ...slot };
  }
  return out;
};

export const applySlotOverrides = (
  slots: Partial<Record<SlotId, SlotState>>,
  tierDelta: Partial<Record<SlotId, number>> = {},
  disabled: readonly SlotId[] = [],
): Partial<Record<SlotId, SlotState>> => {
  const out: Partial<Record<SlotId, SlotState>> = {};
  for (const [key, slot] of Object.entries(slots) as [SlotId, SlotState][]) {
    if (disabled.includes(key)) continue;
    let cap = slot.cap;
    const steps = tierDelta[key] ?? 0;
    for (let i = 0; i < -steps; i += 1) cap = shrinkTier(cap);
    out[key] = { ...slot, cap };
  }
  return out;
};

export const shipHullMax = (shipId: ShipId): number => {
  const ship = SHIP_BY_ID.get(shipId);
  if (ship === undefined)
    throw new Error(`shipHullMax: unknown ship "${shipId}"`);
  return ship.hullMax;
};

export const dealHand = (
  hand: readonly DeckEntry[],
  streams: RngStreams,
): RolledDie[] => {
  const created = hand.map((entry, index): RolledDie => {
    const die = handDie(entry);
    const def = DIE_BY_ID.get(die.defId);
    if (def === undefined)
      throw new Error(`dealHand: unknown die def "${die.defId}"`);
    const level = forgeLevel(die);
    const faces = facesIfForged(die);
    const dealt: RolledDie = {
      uid: `die-${String(index)}`,
      defId: die.defId,
      tier: dieTier(die),
      school: def.school,
      value: 0,
      state: "bag",
      ...(level > 0 ? { fusion: level } : {}),
      ...(faces === undefined ? {} : { faces }),
    };
    return isTableExtra(dealt) ? { ...dealt, state: "tray" } : dealt;
  });
  const { dice } = drawFromBag(created, TABLE_SIZE, () =>
    drawStream(streams.dice, 0),
  );
  return assignSeats(
    dice.map((die) =>
      die.state === "tray"
        ? {
            ...die,
            value: rollBaseValue(die.defId, die.tier, streams.dice, die.faces),
          }
        : die,
    ),
  );
};

export const battleSnapshotDefaults = () =>
  ({
    turn: 1,
    shield: 0,
    shieldPersist: 0,
    charge: 0,
    scrap: 0,
    runScrap: 0,
    tide: 0,
    interference: 0,
    perks: [],
    exceedCap: [],
    evasion: null,
    nextTurnMods: {},
    nextRollBonus: 0,
    sacrificePool: 0,
    bloodReactorUsed: false,
    burnDoubleUsed: false,
    blockedSlots: [],
    shrunkSlots: [],
    lockedDice: [],
    survivedLethal: false,
    lastPlayerDamage: 0,
    stolenScrap: 0,
    pendingTwist: 0,
    pendingSwap: 0,
    pendingStorm: 0,
    ascension: 0,
    sectorHpPct: 0,
    sectorDmgPct: 0,
    enemyHpPct: 0,
  }) satisfies Partial<BattleSnapshot>;

export const buildBattleSnapshot = (
  shipId: ShipId,
  hand: readonly DeckEntry[],
  enemyIds: readonly string[],
  streams: RngStreams,
  enemyStream: RngStream,
  mkLevels: MkLevels = {},
  init: BattleInit = {},
): BattleSnapshot => {
  const tide = init.tide ?? 0;
  const ascension = init.ascension ?? 0;
  const enemies = buildEnemies(enemyIds, enemyStream, {
    tide,
    sectorHpPct: init.sectorHpPct ?? 0,
    hpBonusPct: init.enemyHpBonusPct ?? 0,
    eliteShield: init.eliteShield ?? 0,
    ascension,
  });
  const dice = dealHand(hand, streams);
  const onTable = tableDice(dice);
  const hullMax = init.hullMax ?? shipHullMax(shipId);
  const resonance = loadoutResonance(dice, {
    shipId,
    perks: init.perks ?? [],
    chartPicks: init.chartPicks ?? [],
    modules: init.modules ?? [],
  });
  if (init.resonanceBoost !== undefined) {
    resonance.counts[init.resonanceBoost.school] += init.resonanceBoost.n;
  }
  const snapshot: BattleSnapshot = {
    ...battleSnapshotDefaults(),
    hull: Math.max(1, Math.min(hullMax, init.hull ?? hullMax)),
    hullMax,
    runScrap: Math.max(0, init.runScrap ?? 0),
    tide,
    interference: Math.max(0, init.interference ?? 0),
    perks: [...(init.perks ?? [])],
    chartPicks: [...(init.chartPicks ?? [])],
    mutators: [...(init.mutators ?? [])],
    modules: [...(init.modules ?? [])],
    engravings: init.engravings ?? {},
    flags: [...(init.flags ?? [])],
    counters: {},
    runCounters: { ...(init.runCounters ?? {}) },
    shipId,
    dice,
    slots: applyFireModes(
      applySlotOverrides(
        buildShipSlots(shipId, mkLevels),
        init.slotTierDelta,
        init.disabledSlots,
      ),
      init.modules ?? [],
    ),
    enemies,
    targetId: enemies[0]?.id ?? null,
    chargeCap: init.chargeCap ?? BASE_CHARGE_CAP,
    cursedDice: [],
    pendingHijack: 0,
    resonance,
    ascension,
    sectorHpPct: init.sectorHpPct ?? 0,
    sectorDmgPct: init.sectorDmgPct ?? 0,
    enemyHpPct: init.enemyHpBonusPct ?? 0,
    inverted: init.inverted === true,
    nodeStorm: init.nodeStorm === true,
    foldedTurns: 0,
  };
  const perks = init.perks ?? [];
  const modules = init.modules ?? [];
  applyRollFloors(
    onTable,
    snapshot.resonance,
    runHasTrait(perks, init.chartPicks ?? [], "stabilizer", modules),
  );
  if (runHasTrait(perks, init.chartPicks ?? [], "spareLowest", modules)) {
    applySpareLowest(onTable);
  }
  applyObsidianPact(onTable, perks, init.chartPicks ?? [], modules);
  const ctx = new BattleCtx(snapshot, snapshot.flags);
  emit(buildSources(snapshot), "battleStart", ctx);
  snapshot.flags = [...ctx.flags];
  reaimOffLockedCore(snapshot);
  return snapshot;
};
