import type { MkLevel } from "@/data/slots";
import type { SlotId } from "@/types/battle";
import type { Intent, LocKey, School } from "@/types/content";

export type PuzzleMetric = "damage" | "charge" | "shield";

export type ConstraintRule =
  | { r: "noWaste"; maxOverCap: number }
  | { r: "schoolInSlot"; school: School; slot: SlotId }
  | { r: "everyDiePlaced" }
  | { r: "slotParity"; slot: SlotId; parity: "even" | "odd" }
  | { r: "minSlotsUsed"; n: number }
  | { r: "maxSlotsUsed"; n: number }
  | { r: "affixUsed"; affix: "burn" | "growth" | "exceedCap" | "affinity" };

export type OrderStep =
  | { s: "mark" }
  | { s: "damage"; min: number }
  | { s: "shield"; min: number }
  | { s: "charge"; min: number }
  | { s: "noOverflow" }
  | { s: "spinalJam" };

// The scalar arms are reachable internals the new arms build on; authored
// content uses the six archetypes below.
export type SingleTurnGoal =
  | { g: "damage"; min: number }
  | { g: "charge"; min: number }
  | { g: "shield"; min: number }
  | { g: "survive" }
  | { g: "exact"; metric: PuzzleMetric; value: number; tolerance?: number }
  | {
      g: "constraint";
      base: { metric: PuzzleMetric; min: number };
      rules: readonly ConstraintRule[];
    }
  | { g: "order"; steps: readonly OrderStep[] }
  | { g: "survivePlus"; clause: { metric: PuzzleMetric; min: number } };

export type PuzzleGoal =
  | SingleTurnGoal
  | { g: "multiTurn"; turns: number; final: { metric: PuzzleMetric; min: number } }
  | { g: "deduction"; inner: SingleTurnGoal };

export interface PuzzleReward {
  scrap: number;
  die?: string;
  codex?: string;
}

export interface PuzzleDef {
  id: string;
  title: LocKey;
  goalText: LocKey;
  deck: readonly string[];
  slots: readonly SlotId[];
  blocked?: readonly SlotId[];
  mk?: Partial<Record<SlotId, MkLevel>>;
  rerolls: number;
  rerollSize?: number;
  locks: number;
  hull?: number;
  incoming?: Intent;
  chargeCap?: number;
  fixedRoll?: readonly number[];
  goal: PuzzleGoal;
  reward: PuzzleReward;
}

const reward = (): PuzzleReward => ({ scrap: 20, codex: "riddleWard" });

