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

export type PuzzleTier = 1 | 2 | 3 | 4 | 5;

export const PUZZLE_TIERS: readonly PuzzleTier[] = [1, 2, 3, 4, 5];

export interface PuzzleDef {
  id: string;
  title: LocKey;
  goalText: LocKey;
  tier: PuzzleTier;
  deck: readonly string[];
  slots: readonly SlotId[];
  blocked?: readonly SlotId[];
  mk?: Partial<Record<SlotId, MkLevel>>;
  rerolls: number;
  rerollSize?: number;
  locks?: number;
  hull?: number;
  incoming?: Intent;
  chargeCap?: number;
  fixedRoll?: readonly number[];
  goal: PuzzleGoal;
  uniqueDie?: string;
}

const puzzle = (
  id: string,
  body: Omit<PuzzleDef, "id" | "title" | "goalText">,
): PuzzleDef => ({
  id,
  title: `content:puzzle.${id}.title`,
  goalText: `content:puzzle.${id}.goal`,
  ...body,
});

const EXACT_PUZZLES: readonly PuzzleDef[] = [
  puzzle("emberCut", {
    tier: 1,
    deck: ["ember", "grey-d4"],
    slots: ["weaponA", "weaponB"],
    rerolls: 3,
    goal: { g: "exact", metric: "damage", value: 8, tolerance: 2 },
  }),
  puzzle("driftSpark", {
    tier: 1,
    deck: ["black-d6", "grey-d4"],
    slots: ["reactor"],
    chargeCap: 12,
    rerolls: 3,
    goal: { g: "exact", metric: "charge", value: 5, tolerance: 2 },
  }),
  puzzle("seawall", {
    tier: 2,
    deck: ["hoarfrost", "blue-d6", "grey-d4"],
    slots: ["shields"],
    rerolls: 3,
    goal: { g: "exact", metric: "shield", value: 6 },
  }),
  puzzle("plateFit", {
    tier: 2,
    deck: ["frostplate", "hoarfrost", "grey-d4"],
    slots: ["shields", "engines"],
    rerolls: 2,
    goal: { g: "exact", metric: "shield", value: 6 },
  }),
  puzzle("hairline", {
    tier: 2,
    deck: ["cinder", "red-d6", "grey-d4"],
    slots: ["weaponA"],
    rerolls: 2,
    goal: { g: "exact", metric: "damage", value: 6 },
  }),
  puzzle("oreVein", {
    tier: 3,
    deck: ["slug", "ember", "grey-d4"],
    slots: ["weaponA", "weaponB"],
    rerolls: 3,
    goal: { g: "exact", metric: "damage", value: 14 },
  }),
  puzzle("battery", {
    tier: 3,
    deck: ["pitch", "ashen", "grey-d4"],
    slots: ["reactor"],
    chargeCap: 14,
    rerolls: 3,
    goal: { g: "exact", metric: "charge", value: 7 },
  }),
  puzzle("tithe", {
    tier: 3,
    deck: ["ashen", "black-d6", "grey-d4"],
    slots: ["reactor", "weaponA"],
    chargeCap: 10,
    rerolls: 1,
    goal: { g: "exact", metric: "charge", value: 7 },
  }),
  puzzle("coolant", {
    tier: 4,
    deck: ["coreshard", "grey-d4"],
    slots: ["reactor"],
    rerolls: 3,
    goal: { g: "exact", metric: "charge", value: 10 },
  }),
  puzzle("tally", {
    tier: 4,
    deck: ["token", "glint", "grey-d4"],
    slots: ["weaponA", "weaponB"],
    rerolls: 3,
    goal: { g: "exact", metric: "damage", value: 9 },
  }),
];

