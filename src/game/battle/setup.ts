import { A6_ELITE_SUBSYSTEM, ascensionMods } from "@/data/ascension";
import { DIE_BY_ID, rollBaseValue } from "@/data/dice";
import { dieHasGrant, type EngravingMap } from "@/data/engravings";
import { ENEMY_BY_ID, expandEncounterIds } from "@/data/enemies";
import { SHIP_BY_ID, type ShipId } from "@/data/ships";
import { slotCapForMk, type MkLevel } from "@/data/slots";
import { overCapAllowed, shipProfile } from "@/game/battle/passives";
import { computeCensus } from "@/game/battle/resonance";
import { BattleCtx, buildSources, emit } from "@/game/effects";
import { slotMatches } from "@/game/effects/evaluate";
import type { ExceedCapGrant } from "@/game/effects/types";
import { applyRollFloors, applySpareLowest } from "@/game/battle/rollFloors";
import { scaleEnemyHp } from "@/game/run/encounter";
import { runHasTrait } from "@/game/run/runMods";
import { createStream, type RngStream, type RngStreams } from "@/services/rng";
import type {
  BattleSnapshot,
  EnemyState,
  RolledDie,
  SlotId,
  SlotState,
} from "@/types/battle";
import type {
  DieTier,
  EnemyDef,
  Intent,
  PatternStep,
  School,
  StepCond,
} from "@/types/content";

export const TIER_LADDER: readonly DieTier[] = [4, 6, 8, 10, 12, 20, 100];

export const shrinkTier = (tier: DieTier): DieTier => {
  const index = TIER_LADDER.indexOf(tier);
  return index <= 0 ? tier : (TIER_LADDER[index - 1] ?? tier);
};

export const MAX_ENEMIES = 3;
export const DEFAULT_CHARGE_CAP = 10;

const dieFaceRange = (defId: string, tier: number): [number, number] => {
  const faces = DIE_BY_ID.get(defId)?.faces;
  if (faces !== undefined && faces.length > 0) {
    return [Math.min(...faces), Math.max(...faces)];
  }
  return [1, tier];
};

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
    const [min, max] = dieFaceRange(die.defId, die.tier);
    const growth = die.growth ?? 0;
    const mid = (min + max) / 2;
    die.value = (die.value - growth >= mid ? max : min) + growth;
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

export const rollDeck = (
  deckDefIds: readonly string[],
  streams: RngStreams,
): RolledDie[] =>
  deckDefIds.map((defId, index) => {
    const def = DIE_BY_ID.get(defId);
    if (def === undefined)
      throw new Error(`rollDeck: unknown die def "${defId}"`);
    return {
      uid: `die-${String(index)}`,
      defId,
      tier: def.tier,
      school: def.school,
      value: rollBaseValue(defId, def.tier, streams.dice),
      state: "tray",
    };
  });

export const phaseFloor = (ascension: number): number =>
  ascension >= 5 ? 1 : 0;

export const phaseIndexForHp = (
  def: EnemyDef,
  hp: number,
  hpMax: number,
  ascension = 0,
): number => {
  const phases = def.phases;
  if (phases === undefined || phases.length === 0) return 0;
  const floor = Math.min(phaseFloor(ascension), phases.length - 1);
  const pct = hpMax > 0 ? (hp / hpMax) * 100 : 0;
  for (let i = floor; i < phases.length; i += 1) {
    const phase = phases[i];
    if (phase !== undefined && pct > phase.untilHpPct) return i;
  }
  return phases.length - 1;
};

const heaviestAttack = (pattern: readonly PatternStep[]): PatternStep | undefined => {
  let best: PatternStep | undefined;
  let bestN = -1;
  for (const step of pattern) {
    if ("pick" in step || "when" in step) continue;
    const n =
      step.t === "attack" ? step.n : step.t === "multi" ? step.n * step.k : -1;
    if (n > bestN) {
      bestN = n;
      best = step;
    }
  }
  return best;
};

export interface StepContext {
  selfHpPct: number;
  selfShield: number;
  playerShield: number;
  playerCharge: number;
  playerHullPct: number;
  allies: number;
  turn: number;
}

export const NEUTRAL_STEP_CONTEXT: StepContext = {
  selfHpPct: 100,
  selfShield: 0,
  playerShield: 0,
  playerCharge: 0,
  playerHullPct: 100,
  allies: 1,
  turn: 1,
};

export const stepContextFor = (
  snapshot: Pick<BattleSnapshot, "shield" | "charge" | "hull" | "hullMax" | "turn" | "enemies">,
  enemy: Pick<EnemyState, "hp" | "hpMax" | "shield">,
): StepContext => ({
  selfHpPct: enemy.hpMax > 0 ? (enemy.hp / enemy.hpMax) * 100 : 0,
  selfShield: enemy.shield,
  playerShield: snapshot.shield,
  playerCharge: snapshot.charge,
  playerHullPct:
    snapshot.hullMax > 0 ? (snapshot.hull / snapshot.hullMax) * 100 : 0,
  allies: snapshot.enemies.filter((e) => e.hp > 0).length,
  turn: snapshot.turn,
});

