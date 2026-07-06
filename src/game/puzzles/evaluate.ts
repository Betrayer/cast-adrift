import { DIE_BY_ID } from "@/data/dice";
import type { PuzzleDef, PuzzleGoal } from "@/data/puzzles";
import { slotCapForMk } from "@/data/slots";
import { computeCensus, resonanceAtLeast } from "@/game/battle/resonance";
import { resolveEnemyPhase, resolvePlayerPhase } from "@/game/battle/resolver";
import { createStream } from "@/services/rng";
import type {
  BattleSnapshot,
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

const PUZZLE_HULL_DEFAULT = 30;

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

const dummyEnemy = (incoming: Intent | undefined): EnemyState => ({
  id: "dummy",
  defId: "scavDrone",
  hp: 9999,
  hpMax: 9999,
  shield: 0,
  intentIndex: 0,
  nextIntent: incoming ?? { t: "attack", n: 0 },
  statuses: {},
  subsystems: [],
});

const buildSnapshot = (
  puzzle: PuzzleDef,
  values: readonly number[],
  placement: Placement,
): BattleSnapshot => {
  const dice: RolledDie[] = puzzle.deck.map((defId, index) => {
    const def = DIE_BY_ID.get(defId);
    return {
      uid: `p${String(index)}`,
      defId,
      tier: def?.tier ?? 6,
      school: def?.school ?? "grey",
      value: values[index] ?? 1,
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
    charge: 0,
    scrap: 0,
    tide: 0,
    perks: [],
    dice,
    slots,
    enemies: [dummyEnemy(puzzle.incoming)],
    targetId: "dummy",
    engineState: null,
    nextTurnMods: {},
    nextRollBonus: 0,
    pendingDeepScan: false,
    chargeCap: 20,
    sacrificePool: 0,
    bloodReactorUsed: false,
    burnDoubleUsed: false,
    blockedSlots: [],
    lockedDice: [],
    resonance: computeCensus(dice),
    survivedLethal: false,
  };
};

export interface TrialScore {
  damage: number;
  charge: number;
  shield: number;
  overflow: boolean;
  hullAfter: number;
}

export const scorePlacement = (
  puzzle: PuzzleDef,
  values: readonly number[],
  placement: Placement,
): TrialScore => {
  const snapshot = buildSnapshot(puzzle, values, placement);
  const player = resolvePlayerPhase(snapshot);
  const damage = player.beats
    .filter((b) => b.kind === "damage")
    .reduce((sum, b) => sum + b.amount, 0);
  const overflow = player.beats.some(
    (b) => b.kind === "charge" && b.overflowHull !== undefined,
  );
  let hullAfter = player.next.hull;
  if (puzzle.goal.g === "survive") {
    const enemy = resolveEnemyPhase(player.next, createStream(1));
    hullAfter = enemy.next.hull;
  }
  return {
    damage,
    charge: player.next.charge,
    shield: player.next.shield,
    overflow,
    hullAfter,
  };
};

export const goalSatisfied = (goal: PuzzleGoal, score: TrialScore): boolean => {
  switch (goal.g) {
    case "damage":
      return score.damage >= goal.min;
    case "charge":
      return score.charge >= goal.min;
    case "shield":
      return score.shield >= goal.min;
    case "survive":
      return score.hullAfter > 0;
  }
};

export const goalMetric = (goal: PuzzleGoal, score: TrialScore): number => {
  switch (goal.g) {
    case "damage":
      return score.damage;
    case "charge":
      return score.charge;
    case "shield":
      return score.shield;
    case "survive":
      return score.hullAfter;
  }
};

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

const bestSatisfied = (puzzle: PuzzleDef, values: readonly number[]): boolean =>
  enumeratePlacements(puzzle).some((p) =>
    goalSatisfied(puzzle.goal, scorePlacement(puzzle, values, p)),
  );

export const bestMetricAt = (
  puzzle: PuzzleDef,
  values: readonly number[],
): number => {
  let best = -Infinity;
  for (const p of enumeratePlacements(puzzle)) {
    best = Math.max(best, goalMetric(puzzle.goal, scorePlacement(puzzle, values, p)));
  }
  return best;
};

// The ceiling roll (every die on its highest face) can meet the goal.
export const isAchievable = (puzzle: PuzzleDef): boolean =>
  bestSatisfied(puzzle, facesAt(puzzle, (_, hi) => hi));

// The floor roll (every die on its lowest face) cannot — you must roll and
// place well, so the trial is never a free win.
export const isTrivial = (puzzle: PuzzleDef): boolean =>
  bestSatisfied(puzzle, facesAt(puzzle, (lo) => lo));

export const difficultyReport = (
  puzzle: PuzzleDef,
): { floor: number; mid: number; ceil: number; target: number } => ({
  floor: bestMetricAt(puzzle, facesAt(puzzle, (lo) => lo)),
  mid: bestMetricAt(
    puzzle,
    facesAt(puzzle, (lo, hi) => Math.round((lo + hi) / 2)),
  ),
  ceil: bestMetricAt(puzzle, facesAt(puzzle, (_, hi) => hi)),
  target: puzzle.goal.g === "survive" ? 1 : puzzle.goal.min,
});
