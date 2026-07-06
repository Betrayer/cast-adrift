import { DIE_BY_ID } from "@/data/dice";
import type {
  ConstraintRule,
  OrderStep,
  PuzzleDef,
  PuzzleGoal,
  PuzzleMetric,
  SingleTurnGoal,
} from "@/data/puzzles";
import { affinitySchoolForSlot, slotCapForMk } from "@/data/slots";
import { computeCensus, resonanceAtLeast } from "@/game/battle/resonance";
import { resolveEnemyPhase, resolvePlayerPhase } from "@/game/battle/resolver";
import { createStream } from "@/services/rng";
import type {
  BattleSnapshot,
  Beat,
  EnemyState,
  ResonanceCensus,
  RolledDie,
  SlotId,
  SlotState,
} from "@/types/battle";
import type { DieTier, Intent, School } from "@/types/content";

export type Placement = Partial<Record<SlotId, number>>;

interface DieMeta {
  defId: string;
  tier: DieTier;
  school: School;
}

// Carry state threaded between turns of a multiTurn puzzle.
export interface CarryState {
  charge: number;
  burn: number;
  growth: number[];
}

const PUZZLE_HULL_DEFAULT = 30;
const DEFAULT_PUZZLE_CHARGE_CAP = 20;
const SAMPLE_SEED = 0x5a17;
const SAMPLE_ROLLS = 120;

export const emptyCarry = (deckLen: number): CarryState => ({
  charge: 0,
  burn: 0,
  growth: Array<number>(deckLen).fill(0),
});

export const dieMetas = (puzzle: PuzzleDef): DieMeta[] =>
  puzzle.deck.map((defId) => {
    const def = DIE_BY_ID.get(defId);
    return {
      defId,
      tier: def?.tier ?? 6,
      school: def?.school ?? "grey",
    };
  });

export const resolveFaces = (defId: string, tier: DieTier): number[] => {
  const faces = DIE_BY_ID.get(defId)?.faces;
  if (faces !== undefined && faces.length > 0) return [...faces];
  return Array.from({ length: tier }, (_, i) => i + 1);
};

export const faceRange = (defId: string, tier: DieTier): [number, number] => {
  const faces = resolveFaces(defId, tier);
  return [Math.min(...faces), Math.max(...faces)];
};

const capFor = (puzzle: PuzzleDef, slot: SlotId): number =>
  slotCapForMk(slot, puzzle.mk?.[slot] ?? 1);

const canAssign = (
  die: DieMeta,
  cap: number,
  census: ResonanceCensus,
): boolean => {
  if (die.tier <= cap) return true;
  return (
    (die.school === "black" || die.school === "prismatic") &&
    resonanceAtLeast(census, "black", 2)
  );
};

const dummyEnemy = (incoming: Intent | undefined, burn: number): EnemyState => ({
  id: "dummy",
  defId: "scavDrone",
  hp: 9999,
  hpMax: 9999,
  shield: 0,
  intentIndex: 0,
  nextIntent: incoming ?? { t: "attack", n: 0 },
  statuses: burn > 0 ? { burn } : {},
  subsystems: [],
});

const buildSnapshot = (
  puzzle: PuzzleDef,
  values: readonly number[],
  placement: Placement,
  carry: CarryState,
): BattleSnapshot => {
  const dice: RolledDie[] = puzzle.deck.map((defId, index) => {
    const def = DIE_BY_ID.get(defId);
    const growth = carry.growth[index] ?? 0;
    return {
      uid: `p${String(index)}`,
      defId,
      tier: def?.tier ?? 6,
      school: def?.school ?? "grey",
      value: (values[index] ?? 1) + growth,
      growth: growth > 0 ? growth : undefined,
      state: "tray",
    };
  });
  const slots: Partial<Record<SlotId, SlotState>> = {};
  for (const slot of puzzle.slots) {
    const mk = puzzle.mk?.[slot] ?? 1;
    slots[slot] = { cap: slotCapForMk(slot, mk), mk };
  }
  for (const [slot, index] of Object.entries(placement) as [
    SlotId,
    number,
  ][]) {
    const die = dice[index];
    const slotState = slots[slot];
    if (die === undefined || slotState === undefined) continue;
    die.state = "placed";
    die.slot = slot;
    slots[slot] = { ...slotState, dieUid: die.uid };
  }
  return {
    turn: 1,
    hull: puzzle.hull ?? PUZZLE_HULL_DEFAULT,
    hullMax: PUZZLE_HULL_DEFAULT,
    shield: 0,
    shieldPersist: 0,
    charge: carry.charge,
    scrap: 0,
    tide: 0,
    interference: 0,
    perks: [],
    dice,
    slots,
    enemies: [dummyEnemy(puzzle.incoming, carry.burn)],
    targetId: "dummy",
    engineState: null,
    nextTurnMods: {},
    nextRollBonus: 0,
    pendingDeepScan: false,
    chargeCap: puzzle.chargeCap ?? DEFAULT_PUZZLE_CHARGE_CAP,
    sacrificePool: 0,
    bloodReactorUsed: false,
    burnDoubleUsed: false,
    blockedSlots: [],
    lockedDice: [],
    resonance: computeCensus(dice),
    survivedLethal: false,
  };
};