const CONSTRAINT_PUZZLES: readonly PuzzleDef[] = [
  puzzle("mirrorMath", {
    tier: 1,
    deck: ["slug", "ember", "grey-d4"],
    slots: ["weaponA", "weaponB"],
    rerolls: 2,
    goal: {
      g: "constraint",
      base: { metric: "damage", min: 12 },
      rules: [
        { r: "maxSlotsUsed", n: 2 },
      ],
    },
  }),
  puzzle("deadWeight", {
    tier: 1,
    deck: ["ember", "ballast", "grey-d4"],
    slots: ["weaponA", "weaponB", "engines"],
    rerolls: 3,
    goal: {
      g: "constraint",
      base: { metric: "damage", min: 6 },
      rules: [
        { r: "everyDiePlaced" },
      ],
    },
  }),
  puzzle("blueLane", {
    tier: 1,
    deck: ["blue-d6", "grey-d4"],
    slots: ["shields", "engines"],
    rerolls: 3,
    goal: {
      g: "constraint",
      base: { metric: "shield", min: 4 },
      rules: [
        { r: "schoolInSlot", school: "blue", slot: "shields" },
      ],
    },
  }),
  puzzle("cleanFit", {
    tier: 2,
    deck: ["black-d6", "ember", "grey-d4"],
    slots: ["reactor", "weaponA", "weaponB"],
    chargeCap: 8,
    rerolls: 3,
    goal: {
      g: "constraint",
      base: { metric: "charge", min: 6 },
      rules: [
        { r: "everyDiePlaced" },
        { r: "noWaste", maxOverCap: 0 },
      ],
    },
  }),
  puzzle("engraverBench", {
    tier: 2,
    deck: ["hoarfrost", "bulwark", "grey-d4"],
    slots: ["shields", "engines"],
    rerolls: 2,
    goal: {
      g: "constraint",
      base: { metric: "shield", min: 8 },
      rules: [
        { r: "minSlotsUsed", n: 2 },
      ],
    },
  }),
  puzzle("blackVault", {
    tier: 2,
    deck: ["black-d6", "ashen", "grey-d4"],
    slots: ["reactor", "weaponA"],
    chargeCap: 12,
    rerolls: 2,
    goal: {
      g: "constraint",
      base: { metric: "charge", min: 8 },
      rules: [
        { r: "affixUsed", affix: "affinity" },
      ],
    },
  }),
  puzzle("spread", {
    tier: 2,
    deck: ["ember", "red-d6", "grey-d4"],
    slots: ["weaponA", "weaponB", "spinal"],
    rerolls: 2,
    goal: {
      g: "constraint",
      base: { metric: "damage", min: 16 },
      rules: [
        { r: "minSlotsUsed", n: 3 },
      ],
    },
  }),
  puzzle("redRoute", {
    tier: 3,
    deck: ["slug", "ember", "blue-d6", "grey-d4"],
    slots: ["weaponA", "weaponB"],
    rerolls: 2,
    goal: {
      g: "constraint",
      base: { metric: "damage", min: 17 },
      rules: [
        { r: "schoolInSlot", school: "red", slot: "weaponA" },
        { r: "affixUsed", affix: "affinity" },
      ],
    },
  }),
  puzzle("ignite", {
    tier: 3,
    deck: ["cinder", "ember", "red-d6"],
    slots: ["weaponA", "weaponB"],
    rerolls: 3,
    goal: {
      g: "constraint",
      base: { metric: "damage", min: 10 },
      rules: [
        { r: "affixUsed", affix: "burn" },
      ],
    },
  }),
  puzzle("greenhouse", {
    tier: 3,
    deck: ["sprout", "bramble", "ember"],
    slots: ["weaponA", "weaponB", "engines"],
    rerolls: 2,
    goal: {
      g: "constraint",
      base: { metric: "damage", min: 8 },
      rules: [
        { r: "affixUsed", affix: "growth" },
      ],
    },
  }),
  puzzle("overcut", {
    tier: 3,
    deck: ["black-d6", "nadir", "grey-d4"],
    slots: ["reactor", "engines"],
    chargeCap: 12,
    rerolls: 2,
    goal: {
      g: "constraint",
      base: { metric: "charge", min: 8 },
      rules: [
        { r: "affixUsed", affix: "exceedCap" },
      ],
    },
  }),
  puzzle("tightPack", {
    tier: 3,
    deck: ["pitch", "ballast", "grey-d4"],
    slots: ["reactor", "engines"],
    chargeCap: 9,
    rerolls: 2,
    goal: {
      g: "constraint",
      base: { metric: "charge", min: 7 },
      rules: [
        { r: "noWaste", maxOverCap: 0 },
        { r: "minSlotsUsed", n: 2 },
      ],
    },
  }),
  puzzle("oddPlate", {
    tier: 4,
    deck: ["frostplate", "hoarfrost", "grey-d4"],
    slots: ["shields", "engines"],
    rerolls: 1,
    goal: {
      g: "constraint",
      base: { metric: "shield", min: 7 },
      rules: [
        { r: "slotParity", slot: "shields", parity: "odd" },
        { r: "slotParity", slot: "engines", parity: "even" },
      ],
    },
  }),
  puzzle("redOnly", {
    tier: 4,
    deck: ["cinder", "ember", "blue-d6"],
    slots: ["weaponA", "weaponB"],
    rerolls: 1,
    goal: {
      g: "constraint",
      base: { metric: "damage", min: 14 },
      rules: [
        { r: "schoolInSlot", school: "red", slot: "weaponA" },
        { r: "affixUsed", affix: "burn" },
      ],
    },
  }),
  puzzle("perfectSeal", {
    tier: 5,
    uniqueDie: "spectra",
    deck: ["ember", "blue-d6", "black-d6"],
    slots: ["weaponA", "shields", "reactor"],
    chargeCap: 12,
    rerolls: 2,
    goal: {
      g: "constraint",
      base: { metric: "damage", min: 6 },
      rules: [
        { r: "everyDiePlaced" },
        { r: "slotParity", slot: "weaponA", parity: "odd" },
        { r: "slotParity", slot: "shields", parity: "even" },
        { r: "slotParity", slot: "reactor", parity: "even" },
      ],
    },
  }),
];

