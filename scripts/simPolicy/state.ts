import { DIE_BY_ID } from "../../src/data/dice";
import { moduleSlots } from "../../src/data/modules";
import { PERK_BY_ID } from "../../src/data/perks";
import { sectorDef } from "../../src/data/sectors";
import {
  DECK_CAP,
  mkUpgradeCost,
  ptsForDie,
  sellValue,
} from "../../src/game/economy/prices";
import { generateShopModules, generateShopStock } from "../../src/game/economy/shop";
import { interferenceStacksForStreak } from "../../src/game/run/interference";
import { computePerkMods } from "../../src/game/run/perkMods";
import { computeRunMods } from "../../src/game/run/runMods";
import { rollPerkChoices, type DraftContext } from "../../src/game/run/perkDraft";
import { puzzleForNode } from "../../src/game/puzzles/selection";
import type { MapGraph, MapNode } from "../../src/game/map/types";
import { edgeMarkFor } from "../../src/game/map/types";
import type { ShipId } from "../../src/data/ships";
import type { MkLevels } from "../../src/stores/runStore";
import type { SlotId } from "../../src/types/battle";
import type {
  EventDef,
  EventEffect,
  EventKind,
  EventOption,
  FlagValue,
  ForcedBattle,
  Outcome,
} from "../../src/types/events";
import { ALL_EVENTS } from "../../src/data/events";
import { SHIP_BY_ID } from "../../src/data/ships";
import {
  optionMet,
  optionOutcomes,
  pickEvent,
  selectOutcome,
} from "../../src/game/events/engine";
import {
  checkOdds,
  checkPassed,
  checkTotal,
  rollCheckDice,
  topDiceForCheck,
  type DeckRef,
} from "../../src/game/events/checks";
import { AXIS_MAX, AXIS_MIN } from "../../src/game/run/axis";
import { dieForRarity, DROP_WEIGHTS, rollDrop } from "../../src/game/economy/rewards";
import { createStream, deriveSeed, type RngStream } from "../../src/services/rng";
import { decideDraft, type DraftLoadout } from "./draft";
import { resolvePuzzle, INTERFERENCE_SCRAP_VALUE } from "./puzzle";
import { motifsOf } from "./map";

export interface PuzzleTally {
  entered: number;
  solved: number;
  attempts: number;
  paid: number;
}

export interface RunState {
  shipId: ShipId;
  hull: number;
  hullMax: number;
  scrap: number;
  scrapEarned: number;
  scrapSpent: number;
  deck: string[];
  mkLevels: MkLevels;
  perks: string[];
  modules: string[];
  banished: string[];
  chartPicks: string[];
  tide: number;
  jumpsSinceTide: number;
  kills: number;
  nodes: number;
  fights: number;
  pockets: number;
  draftsSinceRare: number;
  anomalyStreak: number;
  interference: number;
  vouchers: number;
  axis: number;
  flags: Record<string, FlagValue>;
  seenEvents: string[];
  eventsResolved: number;
  eventScrap: number;
  eventHull: number;
  solvedPuzzles: string[];
  banishUsed: boolean;
  rerollUsed: boolean;
  draftSkips: number;
  draftRerolls: number;
  puzzleByTier: Record<number, PuzzleTally>;
  sinks: Record<string, number>;
  takenBySector: Record<number, number>;
  fightsBySector: Record<number, number>;
}

export const emptyPuzzleTally = (): Record<number, PuzzleTally> => ({
  1: { entered: 0, solved: 0, attempts: 0, paid: 0 },
  2: { entered: 0, solved: 0, attempts: 0, paid: 0 },
  3: { entered: 0, solved: 0, attempts: 0, paid: 0 },
  4: { entered: 0, solved: 0, attempts: 0, paid: 0 },
  5: { entered: 0, solved: 0, attempts: 0, paid: 0 },
});

export const emptySinks = (): Record<string, number> => ({
  dice: 0,
  modules: 0,
  repair: 0,
  mk: 0,
  puzzleStakes: 0,
  draftReroll: 0,
  events: 0,
});

export interface RunStateInit {
  shipId?: ShipId;
  hull: number;
  hullMax: number;
  deck: readonly string[];
  mkLevels?: MkLevels;
  perks?: readonly string[];
  modules?: readonly string[];
  chartPicks?: readonly string[];
}