export const stepCondHolds = (cond: StepCond, ctx: StepContext): boolean => {
  switch (cond.c) {
    case "selfHpPctLt":
      return ctx.selfHpPct < cond.n;
    case "selfShielded":
      return ctx.selfShield > 0;
    case "playerShielded":
      return ctx.playerShield > 0;
    case "playerChargeAtLeast":
      return ctx.playerCharge >= cond.n;
    case "playerHullPctLt":
      return ctx.playerHullPct < cond.n;
    case "alliesAtLeast":
      return ctx.allies >= cond.n;
    case "turnGte":
      return ctx.turn >= cond.n;
  }
};

export const patternFor = (
  def: EnemyDef,
  phase: number,
  ascension = 0,
): PatternStep[] => {
  const script = def.phases?.[phase];
  const base = script?.pattern ?? def.pattern;
  if (def.boss !== true || !ascensionMods(ascension).bossPatternInsert) {
    return [...base];
  }
  const extra = heaviestAttack(base);
  return extra === undefined ? [...base] : [...base, extra];
};

export const everyTurnFor = (def: EnemyDef, phase: number): readonly Intent[] =>
  def.phases?.[phase]?.everyTurn ?? [];

export const drawIntent = (
  def: EnemyDef,
  intentIndex: number,
  enemyStream: RngStream,
  phase = 0,
  ascension = 0,
  ctx: StepContext = NEUTRAL_STEP_CONTEXT,
): Intent => {
  const pattern = patternFor(def, phase, ascension);
  const step = pattern[intentIndex % pattern.length];
  if (step === undefined)
    throw new Error(`drawIntent: "${def.id}" empty pattern`);
  if ("pick" in step) return enemyStream.weighted(step.pick);
  if ("when" in step) return stepCondHolds(step.when, ctx) ? step.then : step.else;
  return step;
};

export interface SpawnInit {
  tide?: number;
  sectorHpPct?: number;
  hpBonusPct?: number;
  eliteShield?: number;
  ascension?: number;
}

const isTough = (def: EnemyDef): boolean =>
  def.elite === true || def.miniboss === true || def.boss === true;

export const WARD_SCHOOLS: readonly School[] = [
  "red",
  "blue",
  "green",
  "yellow",
  "black",
  "grey",
];

export const rotateWard = (current: School | undefined, stream: RngStream): School => {
  const options = WARD_SCHOOLS.filter((school) => school !== current);
  return stream.pick(options);
};

export const spawnEnemy = (
  defId: string,
  id: string,
  enemyStream: RngStream,
  init: SpawnInit = {},
): EnemyState => {
  const def = ENEMY_BY_ID.get(defId);
  if (def === undefined)
    throw new Error(`spawnEnemy: unknown enemy "${defId}"`);
  const scale = (base: number): number =>
    scaleEnemyHp(base, {
      tide: init.tide,
      sectorHpPct: init.sectorHpPct,
      hpBonusPct: init.hpBonusPct,
    });
  const hp = scale(def.hp);
  const ascension = init.ascension ?? 0;
  const phase = phaseIndexForHp(def, hp, hp, ascension);
  const subs = [
    ...(def.subsystems ?? []),
    ...(def.elite === true && ascensionMods(ascension).eliteSubsystem
      ? [A6_ELITE_SUBSYSTEM]
      : []),
  ];
  return {
    id,
    defId,
    hp,
    hpMax: hp,
    shield: isTough(def) ? (init.eliteShield ?? 0) : 0,
    intentIndex: 0,
    nextIntent: drawIntent(def, 0, enemyStream, phase, ascension),
    statuses: {},
    ...(def.ward === true ? { ward: rotateWard(undefined, enemyStream) } : {}),
    subsystems: subs.map((sub) => ({
      id: `${id}:${sub.id}`,
      key: sub.id,
      hp: scale(sub.hp),
      hpMax: scale(sub.hp),
      aura: sub.aura,
    })),
    phase,
  };
};

export const buildEnemies = (
  enemyIds: readonly string[],
  enemyStream: RngStream,
  init: SpawnInit = {},
): EnemyState[] =>
  expandEncounterIds(enemyIds)
    .slice(0, MAX_ENEMIES)
    .map((defId, index) =>
      spawnEnemy(defId, `enemy-${String(index)}`, enemyStream, init),
    );