const ORDER_PUZZLES: readonly PuzzleDef[] = [
  puzzle("pipeline", {
    tier: 1,
    deck: ["grey-d4", "ember", "black-d6"],
    slots: ["sensors", "weaponA", "reactor"],
    chargeCap: 8,
    rerolls: 2,
    goal: {
      g: "order",
      steps: [
        { s: "mark" },
        { s: "damage", min: 7 },
        { s: "noOverflow" },
      ],
    },
  }),
  puzzle("overload", {
    tier: 2,
    deck: ["grey-d4", "ember", "red-d6"],
    slots: ["spinal", "weaponA", "weaponB"],
    rerolls: 2,
    goal: {
      g: "order",
      steps: [
        { s: "spinalJam" },
        { s: "damage", min: 14 },
      ],
    },
  }),
  puzzle("spinalDrill", {
    tier: 2,
    deck: ["grey-d4", "slug", "red-d6"],
    slots: ["sensors", "spinal", "weaponA"],
    rerolls: 1,
    goal: {
      g: "order",
      steps: [
        { s: "mark" },
        { s: "spinalJam" },
        { s: "damage", min: 11 },
      ],
    },
  }),
  puzzle("firstLight", {
    tier: 2,
    deck: ["grey-d4", "ember", "red-d6"],
    slots: ["sensors", "weaponA", "weaponB"],
    rerolls: 2,
    goal: {
      g: "order",
      steps: [
        { s: "mark" },
        { s: "damage", min: 18 },
      ],
    },
  }),
  puzzle("coolChain", {
    tier: 3,
    deck: ["grey-d4", "blue-d6", "black-d6"],
    slots: ["shields", "reactor", "engines"],
    chargeCap: 9,
    rerolls: 2,
    goal: {
      g: "order",
      steps: [
        { s: "shield", min: 5 },
        { s: "charge", min: 6 },
        { s: "noOverflow" },
      ],
    },
  }),
  puzzle("coldStart", {
    tier: 3,
    deck: ["blue-d6", "black-d6", "grey-d4"],
    slots: ["shields", "reactor"],
    chargeCap: 10,
    rerolls: 2,
    goal: {
      g: "order",
      steps: [
        { s: "shield", min: 6 },
        { s: "charge", min: 5 },
      ],
    },
  }),
  puzzle("braceGate", {
    tier: 3,
    deck: ["grey-d4", "bulwark", "black-d6"],
    slots: ["sensors", "shields", "reactor"],
    chargeCap: 8,
    rerolls: 2,
    goal: {
      g: "order",
      steps: [
        { s: "mark" },
        { s: "shield", min: 10 },
        { s: "noOverflow" },
      ],
    },
  }),
  puzzle("siegeLine", {
    tier: 3,
    deck: ["grey-d4", "ember", "black-d6"],
    slots: ["spinal", "weaponA", "reactor"],
    chargeCap: 8,
    rerolls: 2,
    goal: {
      g: "order",
      steps: [
        { s: "spinalJam" },
        { s: "damage", min: 7 },
        { s: "noOverflow" },
      ],
    },
  }),
  puzzle("markedBurn", {
    tier: 4,
    deck: ["grey-d4", "cinder", "red-d6"],
    slots: ["sensors", "spinal", "weaponA"],
    rerolls: 1,
    goal: {
      g: "order",
      steps: [
        { s: "mark" },
        { s: "spinalJam" },
        { s: "damage", min: 11 },
      ],
    },
  }),
  puzzle("dryDock", {
    tier: 4,
    deck: ["hoarfrost", "pitch", "grey-d4"],
    slots: ["shields", "reactor", "engines"],
    chargeCap: 8,
    rerolls: 1,
    goal: {
      g: "order",
      steps: [
        { s: "shield", min: 6 },
        { s: "charge", min: 6 },
        { s: "noOverflow" },
      ],
    },
  }),
  puzzle("theWholeChain", {
    tier: 5,
    uniqueDie: "magma",
    deck: ["grey-d4", "ember", "black-d6"],
    slots: ["sensors", "weaponA", "reactor"],
    chargeCap: 8,
    rerolls: 2,
    goal: {
      g: "order",
      steps: [
        { s: "mark" },
        { s: "charge", min: 6 },
        { s: "noOverflow" },
        { s: "damage", min: 10 },
      ],
    },
  }),
];