export const createRunState = (init: RunStateInit): RunState => ({
  shipId: init.shipId ?? "wanderer",
  hull: init.hull,
  hullMax: init.hullMax,
  scrap: 0,
  scrapEarned: 0,
  scrapSpent: 0,
  deck: [...init.deck],
  mkLevels: { ...(init.mkLevels ?? {}) },
  perks: [...(init.perks ?? [])],
  modules: [...(init.modules ?? [])],
  banished: [],
  chartPicks: [...(init.chartPicks ?? [])],
  tide: 0,
  jumpsSinceTide: 0,
  vouchers: 0,
  axis: 0,
  flags: {},
  seenEvents: [],
  eventsResolved: 0,
  eventScrap: 0,
  eventHull: 0,
  kills: 0,
  nodes: 0,
  fights: 0,
  pockets: 0,
  draftsSinceRare: 0,
  anomalyStreak: 0,
  interference: 0,
  solvedPuzzles: [],
  banishUsed: false,
  rerollUsed: false,
  draftSkips: 0,
  draftRerolls: 0,
  puzzleByTier: emptyPuzzleTally(),
  sinks: emptySinks(),
  takenBySector: {},
  fightsBySector: {},
});

export const spend = (state: RunState, cost: number, sink: string): boolean => {
  if (cost < 0 || state.scrap < cost) return false;
  state.scrap -= cost;
  state.scrapSpent += cost;
  state.sinks[sink] = (state.sinks[sink] ?? 0) + cost;
  return true;
};

export const gain = (state: RunState, amount: number): void => {
  if (amount <= 0) return;
  state.scrap += amount;
  state.scrapEarned += amount;
};

export const schoolOf = (defId: string): string | undefined =>
  DIE_BY_ID.get(defId)?.school;

export const REAL_SCHOOLS = [
  "red",
  "blue",
  "green",
  "yellow",
  "black",
  "grey",
] as const;

export const deckTargetSchool = (deck: readonly string[]): string => {
  const census = new Map<string, number>();
  let prismatic = 0;
  for (const defId of deck) {
    const school = schoolOf(defId);
    if (school === undefined) continue;
    if (school === "prismatic") prismatic += 1;
    else census.set(school, (census.get(school) ?? 0) + 1);
  }
  let best = "red";
  let bestN = -1;
  for (const s of REAL_SCHOOLS) {
    const n = (census.get(s) ?? 0) + (s === best ? prismatic : 0);
    if (n > bestN) {
      best = s;
      bestN = n;
    }
  }
  return best;
};

export const maxRealSchoolCount = (deck: readonly string[]): number => {
  const census = new Map<string, number>();
  let prismatic = 0;
  for (const defId of deck) {
    const school = schoolOf(defId);
    if (school === undefined) continue;
    if (school === "prismatic") prismatic += 1;
    else census.set(school, (census.get(school) ?? 0) + 1);
  }
  let best = 0;
  for (const s of REAL_SCHOOLS) best = Math.max(best, census.get(s) ?? 0);
  return best + prismatic;
};

export const maxMk = (mkLevels: MkLevels): number =>
  Math.max(1, ...Object.values(mkLevels).map((mk) => mk ?? 1));

const worstDieIndex = (deck: readonly string[], target: string): number => {
  let index = -1;
  let worst = Number.POSITIVE_INFINITY;
  for (let i = 0; i < deck.length; i += 1) {
    const defId = deck[i];
    if (defId === undefined) continue;
    const school = schoolOf(defId);
    const offSchool = school !== target && school !== "prismatic" ? 0 : 4;
    const score = ptsForDie(defId) + offSchool;
    if (score < worst) {
      worst = score;
      index = i;
    }
  }
  return index;
};

export const takeDie = (state: RunState, defId: string): void => {
  if (state.deck.length < DECK_CAP) {
    state.deck.push(defId);
    return;
  }
  const target = deckTargetSchool(state.deck);
  const index = worstDieIndex(state.deck, target);
  const incumbent = index < 0 ? undefined : state.deck[index];
  if (
    index >= 0 &&
    incumbent !== undefined &&
    ptsForDie(defId) > ptsForDie(incumbent)
  ) {
    state.deck[index] = defId;
    gain(state, sellValue(ptsForDie(incumbent)));
    return;
  }
  gain(state, sellValue(ptsForDie(defId)));
};