const innerGoal = (goal: PuzzleGoal): SingleTurnGoal | null =>
  goal.g === "deduction" ? goal.inner : goal.g === "multiTurn" ? null : goal;

const needsEnemyPhase = (puzzle: PuzzleDef): boolean => {
  const inner = innerGoal(puzzle.goal);
  return inner?.g === "survive" || inner?.g === "survivePlus";
};

export interface TrialScore {
  damage: number;
  charge: number;
  shield: number;
  overflow: boolean;
  hullAfter: number;
  beats: Beat[];
  slotValues: Partial<Record<SlotId, number>>;
  wastedToCap: number;
  burnApplied: boolean;
  grew: boolean;
  enemyBurn: number;
  growthOut: number[];
}

export const scorePlacement = (
  puzzle: PuzzleDef,
  values: readonly number[],
  placement: Placement,
  carry: CarryState = emptyCarry(puzzle.deck.length),
): TrialScore => {
  const snapshot = buildSnapshot(puzzle, values, placement, carry);
  const player = resolvePlayerPhase(snapshot);
  const beats = player.beats;

  const damage = beats
    .filter((b) => b.kind === "damage")
    .reduce((sum, b) => sum + b.amount, 0);
  const totalStored = beats
    .filter((b) => b.kind === "charge")
    .reduce((sum, b) => sum + b.amount, 0);
  const overflow = beats.some(
    (b) => b.kind === "charge" && b.overflowHull !== undefined,
  );

  const slotValues: Partial<Record<SlotId, number>> = {};
  for (const b of beats) {
    if (b.kind === "spinalJam") continue;
    slotValues[b.slot] = (slotValues[b.slot] ?? 0) + b.amount;
  }

  const enemyBurn = player.next.enemies[0]?.statuses.burn ?? 0;
  const growthOut = player.next.dice.map((d) => d.growth ?? 0);
  const grew = growthOut.some((g, i) => g > (carry.growth[i] ?? 0));

  let hullAfter = player.next.hull;
  if (needsEnemyPhase(puzzle) && player.next.outcome === undefined) {
    const enemy = resolveEnemyPhase(player.next, createStream(1));
    hullAfter = enemy.next.hull;
  }

  return {
    damage,
    charge: player.next.charge,
    shield: player.next.shield,
    overflow,
    hullAfter,
    beats,
    slotValues,
    wastedToCap: Math.max(0, totalStored - (player.next.charge - carry.charge)),
    burnApplied: enemyBurn > 0,
    grew,
    enemyBurn,
    growthOut,
  };
};

const metricValue = (metric: PuzzleMetric, score: TrialScore): number =>
  metric === "damage"
    ? score.damage
    : metric === "charge"
      ? score.charge
      : score.shield;

const placedSlots = (placement: Placement): SlotId[] =>
  (Object.keys(placement) as SlotId[]).filter(
    (s) => placement[s] !== undefined,
  );