const MULTI_TURN_PUZZLES: readonly PuzzleDef[] = [
  puzzle("slowBurn", {
    tier: 2,
    deck: ["cinder", "cinder", "slug"],
    slots: ["weaponA", "weaponB"],
    rerolls: 2,
    goal: {
      g: "multiTurn",
      turns: 2,
      final: { metric: "damage", min: 32 },
    },
  }),
  puzzle("capacitor", {
    tier: 2,
    deck: ["black-d6", "black-d6", "grey-d4"],
    slots: ["reactor"],
    chargeCap: 28,
    rerolls: 2,
    goal: {
      g: "multiTurn",
      turns: 3,
      final: { metric: "charge", min: 21 },
    },
  }),
  puzzle("emberStack", {
    tier: 3,
    deck: ["cinder", "red-d6", "ember"],
    slots: ["weaponA", "weaponB"],
    rerolls: 1,
    goal: {
      g: "multiTurn",
      turns: 2,
      final: { metric: "damage", min: 30 },
    },
  }),
  puzzle("shieldWall", {
    tier: 3,
    deck: ["bulwark", "blue-d6", "frostplate"],
    slots: ["shields"],
    rerolls: 2,
    goal: {
      g: "multiTurn",
      turns: 2,
      final: { metric: "shield", min: 11 },
    },
  }),
  puzzle("ironBank", {
    tier: 3,
    deck: ["pitch", "grey-d4"],
    slots: ["reactor"],
    chargeCap: 26,
    rerolls: 1,
    goal: {
      g: "multiTurn",
      turns: 3,
      final: { metric: "charge", min: 24 },
    },
  }),
  puzzle("twinFuse", {
    tier: 3,
    deck: ["cinder", "ember", "grey-d4"],
    slots: ["weaponA", "weaponB"],
    rerolls: 1,
    locks: 1,
    goal: {
      g: "multiTurn",
      turns: 2,
      final: { metric: "damage", min: 24 },
    },
  }),
  puzzle("longWall", {
    tier: 4,
    deck: ["deepblue", "frostplate", "blue-d6"],
    slots: ["shields"],
    mk: { shields: 3 },
    rerolls: 1,
    goal: {
      g: "multiTurn",
      turns: 3,
      final: { metric: "shield", min: 16 },
    },
  }),
  puzzle("slowFuse", {
    tier: 4,
    deck: ["cinder", "slug", "grey-d4"],
    slots: ["weaponA", "weaponB"],
    rerolls: 1,
    locks: 1,
    goal: {
      g: "multiTurn",
      turns: 3,
      final: { metric: "damage", min: 46 },
    },
  }),
  puzzle("reactorRun", {
    tier: 4,
    deck: ["nadir", "black-d6", "grey-d4"],
    slots: ["reactor"],
    chargeCap: 24,
    rerolls: 0,
    locks: 1,
    goal: {
      g: "multiTurn",
      turns: 2,
      final: { metric: "charge", min: 19 },
    },
  }),
  puzzle("theLongCount", {
    tier: 5,
    uniqueDie: "eclipse",
    deck: ["black-d6", "pitch", "grey-d4"],
    slots: ["reactor"],
    chargeCap: 34,
    rerolls: 2,
    locks: 1,
    goal: {
      g: "multiTurn",
      turns: 3,
      final: { metric: "charge", min: 28 },
    },
  }),
];