// Twelve anomaly puzzles, one per teaching idea, spread across the six
// archetypes: 2 exact, 3 constraint, 2 order, 2 multiTurn, 2 deduction,
// 1 survivePlus. Every entry is proven solvable-and-not-free by the validator
// in evaluate.test.ts + lint:content. Numbers are tuned against the real
// resolver (affinity, red-2 resonance, reactor x1.5, over-cap gating).
export const PUZZLES: readonly PuzzleDef[] = [
  // --- exact (2) ---
  {
    id: "oreVein",
    title: "content:puzzle.oreVein.title",
    goalText: "content:puzzle.oreVein.goal",
    deck: ["slug", "ember", "grey-d4"],
    slots: ["weaponA", "weaponB"],
    rerolls: 3,
    locks: 1,
    goal: { g: "exact", metric: "damage", value: 14 },
    reward: reward(),
  },
  {
    id: "coolant",
    title: "content:puzzle.coolant.title",
    goalText: "content:puzzle.coolant.goal",
    deck: ["coreshard", "grey-d4"],
    slots: ["reactor"],
    rerolls: 3,
    locks: 1,
    goal: { g: "exact", metric: "charge", value: 10 },
    reward: reward(),
  },

  // --- constraint (3) ---
  {
    id: "cleanFit",
    title: "content:puzzle.cleanFit.title",
    goalText: "content:puzzle.cleanFit.goal",
    deck: ["black-d6", "ember", "grey-d4"],
    slots: ["reactor", "weaponA", "weaponB"],
    chargeCap: 8,
    rerolls: 3,
    locks: 1,
    goal: {
      g: "constraint",
      base: { metric: "charge", min: 6 },
      rules: [{ r: "everyDiePlaced" }, { r: "noWaste", maxOverCap: 0 }],
    },
    reward: reward(),
  },
  {
    id: "redRoute",
    title: "content:puzzle.redRoute.title",
    goalText: "content:puzzle.redRoute.goal",
    deck: ["slug", "ember", "blue-d6", "grey-d4"],
    slots: ["weaponA", "weaponB"],
    rerolls: 2,
    locks: 1,
    goal: {
      g: "constraint",
      base: { metric: "damage", min: 18 },
      rules: [
        { r: "schoolInSlot", school: "red", slot: "weaponA" },
        { r: "affixUsed", affix: "affinity" },
      ],
    },
    reward: reward(),
  },
  {
    id: "ignite",
    title: "content:puzzle.ignite.title",
    goalText: "content:puzzle.ignite.goal",
    deck: ["cinder", "ember", "red-d6"],
    slots: ["weaponA", "weaponB"],
    rerolls: 3,
    locks: 1,
    goal: {
      g: "constraint",
      base: { metric: "damage", min: 12 },
      rules: [{ r: "affixUsed", affix: "burn" }],
    },
    reward: reward(),
  },

  // --- order (2) ---
  {
    id: "pipeline",
    title: "content:puzzle.pipeline.title",
    goalText: "content:puzzle.pipeline.goal",
    deck: ["grey-d4", "ember", "black-d6"],
    slots: ["sensors", "weaponA", "reactor"],
    chargeCap: 8,
    rerolls: 2,
    locks: 1,
    goal: {
      g: "order",
      steps: [{ s: "mark" }, { s: "damage", min: 8 }, { s: "noOverflow" }],
    },
    reward: reward(),
  },
  {
    id: "overload",
    title: "content:puzzle.overload.title",
    goalText: "content:puzzle.overload.goal",
    deck: ["grey-d4", "ember", "red-d6"],
    slots: ["spinal", "weaponA", "weaponB"],
    rerolls: 2,
    locks: 1,
    goal: {
      g: "order",
      steps: [{ s: "spinalJam" }, { s: "damage", min: 14 }],
    },
    reward: reward(),
  },

  // --- multiTurn (2) ---
  {
    id: "slowBurn",
    title: "content:puzzle.slowBurn.title",
    goalText: "content:puzzle.slowBurn.goal",
    deck: ["cinder", "cinder", "slug"],
    slots: ["weaponA", "weaponB"],
    rerolls: 2,
    locks: 1,
    goal: { g: "multiTurn", turns: 2, final: { metric: "damage", min: 26 } },
    reward: reward(),
  },
  {
    id: "capacitor",
    title: "content:puzzle.capacitor.title",
    goalText: "content:puzzle.capacitor.goal",
    deck: ["black-d6", "black-d6", "grey-d4"],
    slots: ["reactor"],
    chargeCap: 20,
    rerolls: 2,
    locks: 1,
    goal: { g: "multiTurn", turns: 3, final: { metric: "charge", min: 16 } },
    reward: reward(),
  },

  // --- deduction (2) ---
  {
    id: "lockbox",
    title: "content:puzzle.lockbox.title",
    goalText: "content:puzzle.lockbox.goal",
    deck: ["ember", "blue-d6", "black-d6", "grey-d4"],
    slots: ["weaponA", "shields", "reactor"],
    fixedRoll: [4, 5, 4, 2],
    rerolls: 0,
    locks: 0,
    goal: {
      g: "deduction",
      inner: {
        g: "order",
        steps: [
          { s: "damage", min: 6 },
          { s: "shield", min: 7 },
          { s: "charge", min: 6 },
        ],
      },
    },
    reward: reward(),
  },
  {
    id: "parity",
    title: "content:puzzle.parity.title",
    goalText: "content:puzzle.parity.goal",
    deck: ["ember", "blue-d6", "grey-d4"],
    slots: ["weaponA", "shields"],
    fixedRoll: [5, 4, 3],
    rerolls: 0,
    locks: 0,
    goal: {
      g: "deduction",
      inner: {
        g: "constraint",
        base: { metric: "damage", min: 6 },
        rules: [
          { r: "slotParity", slot: "weaponA", parity: "odd" },
          { r: "slotParity", slot: "shields", parity: "even" },
        ],
      },
    },
    reward: reward(),
  },

  // --- survivePlus (1) ---
  {
    id: "bulwarkStand",
    title: "content:puzzle.bulwarkStand.title",
    goalText: "content:puzzle.bulwarkStand.goal",
    deck: ["bulwark", "green-d4", "grey-d4"],
    slots: ["shields", "engines"],
    hull: 6,
    incoming: { t: "multi", n: 5, k: 3 },
    rerolls: 2,
    locks: 1,
    goal: { g: "survivePlus", clause: { metric: "shield", min: 6 } },
    reward: reward(),
  },
];

export const PUZZLE_BY_ID: ReadonlyMap<string, PuzzleDef> = new Map(
  PUZZLES.map((p) => [p.id, p]),
);
