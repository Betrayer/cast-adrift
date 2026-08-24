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

const EXACT_PUZZLES: readonly PuzzleDef[] = [
  {
    id: "emberCut",
    title: "content:puzzle.emberCut.title",
    goalText: "content:puzzle.emberCut.goal",
    tier: 1,
    deck: ["ember", "grey-d4"],
    slots: ["weaponA", "weaponB"],
    rerolls: 3,
    goal: { g: "exact", metric: "damage", value: 8, tolerance: 2 },
  },
  {
    id: "driftSpark",
    title: "content:puzzle.driftSpark.title",
    goalText: "content:puzzle.driftSpark.goal",
    tier: 1,
    deck: ["black-d6", "grey-d4"],
    slots: ["reactor"],
    chargeCap: 12,
    rerolls: 3,
    goal: { g: "exact", metric: "charge", value: 5, tolerance: 2 },
  },
  {
    id: "seawall",
    title: "content:puzzle.seawall.title",
    goalText: "content:puzzle.seawall.goal",
    tier: 2,
    deck: ["hoarfrost", "blue-d6", "grey-d4"],
    slots: ["shields"],
    rerolls: 3,
    goal: { g: "exact", metric: "shield", value: 6 },
  },
  {
    id: "plateFit",
    title: "content:puzzle.plateFit.title",
    goalText: "content:puzzle.plateFit.goal",
    tier: 2,
    deck: ["frostplate", "hoarfrost", "grey-d4"],
    slots: ["shields", "engines"],
    rerolls: 2,
    goal: { g: "exact", metric: "shield", value: 6 },
  },
  {
    id: "hairline",
    title: "content:puzzle.hairline.title",
    goalText: "content:puzzle.hairline.goal",
    tier: 2,
    deck: ["cinder", "red-d6", "grey-d4"],
    slots: ["weaponA"],
    rerolls: 2,
    goal: { g: "exact", metric: "damage", value: 6 },
  },
  {
    id: "oreVein",
    title: "content:puzzle.oreVein.title",
    goalText: "content:puzzle.oreVein.goal",
    tier: 3,
    deck: ["slug", "ember", "grey-d4"],
    slots: ["weaponA", "weaponB"],
    rerolls: 3,
    goal: { g: "exact", metric: "damage", value: 14 },
  },
  {
    id: "battery",
    title: "content:puzzle.battery.title",
    goalText: "content:puzzle.battery.goal",
    tier: 3,
    deck: ["pitch", "ashen", "grey-d4"],
    slots: ["reactor"],
    chargeCap: 14,
    rerolls: 3,
    goal: { g: "exact", metric: "charge", value: 7 },
  },
  {
    id: "tithe",
    title: "content:puzzle.tithe.title",
    goalText: "content:puzzle.tithe.goal",
    tier: 3,
    deck: ["ashen", "black-d6", "grey-d4"],
    slots: ["reactor", "weaponA"],
    chargeCap: 10,
    rerolls: 1,
    goal: { g: "exact", metric: "charge", value: 7 },
  },
  {
    id: "coolant",
    title: "content:puzzle.coolant.title",
    goalText: "content:puzzle.coolant.goal",
    tier: 4,
    deck: ["coreshard", "grey-d4"],
    slots: ["reactor"],
    rerolls: 3,
    goal: { g: "exact", metric: "charge", value: 10 },
  },
  {
    id: "tally",
    title: "content:puzzle.tally.title",
    goalText: "content:puzzle.tally.goal",
    tier: 4,
    deck: ["token", "glint", "grey-d4"],
    slots: ["weaponA", "weaponB"],
    rerolls: 3,
    goal: { g: "exact", metric: "damage", value: 9 },
  },
];