export const evalConstraintRule = (
  puzzle: PuzzleDef,
  rule: ConstraintRule,
  placement: Placement,
  score: TrialScore,
): boolean => {
  const metas = dieMetas(puzzle);
  switch (rule.r) {
    case "noWaste":
      return score.wastedToCap <= rule.maxOverCap;
    case "schoolInSlot": {
      const idx = placement[rule.slot];
      return idx !== undefined && metas[idx]?.school === rule.school;
    }
    case "everyDiePlaced": {
      const used = new Set(
        placedSlots(placement).map((s) => placement[s]),
      );
      return used.size === puzzle.deck.length;
    }
    case "slotParity": {
      const v = score.slotValues[rule.slot];
      if (v === undefined) return false;
      return v % 2 === (rule.parity === "even" ? 0 : 1);
    }
    case "minSlotsUsed":
      return placedSlots(placement).length >= rule.n;
    case "maxSlotsUsed":
      return placedSlots(placement).length <= rule.n;
    case "affixUsed":
      switch (rule.affix) {
        case "burn":
          return score.burnApplied;
        case "growth":
          return score.grew;
        case "exceedCap":
          return placedSlots(placement).some((slot) => {
            const die = metas[placement[slot] ?? -1];
            return die !== undefined && die.tier > capFor(puzzle, slot);
          });
        case "affinity":
          return placedSlots(placement).some((slot) => {
            const die = metas[placement[slot] ?? -1];
            if (die === undefined) return false;
            const affSchool = affinitySchoolForSlot(slot);
            return (
              affSchool !== undefined &&
              (die.school === affSchool || die.school === "prismatic")
            );
          });
      }
  }
};

export const evalOrderStep = (step: OrderStep, score: TrialScore): boolean => {
  switch (step.s) {
    case "mark":
      return score.beats.some(
        (b) => b.kind === "sensor" && b.sensor?.mark === true,
      );
    case "damage":
      return score.damage >= step.min;
    case "shield":
      return score.shield >= step.min;
    case "charge":
      return score.charge >= step.min;
    case "noOverflow":
      return !score.overflow;
    case "spinalJam":
      return score.beats.some((b) => b.kind === "spinalJam");
  }
};

export const singleTurnSatisfied = (
  puzzle: PuzzleDef,
  goal: SingleTurnGoal,
  values: readonly number[],
  placement: Placement,
  score = scorePlacement(puzzle, values, placement),
): boolean => {
  switch (goal.g) {
    case "damage":
      return score.damage >= goal.min;
    case "charge":
      return score.charge >= goal.min;
    case "shield":
      return score.shield >= goal.min;
    case "survive":
      return score.hullAfter > 0;
    case "exact":
      return (
        Math.abs(metricValue(goal.metric, score) - goal.value) <=
        (goal.tolerance ?? 0)
      );
    case "constraint":
      return (
        metricValue(goal.base.metric, score) >= goal.base.min &&
        goal.rules.every((r) => evalConstraintRule(puzzle, r, placement, score))
      );
    case "order":
      return goal.steps.every((s) => evalOrderStep(s, score));
    case "survivePlus":
      return (
        score.hullAfter > 0 &&
        metricValue(goal.clause.metric, score) >= goal.clause.min
      );
  }
};

// Single-placement satisfaction for every non-multiTurn arm (the runner's
// live check). multiTurn is handled by the turn simulator instead.
export const placementSatisfied = (
  puzzle: PuzzleDef,
  values: readonly number[],
  placement: Placement,
): boolean => {
  const goal = puzzle.goal;
  if (goal.g === "multiTurn") return false;
  const target = goal.g === "deduction" ? goal.inner : goal;
  return singleTurnSatisfied(puzzle, target, values, placement);
};

// A representative scalar for the banner ("Damage 12 / 14", "= 14", ...).
export const primaryMetric = (goal: PuzzleGoal): PuzzleMetric | "hull" => {
  switch (goal.g) {
    case "damage":
    case "charge":
    case "shield":
      return goal.g;
    case "survive":
    case "survivePlus":
      return "hull";
    case "exact":
      return goal.metric;
    case "constraint":
      return goal.base.metric;
    case "order":
      return "damage";
    case "multiTurn":
      return goal.final.metric;
    case "deduction":
      return primaryMetric(goal.inner);
  }
};

export const scoreMetric = (
  metric: PuzzleMetric | "hull",
  score: TrialScore,
): number => (metric === "hull" ? score.hullAfter : metricValue(metric, score));

