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
import type { EventEffect } from "../../src/types/events";
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

const UPGRADE_SLOTS: readonly SlotId[] = [
  "weaponA",
  "weaponB",
  "shields",
  "reactor",
];

export const repairToFull = (state: RunState): void => {
  const missing = state.hullMax - state.hull;
  const repairable = Math.min(missing, Math.floor(state.scrap / 2));
  if (repairable > 0 && spend(state, repairable * 2, "repair")) {
    state.hull = Math.min(state.hullMax, state.hull + repairable);
  }
};

export const buyUpgrades = (state: RunState): void => {
  for (const slotId of UPGRADE_SLOTS) {
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
): void => {
  for (const effect of effects) {
    if (effect.k === "scrap") gain(state, effect.n);
    else if (effect.k === "hull") {
      state.hull = Math.max(1, Math.min(state.hullMax, state.hull + effect.n));
    } else if (effect.k === "tide") {
      state.tide = Math.max(0, Math.min(tideCap, state.tide + effect.n));
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