const CONSTRAINT_PUZZLES: readonly PuzzleDef[] = [
  {
    id: "mirrorMath",
    title: "content:puzzle.mirrorMath.title",
    goalText: "content:puzzle.mirrorMath.goal",
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
  },
  {
    id: "deadWeight",
    title: "content:puzzle.deadWeight.title",
    goalText: "content:puzzle.deadWeight.goal",
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
  },
  {
    id: "blueLane",
    title: "content:puzzle.blueLane.title",
    goalText: "content:puzzle.blueLane.goal",
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
  },
  {
    id: "cleanFit",
    title: "content:puzzle.cleanFit.title",
    goalText: "content:puzzle.cleanFit.goal",
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
  },
  {
    id: "engraverBench",
    title: "content:puzzle.engraverBench.title",
    goalText: "content:puzzle.engraverBench.goal",
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
  },
  {
    id: "blackVault",
    title: "content:puzzle.blackVault.title",
    goalText: "content:puzzle.blackVault.goal",
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
  },
  {
    id: "spread",
    title: "content:puzzle.spread.title",
    goalText: "content:puzzle.spread.goal",
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
  },
  {
    id: "redRoute",
    title: "content:puzzle.redRoute.title",
    goalText: "content:puzzle.redRoute.goal",
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
  },
  {
    id: "ignite",
    title: "content:puzzle.ignite.title",
    goalText: "content:puzzle.ignite.goal",
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
  },
  {
    id: "greenhouse",
    title: "content:puzzle.greenhouse.title",
    goalText: "content:puzzle.greenhouse.goal",
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
  },
  {
    id: "overcut",
    title: "content:puzzle.overcut.title",
    goalText: "content:puzzle.overcut.goal",
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
  },
  {
    id: "tightPack",
    title: "content:puzzle.tightPack.title",
    goalText: "content:puzzle.tightPack.goal",
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
  },
  {
    id: "oddPlate",
    title: "content:puzzle.oddPlate.title",
    goalText: "content:puzzle.oddPlate.goal",
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
  },
  {
    id: "redOnly",
    title: "content:puzzle.redOnly.title",
    goalText: "content:puzzle.redOnly.goal",
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
  },
  {
    id: "perfectSeal",
    title: "content:puzzle.perfectSeal.title",
    goalText: "content:puzzle.perfectSeal.goal",
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
  },
];

const ORDER_PUZZLES: readonly PuzzleDef[] = [
  {
    id: "pipeline",
    title: "content:puzzle.pipeline.title",
    goalText: "content:puzzle.pipeline.goal",
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
  },
  {
    id: "overload",
    title: "content:puzzle.overload.title",
    goalText: "content:puzzle.overload.goal",
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
  },
  {
    id: "spinalDrill",
    title: "content:puzzle.spinalDrill.title",
    goalText: "content:puzzle.spinalDrill.goal",
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
  },
  {
    id: "firstLight",
    title: "content:puzzle.firstLight.title",
    goalText: "content:puzzle.firstLight.goal",
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
  },
  {
    id: "coolChain",
    title: "content:puzzle.coolChain.title",
    goalText: "content:puzzle.coolChain.goal",
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
  },
  {
    id: "coldStart",
    title: "content:puzzle.coldStart.title",
    goalText: "content:puzzle.coldStart.goal",
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
  },
  {
    id: "braceGate",
    title: "content:puzzle.braceGate.title",
    goalText: "content:puzzle.braceGate.goal",
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
  },
  {
    id: "siegeLine",
    title: "content:puzzle.siegeLine.title",
    goalText: "content:puzzle.siegeLine.goal",
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
  },
  {
    id: "markedBurn",
    title: "content:puzzle.markedBurn.title",
    goalText: "content:puzzle.markedBurn.goal",
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
  },
  {
    id: "dryDock",
    title: "content:puzzle.dryDock.title",
    goalText: "content:puzzle.dryDock.goal",
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
  },
  {
    id: "theWholeChain",
    title: "content:puzzle.theWholeChain.title",
    goalText: "content:puzzle.theWholeChain.goal",
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
  },
];