export const greedyShop = (
  state: RunState,
  seed: number,
  node: MapNode,
): void => {
  const discount = computeRunMods(state.perks, state.chartPicks, state.modules).shopDiscountPct;
  for (const item of generateShopModules(seed, node.id, 0, discount)) {
    if (state.modules.length >= moduleSlots(0)) break;
    if (state.scrap >= item.price && spend(state, item.price, "modules")) {
      state.modules.push(item.moduleId);
    }
  }
  const items = generateShopStock(seed, node.id, 0, discount);
  const target = deckTargetSchool(state.deck);
  const rank = (defId: string): number => {
    const school = schoolOf(defId);
    if (school === target || school === "prismatic") return 0;
    if (school === "red" || school === "blue") return 1;
    return 2;
  };
  const sorted = [...items].sort((a, b) => {
    const r = rank(a.defId) - rank(b.defId);
    return r !== 0 ? r : ptsForDie(b.defId) - ptsForDie(a.defId);
  });
  for (const item of sorted) {
    if (state.scrap < item.price) continue;
    if (state.deck.length >= DECK_CAP) {
      const worst = worstDieIndex(state.deck, target);
      const incumbent = worst < 0 ? undefined : state.deck[worst];
      if (
        incumbent === undefined ||
        ptsForDie(item.defId) <= ptsForDie(incumbent)
      ) {
        continue;
      }
    }
    if (!spend(state, item.price, "dice")) continue;
    takeDie(state, item.defId);
  }
};

const UPGRADE_PRIORITY: readonly SlotId[] = [
  "weaponA",
  "weaponB",
  "spinal",
  "shields",
  "shieldsB",
  "reactor",
  "engines",
  "enginesB",
  "sensors",
  "repairBay",
];

export const upgradeSlotsFor = (shipId: ShipId): SlotId[] => {
  const slots = SHIP_BY_ID.get(shipId)?.slots ?? {};
  return UPGRADE_PRIORITY.filter((slotId) => slots[slotId] !== undefined);
};

export const repairToFull = (state: RunState): void => {
  const missing = state.hullMax - state.hull;
  const repairable = Math.min(missing, Math.floor(state.scrap / 2));
  if (repairable > 0 && spend(state, repairable * 2, "repair")) {
    state.hull = Math.min(state.hullMax, state.hull + repairable);
  }
};

export const buyUpgrades = (state: RunState): void => {
  const slots = upgradeSlotsFor(state.shipId);
  for (const slotId of slots) {
    while (state.vouchers > 0) {
      const mk = state.mkLevels[slotId] ?? 1;
      if (mk >= 3) break;
      state.vouchers -= 1;
      state.mkLevels = { ...state.mkLevels, [slotId]: (mk + 1) as 2 | 3 };
    }
  }
  for (const slotId of slots) {
    let mk = state.mkLevels[slotId] ?? 1;
    while (mk < 3) {
      const target = (mk + 1) as 2 | 3;
      const cost = mkUpgradeCost(target);
      if (state.scrap < cost || !spend(state, cost, "mk")) break;
      mk = target;
      state.mkLevels = { ...state.mkLevels, [slotId]: mk };
    }
  }
};

export const greedyShipyard = (state: RunState, repairFirst: boolean): void => {
  if (repairFirst) {
    repairToFull(state);
    buyUpgrades(state);
  } else {
    buyUpgrades(state);
    repairToFull(state);
  }
  repairToFull(state);
};

export const applyEffectsToState = (
  state: RunState,
  effects: readonly EventEffect[],
  tideCap: number,
  loot?: RngStream,
): void => {
  for (const effect of effects) {
    if (effect.k === "scrap") {
      if (effect.n >= 0) gain(state, effect.n);
      else spend(state, Math.min(state.scrap, -effect.n), "events");
    } else if (effect.k === "hull") {
      state.hull = Math.max(1, Math.min(state.hullMax, state.hull + effect.n));
    } else if (effect.k === "hullMax") {
      state.hullMax = Math.max(1, state.hullMax + effect.n);
      state.hull = Math.max(1, Math.min(state.hullMax, state.hull));
    } else if (effect.k === "tide") {
      state.tide = Math.max(0, Math.min(tideCap, state.tide + effect.n));
    } else if (effect.k === "axis") {
      state.axis = Math.max(AXIS_MIN, Math.min(AXIS_MAX, state.axis + effect.n));
    } else if (effect.k === "flag") {
      state.flags[effect.key] = effect.value ?? true;
    } else if (effect.k === "loot" && loot !== undefined) {
      const defId =
        effect.die ??
        (effect.rarity === undefined
          ? rollDrop(loot, DROP_WEIGHTS.battle)
          : dieForRarity(loot, effect.rarity));
      takeDie(state, defId);
    } else if (effect.k === "swapLowestDie") {
      state.deck.sort((a, b) => ptsForDie(a) - ptsForDie(b));
    }
  }
};