export const buildBattleSnapshot = (
  shipId: ShipId,
  deckDefIds: readonly string[],
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
  const dice = rollDeck(deckDefIds, streams);
  const hullMax = init.hullMax ?? shipHullMax(shipId);
  const resonance = computeCensus(
    dice,
    Math.max(
      shipProfile(shipId).prismaticCensusMult,
      runHasTrait(
        init.perks ?? [],
        init.chartPicks ?? [],
        "prismDouble",
        init.modules ?? [],
      )
        ? 2
        : 1,
    ),
  );
  if (init.resonanceBoost !== undefined) {
    resonance.counts[init.resonanceBoost.school] += init.resonanceBoost.n;
  }
  const snapshot: BattleSnapshot = {
    turn: 1,
    hull: Math.max(1, Math.min(hullMax, init.hull ?? hullMax)),
    hullMax,
    shield: 0,
    shieldPersist: 0,
    charge: 0,
    scrap: 0,
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
    exceedCap: [],
    shipId,
    dice,
    slots: applySlotOverrides(
      buildShipSlots(shipId, mkLevels),
      init.slotTierDelta,
      init.disabledSlots,
    ),
    enemies,
    targetId: enemies[0]?.id ?? null,
    evasion: null,
    nextTurnMods: {},
    nextRollBonus: 0,
    chargeCap: init.chargeCap ?? DEFAULT_CHARGE_CAP,
    sacrificePool: 0,
    bloodReactorUsed: false,
    burnDoubleUsed: false,
    blockedSlots: [],
    shrunkSlots: [],
    lockedDice: [],
    cursedDice: [],
    pendingHijack: 0,
    resonance,
    survivedLethal: false,
    lastPlayerDamage: 0,
    stolenScrap: 0,
    pendingTwist: 0,
    pendingSwap: 0,
    pendingStorm: 0,
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
    dice,
    snapshot.resonance,
    runHasTrait(perks, init.chartPicks ?? [], "stabilizer", modules),
  );
  if (runHasTrait(perks, init.chartPicks ?? [], "spareLowest", modules)) {
    applySpareLowest(dice);
  }
  applyObsidianPact(dice, perks, init.chartPicks ?? [], modules);
  const ctx = new BattleCtx(snapshot, snapshot.flags);
  emit(buildSources(snapshot), "battleStart", ctx);
  snapshot.flags = [...ctx.flags];
  return snapshot;
};

export const isSlotBlocked = (
  snapshot: Pick<BattleSnapshot, "blockedSlots" | "turn">,
  slotId: SlotId,
): boolean =>
  snapshot.blockedSlots.some(
    (b) => b.slot === slotId && b.untilTurn >= snapshot.turn,
  );

export const isSlotShrunk = (
  snapshot: Pick<BattleSnapshot, "shrunkSlots" | "turn">,
  slotId: SlotId,
): boolean =>
  (snapshot.shrunkSlots ?? []).some(
    (b) => b.slot === slotId && b.untilTurn >= snapshot.turn,
  );

export const effectiveCap = (
  snapshot: Pick<BattleSnapshot, "shrunkSlots" | "turn">,
  slotId: SlotId,
  slot: Pick<SlotState, "cap">,
): DieTier => (isSlotShrunk(snapshot, slotId) ? shrinkTier(slot.cap) : slot.cap);

export const isDieLocked = (
  snapshot: Pick<BattleSnapshot, "lockedDice" | "turn">,
  uid: string,
): boolean =>
  snapshot.lockedDice.some(
    (l) => l.uid === uid && l.untilTurn >= snapshot.turn,
  );

export const curseOn = (
  snapshot: Pick<BattleSnapshot, "cursedDice" | "turn">,
  uid: string,
): number =>
  (snapshot.cursedDice ?? [])
    .filter((c) => c.uid === uid && c.untilTurn >= snapshot.turn)
    .reduce((sum, c) => sum + c.n, 0);

export const exceedCapGrantFor = (
  snapshot: Pick<BattleSnapshot, "exceedCap">,
  die: Pick<RolledDie, "school">,
  slotId: SlotId,
): ExceedCapGrant | undefined =>
  (snapshot.exceedCap ?? []).find(
    (grant) =>
      (grant.school === undefined ||
        die.school === grant.school ||
        die.school === "prismatic") &&
      (grant.slot === undefined || slotMatches(slotId, grant.slot)),
  );

export const dieFitsSlot = (
  snapshot: Pick<
    BattleSnapshot,
    "resonance" | "shipId" | "shrunkSlots" | "turn" | "exceedCap"
  >,
  die: Pick<RolledDie, "tier" | "school">,
  slot: Pick<SlotState, "cap">,
  slotId: SlotId,
): boolean => {
  if (die.tier <= effectiveCap(snapshot, slotId, slot)) return true;
  if (exceedCapGrantFor(snapshot, die, slotId) !== undefined) return true;
  return overCapAllowed(snapshot.shipId, slotId) !== null;
};

export const canPlaceDie = (
  snapshot: Pick<
    BattleSnapshot,
    | "dice"
    | "slots"
    | "blockedSlots"
    | "shrunkSlots"
    | "lockedDice"
    | "turn"
    | "resonance"
    | "shipId"
    | "engravings"
    | "exceedCap"
  >,
  uid: string,
  slotId: SlotId,
): boolean => {
  const die = snapshot.dice.find((d) => d.uid === uid);
  const slot = snapshot.slots[slotId];
  if (die === undefined || slot === undefined) return false;
  const blocked =
    isSlotBlocked(snapshot, slotId) &&
    !dieHasGrant(snapshot.engravings, die.defId, "blockImmune");
  return (
    die.state === "tray" &&
    slot.dieUid === undefined &&
    dieFitsSlot(snapshot, die, slot, slotId) &&
    !blocked &&
    !isDieLocked(snapshot, uid)
  );
};
