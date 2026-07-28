import type { PuzzleDef, PuzzleReward } from "@/data/puzzles";

const reward = (): PuzzleReward => ({ scrap: 25, codex: "riddleWard" });

// Thirteen late-game trials (DESIGN §3 target of 25 total). They lean on the
// systems Phase 10 added — Spinal drills, reactor batteries, engraving-bench
// parity — plus two boss-mechanic rehearsals: «зеркало» is the Mirror Hull's
// arithmetic and «хор» is surviving a Choir charge turn.
export const PHASE10_PUZZLES: readonly PuzzleDef[] = [
  // --- exact (3) ---
  {
    id: "tally",
    title: "content:puzzle.tally.title",
    goalText: "content:puzzle.tally.goal",
    deck: ["token", "glint", "grey-d4"],
    slots: ["weaponA", "weaponB"],
    rerolls: 3,
    locks: 1,
    goal: { g: "exact", metric: "damage", value: 9 },
    reward: reward(),
  },
  {
    id: "battery",
    title: "content:puzzle.battery.title",
    goalText: "content:puzzle.battery.goal",
    deck: ["pitch", "grey-d4"],
    slots: ["reactor"],
    chargeCap: 14,
    rerolls: 3,
    locks: 1,
    goal: { g: "exact", metric: "charge", value: 9 },
    reward: reward(),
  },
  {
    id: "seawall",
    title: "content:puzzle.seawall.title",
    goalText: "content:puzzle.seawall.goal",
    deck: ["hoarfrost", "blue-d6", "grey-d4"],
    slots: ["shields"],
    rerolls: 3,
    locks: 1,
    goal: { g: "exact", metric: "shield", value: 7 },
    reward: reward(),
  },

  // --- constraint (3) ---
  {
    id: "mirrorMath",
    title: "content:puzzle.mirrorMath.title",
    goalText: "content:puzzle.mirrorMath.goal",
    deck: ["slug", "ember", "grey-d4"],
    slots: ["weaponA", "weaponB"],
    rerolls: 2,
    locks: 1,
    goal: {
      g: "constraint",
      base: { metric: "damage", min: 15 },
      rules: [{ r: "maxSlotsUsed", n: 2 }],
    },
    reward: reward(),
  },
  {
    id: "engraverBench",
    title: "content:puzzle.engraverBench.title",
    goalText: "content:puzzle.engraverBench.goal",
    deck: ["hoarfrost", "bulwark", "grey-d4"],
    slots: ["shields", "engines"],
    rerolls: 2,
    locks: 1,
    goal: {
      g: "constraint",
      base: { metric: "shield", min: 9 },
      rules: [{ r: "minSlotsUsed", n: 2 }],
    },
    reward: reward(),
  },
  {
    id: "blackVault",
    title: "content:puzzle.blackVault.title",
    goalText: "content:puzzle.blackVault.goal",
    deck: ["black-d6", "ashen", "grey-d4"],
    slots: ["reactor", "weaponA"],
    chargeCap: 12,
    rerolls: 2,
    locks: 1,
    goal: {
      g: "constraint",
      base: { metric: "charge", min: 8 },
      rules: [{ r: "affixUsed", affix: "affinity" }],
    },
    reward: reward(),
  },

  // --- order (2) ---
  {
    id: "spinalDrill",
    title: "content:puzzle.spinalDrill.title",
    goalText: "content:puzzle.spinalDrill.goal",
    deck: ["grey-d4", "slug", "red-d6"],
    slots: ["sensors", "spinal", "weaponA"],
    rerolls: 2,
    locks: 1,
    goal: {
      g: "order",
      steps: [{ s: "mark" }, { s: "spinalJam" }, { s: "damage", min: 9 }],
    },
    reward: reward(),
  },
  {
    id: "coolChain",
    title: "content:puzzle.coolChain.title",
    goalText: "content:puzzle.coolChain.goal",
    deck: ["grey-d4", "blue-d6", "black-d6"],
    slots: ["shields", "reactor", "engines"],
    chargeCap: 9,
    rerolls: 2,
    locks: 1,
    goal: {
      g: "order",
      steps: [
        { s: "shield", min: 5 },
        { s: "charge", min: 5 },
        { s: "noOverflow" },
      ],
    },
    reward: reward(),
  },

  // --- multiTurn (2) ---
  {
    id: "emberStack",
    title: "content:puzzle.emberStack.title",
    goalText: "content:puzzle.emberStack.goal",
    deck: ["cinder", "red-d6", "ember"],
    slots: ["weaponA", "weaponB"],
    rerolls: 2,
    locks: 1,
    goal: { g: "multiTurn", turns: 2, final: { metric: "damage", min: 24 } },
    reward: reward(),
  },
  {
    id: "shieldWall",
    title: "content:puzzle.shieldWall.title",
    goalText: "content:puzzle.shieldWall.goal",
    deck: ["bulwark", "blue-d6", "frostplate"],
    slots: ["shields"],
    rerolls: 2,
    locks: 1,
    goal: { g: "multiTurn", turns: 2, final: { metric: "shield", min: 11 } },
    reward: reward(),
  },

  // --- deduction (2) ---
  {
    id: "fateBench",
    title: "content:puzzle.fateBench.title",
    goalText: "content:puzzle.fateBench.goal",
    deck: ["ember", "blue-d6", "black-d6", "grey-d4"],
    slots: ["weaponA", "shields", "reactor"],
    fixedRoll: [5, 3, 6, 2],
    rerolls: 0,
    locks: 0,
    goal: {
      g: "deduction",
      inner: {
        g: "order",
        steps: [
          { s: "damage", min: 7 },
          { s: "shield", min: 5 },
          { s: "charge", min: 7 },
        ],
      },
    },
    reward: reward(),
  },
  {
    id: "sortingYard",
    title: "content:puzzle.sortingYard.title",
    goalText: "content:puzzle.sortingYard.goal",
    deck: ["ember", "blue-d6", "grey-d4"],
    slots: ["weaponA", "shields"],
    fixedRoll: [6, 3, 4],
    rerolls: 0,
    locks: 0,
    goal: {
      g: "deduction",
      inner: {
        g: "constraint",
        base: { metric: "damage", min: 8 },
        rules: [{ r: "slotParity", slot: "weaponA", parity: "even" }],
      },
    },
    reward: reward(),
  },

  // --- survivePlus (1) ---
  {
    id: "choirStand",
    title: "content:puzzle.choirStand.title",
    goalText: "content:puzzle.choirStand.goal",
    deck: ["bulwark", "green-d4", "grey-d4"],
    slots: ["shields", "engines"],
    hull: 8,
    incoming: { t: "multi", n: 6, k: 3 },
    rerolls: 2,
    locks: 1,
    goal: { g: "survivePlus", clause: { metric: "shield", min: 8 } },
    reward: reward(),
  },
];