export const applyNodeMotifs = (
  state: RunState,
  sector: number,
  node: MapNode,
  tideCap: number,
): void => {
  for (const motif of motifsOf(sector)) {
    if (motif.m === "cache" && node.cache === true) {
      applyEffectsToState(state, motif.gain, tideCap);
    }
    if (motif.m === "procession" && node.blessing !== undefined) {
      applyEffectsToState(
        state,
        node.blessing === "blessed" ? motif.blessed : motif.cursed,
        tideCap,
      );
    }
  }
};

export const applyEdgeMotifs = (
  state: RunState,
  sector: number,
  map: MapGraph,
  from: string,
  to: string,
  tideCap: number,
): void => {
  if (edgeMarkFor(map, from, to) !== "mine") return;
  for (const motif of motifsOf(sector)) {
    if (motif.m === "mineEdges") applyEffectsToState(state, motif.toll, tideCap);
  }
};

export const draftContext = (
  state: RunState,
  sector: number,
): DraftContext => ({
  owned: state.perks,
  banished: state.banished,
  sector,
  deckDefIds: state.deck,
  modules: state.modules,
  shipId: "wanderer",
  draftsSinceRare: state.draftsSinceRare,
});

const loadoutOf = (state: RunState): DraftLoadout => ({
  deckDefIds: state.deck,
  perks: state.perks,
  modules: state.modules,
});

const takePerk = (state: RunState, perkId: string): void => {
  state.perks.push(perkId);
  const picked = computePerkMods([perkId]);
  if (picked.hullMaxDelta > 0) {
    state.hullMax += picked.hullMaxDelta;
    state.hull = Math.min(state.hullMax, state.hull + picked.hullMaxDelta);
  }
};

const noteDraftRarity = (state: RunState, choices: readonly string[]): void => {
  if (choices.length === 0) return;
  state.draftsSinceRare = choices.some(
    (id) => PERK_BY_ID.get(id)?.rarity === "rare",
  )
    ? 0
    : state.draftsSinceRare + 1;
};

export const runDraft = (
  state: RunState,
  sector: number,
  stream: RngStream,
): void => {
  let choices = rollPerkChoices(stream, draftContext(state, sector));
  noteDraftRarity(state, choices);
  if (choices.length === 0) return;

  let verdict = decideDraft(
    choices,
    loadoutOf(state),
    {
      scrap: state.scrap,
      sector,
      banishLeft: state.banishUsed ? 0 : 1,
      rerollLeft: state.rerollUsed ? 0 : 1,
    },
    schoolOf,
  );

  if (verdict.reroll) {
    spend(state, verdict.spent, "draftReroll");
    state.rerollUsed = true;
    state.draftRerolls += 1;
    choices = rollPerkChoices(stream, draftContext(state, sector));
    noteDraftRarity(state, choices);
    verdict = decideDraft(
      choices,
      loadoutOf(state),
      {
        scrap: state.scrap,
        sector,
        banishLeft: state.banishUsed ? 0 : 1,
        rerollLeft: 0,
      },
      schoolOf,
    );
  }

  if (verdict.banish !== undefined) {
    state.banished.push(verdict.banish);
    state.banishUsed = true;
  }
  if (verdict.skip) {
    state.draftSkips += 1;
    gain(state, verdict.gained);
    return;
  }
  if (verdict.pick !== undefined) takePerk(state, verdict.pick);
};

const EVENT_HULL_VALUE = 6;

const deckRefs = (state: RunState): DeckRef[] =>
  state.deck.flatMap((defId) => {
    const def = DIE_BY_ID.get(defId);
    return def === undefined
      ? []
      : [{ defId, tier: def.tier, school: def.school }];
  });

const hullValue = (state: RunState): number =>
  EVENT_HULL_VALUE * (state.hullMax / Math.max(1, state.hull));

const effectValue = (state: RunState, effect: EventEffect): number => {
  if (effect.k === "scrap") return effect.n;
  if (effect.k === "hull") {
    return effect.n < 0
      ? effect.n * hullValue(state)
      : Math.min(effect.n, state.hullMax - state.hull) * EVENT_HULL_VALUE;
  }
  if (effect.k === "hullMax") return effect.n * EVENT_HULL_VALUE * 2;
  if (effect.k === "tide") return -effect.n * hullValue(state);
  if (effect.k === "loot") return 30;
  return 0;
};

const outcomesValue = (
  state: RunState,
  outcomes: readonly Outcome[],
): number => {
  if (outcomes.length === 0) return 0;
  let weight = 0;
  let total = 0;
  for (const outcome of outcomes) {
    const w = outcome.weight ?? 1;
    weight += w;
    total +=
      w *
      outcome.effects.reduce((sum, e) => sum + effectValue(state, e), 0);
  }
  return weight === 0 ? 0 : total / weight;
};

