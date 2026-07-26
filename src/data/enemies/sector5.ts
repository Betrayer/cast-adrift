import type { EnemyDef } from "@/types/content";

// Sector 5 — The Core. Stats baked at ×1.60 over the sector-1 baseline.
export const SECTOR5_ENEMIES: readonly EnemyDef[] = [
  {
    id: "coreFragment",
    name: "content:enemies.coreFragment",
    hp: 29,
    guarded: true,
    pattern: [
      { t: "attack", n: 7 },
      { t: "shield", n: 6 },
    ],
  },
  {
    id: "probabilityKnot",
    name: "content:enemies.probabilityKnot",
    hp: 32,
    pattern: [
      { t: "swapValues" },
      { t: "multi", n: 4, k: 3 },
    ],
  },
  {
    id: "nullDrone",
    name: "content:enemies.nullDrone",
    hp: 26,
    pattern: [
      { t: "attack", n: 3 },
      { t: "jamSlot" },
    ],
  },
];
