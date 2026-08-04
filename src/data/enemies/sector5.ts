import type { EnemyDef } from "@/types/content";

export const SECTOR5_ENEMIES: readonly EnemyDef[] = [
  {
    id: "coreFragment",
    name: "content:enemies.coreFragment",
    hp: 18,
    role: "anchor",
    guarded: true,
    pattern: [
      { t: "attack", n: 7 },
      { t: "shield", n: 6 },
    ],
  },
  {
    id: "probabilityKnot",
    name: "content:enemies.probabilityKnot",
    hp: 20,
    role: "harrier",
    pattern: [
      {
        pick: [
          [{ t: "swapValues" }, 3],
          [{ t: "storm" }, 1],
        ],
      },
      { t: "multi", n: 4, k: 3 },
    ],
  },
  {
    id: "nullDrone",
    name: "content:enemies.nullDrone",
    hp: 16,
    role: "harrier",
    pattern: [
      { t: "attack", n: 3 },
      { t: "jamSlot" },
    ],
  },
];