const optionValue = (
  state: RunState,
  option: EventOption,
  odds: number,
): number =>
  option.check === undefined
    ? outcomesValue(state, option.outcomes ?? [])
    : odds * outcomesValue(state, option.onPass ?? []) +
      (1 - odds) * outcomesValue(state, option.onFail ?? []);

const checkOddsFor = (state: RunState, option: EventOption): number => {
  if (option.check === undefined) return 1;
  const dice = topDiceForCheck(
    deckRefs(state),
    option.check.dice,
    option.check,
  );
  return checkOdds(dice, option.check.pick, option.check.target);
};

export const runEvent = (
  state: RunState,
  sector: number,
  kind: EventKind,
  seed: number,
  tideCap: number,
): ForcedBattle | null => {
  const stream = createStream(seed);
  const def: EventDef | null = pickEvent(
    ALL_EVENTS,
    {
      sector,
      axis: state.axis,
      flags: state.flags,
      seenEvents: state.seenEvents,
    },
    kind,
    stream,
  );
  if (def === null) return null;
  state.seenEvents.push(def.id);

  const ctx = {
    scrap: state.scrap,
    hull: state.hull,
    axis: state.axis,
    deck: deckRefs(state).map((d) => ({ school: d.school ?? "grey", tier: d.tier })),
    mkLevels: state.mkLevels,
    flags: state.flags,
  };
  const legal = def.options.filter((option) => optionMet(option.requires, ctx));
  if (legal.length === 0) return null;

  let best = legal[0];
  let bestValue = Number.NEGATIVE_INFINITY;
  let bestOdds = 1;
  for (const option of legal) {
    const odds = checkOddsFor(state, option);
    const value = optionValue(state, option, odds);
    if (value > bestValue) {
      bestValue = value;
      best = option;
      bestOdds = odds;
    }
  }
  if (best === undefined) return null;
  void bestOdds;

  let passed: boolean | null = null;
  if (best.check !== undefined) {
    const dice = topDiceForCheck(deckRefs(state), best.check.dice, best.check);
    const values = rollCheckDice(dice, createStream(deriveSeed(seed, "check")));
    passed = checkPassed(
      checkTotal(values, best.check.pick),
      best.check.pick,
      best.check.target,
    );
  }
  const outcome = selectOutcome(
    optionOutcomes(best, passed),
    createStream(deriveSeed(seed, "outcome")),
  );
  if (outcome === null) return null;

  const scrapBefore = state.scrap;
  const hullBefore = state.hull;
  applyEffectsToState(
    state,
    outcome.effects,
    tideCap,
    createStream(deriveSeed(seed, "loot")),
  );
  state.eventsResolved += 1;
  state.eventScrap += state.scrap - scrapBefore;
  state.eventHull += state.hull - hullBefore;
  return outcome.follow ?? null;
};

export const runAnomaly = (
  state: RunState,
  sector: number,
  node: MapNode,
  seed: number,
): void => {
  const puzzle = puzzleForNode(seed, node, state.solvedPuzzles, []);
  if (puzzle === null) {
    state.anomalyStreak += 1;
    state.interference = interferenceStacksForStreak(state.anomalyStreak);
    return;
  }
  const streakPressure =
    interferenceStacksForStreak(state.anomalyStreak + 1) *
    INTERFERENCE_SCRAP_VALUE;
  const outcome = resolvePuzzle(
    puzzle,
    state.scrap,
    streakPressure,
    createStream(deriveSeed(seed, `solve:${node.id}`)),
    createStream(deriveSeed(seed, `reward:${node.id}`)),
  );
  const tally = state.puzzleByTier[puzzle.tier];
  if (tally !== undefined && outcome.entered) {
    tally.entered += 1;
    tally.attempts += outcome.attempts;
    tally.paid += outcome.paid;
    if (outcome.solved) tally.solved += 1;
  }
  if (outcome.paid > 0) spend(state, outcome.paid, "puzzleStakes");
  if (outcome.solved) {
    state.solvedPuzzles.push(puzzle.id);
    state.anomalyStreak = 0;
    state.interference = 0;
    gain(state, outcome.scrap);
    if (outcome.dieDrop !== null) takeDie(state, outcome.dieDrop);
    return;
  }
  state.anomalyStreak += 1;
  state.interference = interferenceStacksForStreak(state.anomalyStreak);
  void sector;
};

export const tideCapFor = (sector: number, ascensionDelta = 0): number =>
  sectorDef(sector).tideCap + ascensionDelta;