const DEDUCTION_PUZZLES: readonly PuzzleDef[] = [
  puzzle("sortingYard", {
    tier: 1,
    deck: ["ember", "blue-d6", "grey-d4"],
    slots: ["weaponA", "shields"],
    fixedRoll: [1, 6, 1],
    rerolls: 0,
    goal: {
      g: "deduction",
      inner: {
        g: "constraint",
        base: { metric: "damage", min: 5 },
        rules: [
          { r: "slotParity", slot: "weaponA", parity: "even" },
        ],
      },
    },
  }),
  puzzle("parity", {
    tier: 2,
    deck: ["ember", "blue-d6", "grey-d4"],
    slots: ["weaponA", "shields"],
    fixedRoll: [1, 5, 2],
    rerolls: 0,
    goal: {
      g: "deduction",
      inner: {
        g: "constraint",
        base: { metric: "damage", min: 4 },
        rules: [
          { r: "slotParity", slot: "weaponA", parity: "odd" },
          { r: "slotParity", slot: "shields", parity: "even" },
        ],
      },
    },
  }),
  puzzle("ledger", {
    tier: 2,
    deck: ["glint", "blue-d6", "grey-d4"],
    slots: ["weaponA", "shields", "engines"],
    fixedRoll: [2, 3, 4],
    rerolls: 0,
    goal: {
      g: "deduction",
      inner: {
        g: "constraint",
        base: { metric: "damage", min: 3 },
        rules: [
          { r: "everyDiePlaced" },
          { r: "slotParity", slot: "shields", parity: "even" },
        ],
      },
    },
  }),
  puzzle("crossWire", {
    tier: 3,
    deck: ["ember", "blue-d6", "black-d6"],
    slots: ["weaponA", "shields", "reactor"],
    chargeCap: 10,
    fixedRoll: [4, 5, 6],
    rerolls: 0,
    goal: {
      g: "deduction",
      inner: {
        g: "order",
        steps: [
          { s: "damage", min: 6 },
          { s: "shield", min: 7 },
          { s: "charge", min: 4 },
        ],
      },
    },
  }),
  puzzle("mirrorRead", {
    tier: 3,
    deck: ["cinder", "red-d6", "grey-d4"],
    slots: ["weaponA", "weaponB", "engines"],
    fixedRoll: [4, 1, 1],
    rerolls: 0,
    goal: {
      g: "deduction",
      inner: {
        g: "constraint",
        base: { metric: "damage", min: 9 },
        rules: [
          { r: "affixUsed", affix: "burn" },
          { r: "everyDiePlaced" },
        ],
      },
    },
  }),
  puzzle("fateBench", {
    tier: 4,
    deck: ["ember", "blue-d6", "black-d6"],
    slots: ["weaponA", "shields", "reactor"],
    fixedRoll: [5, 3, 3],
    rerolls: 0,
    goal: {
      g: "deduction",
      inner: {
        g: "order",
        steps: [
          { s: "damage", min: 7 },
          { s: "shield", min: 5 },
          { s: "charge", min: 4 },
        ],
      },
    },
  }),
  puzzle("theSeal", {
    tier: 4,
    deck: ["ember", "blue-d6", "black-d6"],
    slots: ["weaponA", "shields", "reactor"],
    chargeCap: 9,
    fixedRoll: [1, 2, 4],
    rerolls: 0,
    goal: {
      g: "deduction",
      inner: {
        g: "constraint",
        base: { metric: "damage", min: 4 },
        rules: [
          { r: "slotParity", slot: "shields", parity: "even" },
          { r: "noWaste", maxOverCap: 0 },
          { r: "everyDiePlaced" },
        ],
      },
    },
  }),
  puzzle("lockbox", {
    tier: 5,
    uniqueDie: "beaconChip",
    deck: ["ember", "blue-d6", "black-d6", "grey-d4"],
    slots: ["weaponA", "shields", "reactor"],
    fixedRoll: [1, 5, 6, 4],
    rerolls: 0,
    goal: {
      g: "deduction",
      inner: {
        g: "order",
        steps: [
          { s: "damage", min: 6 },
          { s: "shield", min: 7 },
          { s: "charge", min: 4 },
        ],
      },
    },
  }),
];