const MULTI_TURN_PUZZLES: readonly PuzzleDef[] = [
  {
    id: "slowBurn",
    title: "content:puzzle.slowBurn.title",
    goalText: "content:puzzle.slowBurn.goal",
    tier: 2,
    deck: ["cinder", "cinder", "slug"],
    slots: ["weaponA", "weaponB"],
    rerolls: 2,
    goal: {
      g: "multiTurn",
      turns: 2,
      final: { metric: "damage", min: 32 },
    },
  },
  {
    id: "capacitor",
    title: "content:puzzle.capacitor.title",
    goalText: "content:puzzle.capacitor.goal",
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
  },
  {
    id: "emberStack",
    title: "content:puzzle.emberStack.title",
    goalText: "content:puzzle.emberStack.goal",
    tier: 3,
    deck: ["cinder", "red-d6", "ember"],
    slots: ["weaponA", "weaponB"],
    rerolls: 1,
    goal: {
      g: "multiTurn",
      turns: 2,
      final: { metric: "damage", min: 30 },
    },
  },
  {
    id: "shieldWall",
    title: "content:puzzle.shieldWall.title",
    goalText: "content:puzzle.shieldWall.goal",
    tier: 3,
    deck: ["bulwark", "blue-d6", "frostplate"],
    slots: ["shields"],
    rerolls: 2,
    goal: {
      g: "multiTurn",
      turns: 2,
      final: { metric: "shield", min: 11 },
    },
  },
  {
    id: "ironBank",
    title: "content:puzzle.ironBank.title",
    goalText: "content:puzzle.ironBank.goal",
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
  },
  {
    id: "twinFuse",
    title: "content:puzzle.twinFuse.title",
    goalText: "content:puzzle.twinFuse.goal",
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
  },
  {
    id: "longWall",
    title: "content:puzzle.longWall.title",
    goalText: "content:puzzle.longWall.goal",
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
  },
  {
    id: "slowFuse",
    title: "content:puzzle.slowFuse.title",
    goalText: "content:puzzle.slowFuse.goal",
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
  },
  {
    id: "reactorRun",
    title: "content:puzzle.reactorRun.title",
    goalText: "content:puzzle.reactorRun.goal",
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
  },
  {
    id: "theLongCount",
    title: "content:puzzle.theLongCount.title",
    goalText: "content:puzzle.theLongCount.goal",
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
  },
];

const DEDUCTION_PUZZLES: readonly PuzzleDef[] = [
  {
    id: "sortingYard",
    title: "content:puzzle.sortingYard.title",
    goalText: "content:puzzle.sortingYard.goal",
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
  },
  {
    id: "parity",
    title: "content:puzzle.parity.title",
    goalText: "content:puzzle.parity.goal",
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
  },
  {
    id: "ledger",
    title: "content:puzzle.ledger.title",
    goalText: "content:puzzle.ledger.goal",
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
  },
  {
    id: "crossWire",
    title: "content:puzzle.crossWire.title",
    goalText: "content:puzzle.crossWire.goal",
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
  },
  {
    id: "mirrorRead",
    title: "content:puzzle.mirrorRead.title",
    goalText: "content:puzzle.mirrorRead.goal",
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
  },
  {
    id: "fateBench",
    title: "content:puzzle.fateBench.title",
    goalText: "content:puzzle.fateBench.goal",
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
  },
  {
    id: "theSeal",
    title: "content:puzzle.theSeal.title",
    goalText: "content:puzzle.theSeal.goal",
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
  },
  {
    id: "lockbox",
    title: "content:puzzle.lockbox.title",
    goalText: "content:puzzle.lockbox.goal",
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
  },
];

const SURVIVE_PLUS_PUZZLES: readonly PuzzleDef[] = [
  {
    id: "bulwarkStand",
    title: "content:puzzle.bulwarkStand.title",
    goalText: "content:puzzle.bulwarkStand.goal",
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
  },
  {
    id: "choirStand",
    title: "content:puzzle.choirStand.title",
    goalText: "content:puzzle.choirStand.goal",
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
  },
  {
    id: "hullCheck",
    title: "content:puzzle.hullCheck.title",
    goalText: "content:puzzle.hullCheck.goal",
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
  },
  {
    id: "lastLight",
    title: "content:puzzle.lastLight.title",
    goalText: "content:puzzle.lastLight.goal",
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
  },
  {
    id: "stormFront",
    title: "content:puzzle.stormFront.title",
    goalText: "content:puzzle.stormFront.goal",
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
  },
  {
    id: "theVigil",
    title: "content:puzzle.theVigil.title",
    goalText: "content:puzzle.theVigil.goal",
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
  },
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