export const enumeratePlacements = (puzzle: PuzzleDef): Placement[] => {
  const metas = dieMetas(puzzle);
  const census = computeCensus(metas);
  const blocked = new Set(puzzle.blocked ?? []);
  const available = puzzle.slots.filter((s) => !blocked.has(s));
  const results: Placement[] = [];

  const recurse = (
    index: number,
    used: ReadonlySet<SlotId>,
    acc: Placement,
  ): void => {
    if (index === metas.length) {
      results.push(acc);
      return;
    }
    recurse(index + 1, used, acc);
    const die = metas[index];
    if (die === undefined) return;
    for (const slot of available) {
      if (used.has(slot)) continue;
      if (!canAssign(die, capFor(puzzle, slot), census)) continue;
      recurse(index + 1, new Set([...used, slot]), { ...acc, [slot]: index });
    }
  };

  recurse(0, new Set(), {});
  return results;
};

export const legalAssign = (
  puzzle: PuzzleDef,
  dieIndex: number,
  slot: SlotId,
): boolean => {
  if ((puzzle.blocked ?? []).includes(slot)) return false;
  const metas = dieMetas(puzzle);
  const die = metas[dieIndex];
  if (die === undefined) return false;
  return canAssign(die, capFor(puzzle, slot), computeCensus(metas));
};

const facesAt = (
  puzzle: PuzzleDef,
  pick: (lo: number, hi: number) => number,
): number[] =>
  puzzle.deck.map((defId) => {
    const def = DIE_BY_ID.get(defId);
    const [lo, hi] = faceRange(defId, def?.tier ?? 6);
    return pick(lo, hi);
  });

const floorFaces = (puzzle: PuzzleDef): number[] =>
  facesAt(puzzle, (lo) => lo);
const ceilFaces = (puzzle: PuzzleDef): number[] => facesAt(puzzle, (_, hi) => hi);
const midFaces = (puzzle: PuzzleDef): number[] =>
  facesAt(puzzle, (lo, hi) => Math.round((lo + hi) / 2));

const sampleRolls = (puzzle: PuzzleDef, count: number): number[][] => {
  const stream = createStream(SAMPLE_SEED);
  const facePools = puzzle.deck.map((defId) => {
    const def = DIE_BY_ID.get(defId);
    return resolveFaces(defId, def?.tier ?? 6);
  });
  const rolls: number[][] = [];
  for (let i = 0; i < count; i += 1) {
    rolls.push(facePools.map((faces) => stream.pick(faces)));
  }
  return rolls;
};

const representativeRolls = (puzzle: PuzzleDef): number[][] => {
  if (puzzle.fixedRoll !== undefined) return [[...puzzle.fixedRoll]];
  return [
    floorFaces(puzzle),
    midFaces(puzzle),
    ceilFaces(puzzle),
    ...sampleRolls(puzzle, SAMPLE_ROLLS),
  ];
};

const ROLL_ENUM_CAP = 50000;

// The full roll space when it is small enough to enumerate — used to turn the
// exact-arm reachability check from an empirical sample into an actual proof.
const enumerateRolls = (puzzle: PuzzleDef): number[][] | null => {
  const pools = puzzle.deck.map((defId) =>
    resolveFaces(defId, DIE_BY_ID.get(defId)?.tier ?? 6),
  );
  const total = pools.reduce((n, faces) => n * faces.length, 1);
  if (total > ROLL_ENUM_CAP) return null;
  let rolls: number[][] = [[]];
  for (const faces of pools) {
    const next: number[][] = [];
    for (const roll of rolls) {
      for (const face of faces) next.push([...roll, face]);
    }
    rolls = next;
  }
  return rolls;
};

const bestMetricAt = (
  puzzle: PuzzleDef,
  values: readonly number[],
  metric: PuzzleMetric | "hull" = primaryMetric(puzzle.goal),
): number => {
  let best = -Infinity;
  for (const p of enumeratePlacements(puzzle)) {
    best = Math.max(best, scoreMetric(metric, scorePlacement(puzzle, values, p)));
  }
  return best;
};

const satisfiedByAnyPlacement = (
  puzzle: PuzzleDef,
  goal: SingleTurnGoal,
  values: readonly number[],
): boolean =>
  enumeratePlacements(puzzle).some((p) =>
    singleTurnSatisfied(puzzle, goal, values, p),
  );

// ---- multiTurn simulator ----

interface TurnOutcome {
  turnDamage: number;
  endShield: number;
  carryOut: CarryState;
}