const SURVIVE_PLUS_PUZZLES: readonly PuzzleDef[] = [
  puzzle("bulwarkStand", {
    tier: 1,
    deck: ["bulwark", "green-d4", "grey-d4"],
    slots: ["shields", "repairBay"],
    hull: 7,
    incoming: { t: "multi", n: 5, k: 3 },
    rerolls: 2,
    goal: {
      g: "survivePlus",
      clause: { metric: "shield", min: 4 },
    },
  }),
  puzzle("choirStand", {
    tier: 2,
    deck: ["bulwark", "green-d4", "grey-d4"],
    slots: ["shields", "repairBay"],
    hull: 9,
    incoming: { t: "multi", n: 6, k: 3 },
    rerolls: 2,
    goal: {
      g: "survivePlus",
      clause: { metric: "shield", min: 8 },
    },
  }),
  puzzle("hullCheck", {
    tier: 3,
    deck: ["frostplate", "green-d4", "grey-d4"],
    slots: ["shields", "repairBay"],
    hull: 7,
    incoming: { t: "multi", n: 5, k: 3 },
    rerolls: 2,
    goal: {
      g: "survivePlus",
      clause: { metric: "shield", min: 7 },
    },
  }),
  puzzle("lastLight", {
    tier: 3,
    deck: ["bulwark", "black-d6", "grey-d4"],
    slots: ["shields", "reactor"],
    chargeCap: 10,
    hull: 10,
    incoming: { t: "multi", n: 5, k: 3 },
    rerolls: 1,
    goal: {
      g: "survivePlus",
      clause: { metric: "charge", min: 7 },
    },
  }),
  puzzle("stormFront", {
    tier: 4,
    deck: ["bulwark", "ember", "red-d6"],
    slots: ["shields", "weaponA", "weaponB"],
    hull: 16,
    incoming: { t: "multi", n: 5, k: 3 },
    rerolls: 1,
    goal: {
      g: "survivePlus",
      clause: { metric: "damage", min: 17 },
    },
  }),
  puzzle("theVigil", {
    tier: 5,
    uniqueDie: "aegis",
    deck: ["voidmaw", "bulwark", "green-d4"],
    slots: ["shields", "reactor", "repairBay"],
    mk: { reactor: 3 },
    chargeCap: 30,
    hull: 8,
    incoming: { t: "multi", n: 6, k: 3 },
    rerolls: 2,
    goal: {
      g: "survivePlus",
      clause: { metric: "charge", min: 29 },
    },
  }),
];

export const PUZZLES: readonly PuzzleDef[] = [
  ...EXACT_PUZZLES,
  ...CONSTRAINT_PUZZLES,
  ...ORDER_PUZZLES,
  ...MULTI_TURN_PUZZLES,
  ...DEDUCTION_PUZZLES,
  ...SURVIVE_PLUS_PUZZLES,
];

export const PUZZLE_BY_ID: ReadonlyMap<string, PuzzleDef> = new Map(
  PUZZLES.map((p) => [p.id, p]),
);