const applyTurn = (
  puzzle: PuzzleDef,
  values: readonly number[],
  placement: Placement,
  carry: CarryState,
): TurnOutcome => {
  const score = scorePlacement(puzzle, values, placement, carry);
  // Burn ticks at the turn boundary (mirrors tickBurn): deals its full stack,
  // then decays by one. Its damage counts toward the cumulative total.
  const tickDamage = score.enemyBurn;
  const burnOut = Math.max(0, score.enemyBurn - 1);
  return {
    turnDamage: score.damage + tickDamage,
    endShield: score.shield,
    carryOut: { charge: score.charge, burn: burnOut, growth: score.growthOut },
  };
};

const bestCumulative = (
  puzzle: PuzzleDef,
  valuesPerTurn: number[][],
  metric: PuzzleMetric,
): number => {
  const turns = valuesPerTurn.length;
  const placements = enumeratePlacements(puzzle);

  const rec = (
    t: number,
    carry: CarryState,
    cumDamage: number,
  ): number => {
    const values = valuesPerTurn[t];
    if (values === undefined) {
      return metric === "damage"
        ? cumDamage
        : metric === "charge"
          ? carry.charge
          : 0;
    }
    let best = -Infinity;
    for (const p of placements) {
      const out = applyTurn(puzzle, values, p, carry);
      const isLast = t === turns - 1;
      let val: number;
      if (metric === "shield" && isLast) val = out.endShield;
      else val = rec(t + 1, out.carryOut, cumDamage + out.turnDamage);
      best = Math.max(best, val);
    }
    return best;
  };

  return rec(0, emptyCarry(puzzle.deck.length), 0);
};

export interface MultiTurnState {
  carry: CarryState;
  cumDamage: number;
  lastShield: number;
}

export const initialMultiTurnState = (puzzle: PuzzleDef): MultiTurnState => ({
  carry: emptyCarry(puzzle.deck.length),
  cumDamage: 0,
  lastShield: 0,
});

export const advanceMultiTurn = (
  puzzle: PuzzleDef,
  state: MultiTurnState,
  values: readonly number[],
  placement: Placement,
): MultiTurnState => {
  const out = applyTurn(puzzle, values, placement, state.carry);
  return {
    carry: out.carryOut,
    cumDamage: state.cumDamage + out.turnDamage,
    lastShield: out.endShield,
  };
};

export const multiTurnMetric = (
  puzzle: PuzzleDef,
  state: MultiTurnState,
): number => {
  if (puzzle.goal.g !== "multiTurn") return 0;
  const metric = puzzle.goal.final.metric;
  return metric === "damage"
    ? state.cumDamage
    : metric === "charge"
      ? state.carry.charge
      : state.lastShield;
};

export const multiTurnSatisfied = (
  puzzle: PuzzleDef,
  state: MultiTurnState,
): boolean =>
  puzzle.goal.g === "multiTurn" &&
  multiTurnMetric(puzzle, state) >= puzzle.goal.final.min;

// ---- validator ----

export const solutionCount = (puzzle: PuzzleDef): number => {
  const goal = puzzle.goal;
  if (goal.g === "multiTurn") {
    // Count placements of the ceiling first turn that keep a winning line open.
    return bestCumulative(
      puzzle,
      Array.from({ length: goal.turns }, () => ceilFaces(puzzle)),
      goal.final.metric,
    ) >= goal.final.min
      ? 1
      : 0;
  }
  const target = goal.g === "deduction" ? goal.inner : goal;
  const rolls =
    puzzle.fixedRoll !== undefined
      ? [[...puzzle.fixedRoll]]
      : representativeRolls(puzzle);
  let count = 0;
  for (const values of rolls) {
    for (const p of enumeratePlacements(puzzle)) {
      if (singleTurnSatisfied(puzzle, target, values, p)) count += 1;
    }
  }
  return count;
};

export const totalPlacements = (puzzle: PuzzleDef): number =>
  enumeratePlacements(puzzle).length;

export const exactReachable = (puzzle: PuzzleDef): boolean => {
  const goal = innerGoal(puzzle.goal);
  if (goal?.g !== "exact") return true;
  // Prove it: enumerate the whole roll space when small, else fall back to
  // the representative sample.
  const rolls = enumerateRolls(puzzle) ?? representativeRolls(puzzle);
  const placements = enumeratePlacements(puzzle);
  return rolls.some((values) =>
    placements.some((p) => singleTurnSatisfied(puzzle, goal, values, p)),
  );
};

// The trial can be won: some (roll, placement) within budget meets the goal.
export const isAchievable = (puzzle: PuzzleDef): boolean => {
  const goal = puzzle.goal;
  if (goal.g === "multiTurn") {
    return (
      bestCumulative(
        puzzle,
        Array.from({ length: goal.turns }, () => ceilFaces(puzzle)),
        goal.final.metric,
      ) >= goal.final.min
    );
  }
  if (goal.g === "deduction") {
    return solutionCount(puzzle) >= 1;
  }
  if (goal.g === "exact") {
    const ceil = bestMetricAt(puzzle, ceilFaces(puzzle), goal.metric);
    return exactReachable(puzzle) && goal.value <= ceil;
  }
  // Monotone arms: a ceiling roll (plus samples for safety) can satisfy.
  return representativeRolls(puzzle).some((values) =>
    satisfiedByAnyPlacement(puzzle, goal, values),
  );
};

const exactReachableAt = (
  puzzle: PuzzleDef,
  values: readonly number[],
  goal: Extract<SingleTurnGoal, { g: "exact" }>,
): boolean =>
  enumeratePlacements(puzzle).some((p) =>
    singleTurnSatisfied(puzzle, goal, values, p),
  );

// The trial is never a free win: the floor roll (or a wrong placement, for
// deduction) fails to meet the goal.
export const isTrivial = (puzzle: PuzzleDef): boolean => {
  const goal = puzzle.goal;
  if (goal.g === "multiTurn") {
    return (
      bestCumulative(
        puzzle,
        Array.from({ length: goal.turns }, () => floorFaces(puzzle)),
        goal.final.metric,
      ) >= goal.final.min
    );
  }
  if (goal.g === "deduction") {
    return solutionCount(puzzle) >= totalPlacements(puzzle);
  }
  if (goal.g === "exact") {
    // Free if even the floor roll can already land the exact value.
    return floorFaces(puzzle).length > 0 && exactReachableAt(puzzle, floorFaces(puzzle), goal);
  }
  return satisfiedByAnyPlacement(puzzle, goal, floorFaces(puzzle));
};

export interface DifficultyReport {
  arch: PuzzleGoal["g"];
  floor: number;
  mid: number;
  ceil: number;
  target: number;
  solutions: number;
  exactReachable: boolean;
}

const goalTarget = (goal: PuzzleGoal): number => {
  switch (goal.g) {
    case "damage":
    case "charge":
    case "shield":
      return goal.min;
    case "survive":
    case "survivePlus":
      return 1;
    case "exact":
      return goal.value;
    case "constraint":
      return goal.base.min;
    case "order":
      return Math.max(
        0,
        ...goal.steps.map((s) => ("min" in s ? s.min : 0)),
      );
    case "multiTurn":
      return goal.final.min;
    case "deduction":
      return goalTarget(goal.inner);
  }
};

export const difficultyReport = (puzzle: PuzzleDef): DifficultyReport => {
  const goal = puzzle.goal;
  const metric = primaryMetric(goal);
  if (goal.g === "multiTurn") {
    return {
      arch: goal.g,
      floor: bestCumulative(
        puzzle,
        Array.from({ length: goal.turns }, () => floorFaces(puzzle)),
        goal.final.metric,
      ),
      mid: bestCumulative(
        puzzle,
        Array.from({ length: goal.turns }, () => midFaces(puzzle)),
        goal.final.metric,
      ),
      ceil: bestCumulative(
        puzzle,
        Array.from({ length: goal.turns }, () => ceilFaces(puzzle)),
        goal.final.metric,
      ),
      target: goal.final.min,
      solutions: solutionCount(puzzle),
      exactReachable: true,
    };
  }
  const rollFor = (pick: "floor" | "mid" | "ceil"): number[] =>
    puzzle.fixedRoll !== undefined
      ? [...puzzle.fixedRoll]
      : pick === "floor"
        ? floorFaces(puzzle)
        : pick === "mid"
          ? midFaces(puzzle)
          : ceilFaces(puzzle);
  return {
    arch: goal.g,
    floor: bestMetricAt(puzzle, rollFor("floor"), metric),
    mid: bestMetricAt(puzzle, rollFor("mid"), metric),
    ceil: bestMetricAt(puzzle, rollFor("ceil"), metric),
    target: goalTarget(goal),
    solutions: solutionCount(puzzle),
    exactReachable: exactReachable(puzzle),
  };
};
